/*
 * @FileDescription: OneBot WebSocket 连接层
 * @Author: Mr.Lee
 * @Date: 2026/11/15
 * @Version: 1.0
 * @Description: 把原先公共传输层里的 WebSocket 能力下沉到 ob 适配器，
 *               只负责连接生命周期（URL 拼接、建连、收发、自动重连、状态）。
 *               不解析任何 OneBot 业务消息；不 import systemUtil / login，避免循环依赖。
 */

import { logger } from '@renderer/function/base'
import { emitConnectionLost } from '@renderer/function/utils/connectionEvent'

/** 连接层内部状态（仅用于传输层生命周期，不对外暴露） */
export type ConnectionState =
	| 'disconnected'
	| 'connecting'
	| 'connected'
	| 'error'

/** WebSocket 异常关闭信息 */
export interface ObWsCloseInfo {
	code: string | number
	message: string
}

export interface ObWsConnectionOptions {
	/** 自动重连次数，默认 5（与旧传输层一致） */
	retry?: number
	/** 单次建立连接的超时（ms），默认 15000；超时视为本次连接失败 */
	connectTimeout?: number
	/** 状态变化回调；由适配器订阅后对外暴露为 status */
	onStateChange?: (state: ConnectionState) => void
	/** 断线后开始自动重连（对应旧的 popInfo.info('连接不稳定')） */
	onReconnecting?: () => void
	/** 重连彻底失败（此时已经触发 emitConnectionLost） */
	onReconnectFailed?: (info: ObWsCloseInfo) => void
}

/**
 * OneBot WebSocket 连接
 *
 * 行为对齐旧传输层的 WS 生命周期：
 * - URL：`ws(s)://<host><path>?access_token=<encoded>`，host 保留自带路径并去掉尾部斜杠
 * - 初次连接只尝试 1 次；连接成功后的意外断线立即重试，最多 retry 次（默认 5，无退避）
 * - 断线重连成功会把状态恢复为 connected（修复旧实现只改 socket 状态、不改自身状态的问题）
 * - close() 幂等、不抛错，主动关闭不会触发重连
 */
export class ObWsConnection {
	private stateValue: ConnectionState = 'disconnected'
	private socket?: WebSocket
	private socketUrl = ''
	private headerMap: Record<string, string> = {}
	private retry: number
	private readonly connectTimeout: number
	private readonly options: ObWsConnectionOptions
	private onMessageHook?: (msg: string) => void
	private onErrorHook?: (info: ObWsCloseInfo) => void
	/** 主动关闭标记：为 true 时在途重连与迟到事件都不再生效 */
	private closing = false
	/** 连接代际（connect/close 时递增），用于丢弃旧 socket 的迟到事件 */
	private generation = 0
	/** 在途 connect 的 resolve（close/reconfigure 时提前结束） */
	private pendingFinish?: (result: boolean) => void

	constructor(options: ObWsConnectionOptions = {}) {
		this.options = options
		this.retry = options.retry ?? 5
		this.connectTimeout = options.connectTimeout ?? 15000
	}

	//#region == 配置 ==============================================
	/**
	 * 配置连接参数（对齐旧 reset 的参数）
	 * @param url 协议端地址（可带路径，如 host/base）
	 * @param ssl 是否使用 wss
	 * @param token 访问令牌，走 query access_token
	 * @param path WebSocket 路径（ob 为空）
	 * @param headers 预留握手头；浏览器 WebSocket 无法设置握手头，仅保存
	 * @param retry 自动重连次数
	 */
	configure(
		url: string,
		ssl: boolean,
		token?: string,
		path?: string,
		headers: Record<string, string> = {},
		retry: number = 5,
	): void {
		const protocol = ssl ? 'wss' : 'ws'
		const base = `${protocol}://${url.replace(/\/+$/, '')}`
		const suffix = path ? `/${path.replace(/^\/+/, '')}` : ''
		this.socketUrl = token
			? `${base}${suffix}?access_token=${encodeURIComponent(token)}`
			: `${base}${suffix}`
		this.headerMap = { ...headers }
		this.retry = retry
	}

	/** 当前配置的握手头副本（浏览器 WebSocket 不会发送，仅用于排查配置） */
	get headers(): Record<string, string> {
		return { ...this.headerMap }
	}
	//#endregion

	//#region == 开启关闭 ==========================================
	/**
	 * 建立连接
	 * @returns 是否连接成功；失败不抛错
	 */
	async connect(): Promise<boolean> {
		this.closing = false
		this.generation++
		this.pendingFinish?.(false)
		this.teardown()

		this.setState('connecting')
		const re = await this.openSocket()
		if (!re && !this.closing) this.setState('disconnected')
		return re
	}

	/**
	 * 关闭连接
	 * 幂等、不抛错；不清理 onMessage 钩子（ob 的 redirect 会复用同一连接对象）
	 */
	async close(): Promise<void> {
		this.closing = true
		this.generation++
		this.pendingFinish?.(false)
		const socket = this.socket
		this.socket = undefined
		if (socket) {
			try {
				socket.close(1000)
			} catch {
				// 忽略重复关闭
			}
		}
		this.setState('disconnected')
	}
	//#endregion

	//#region == 收发数据 ==========================================
	/**
	 * 发送数据（未连接时同步抛错）
	 */
	send(data: string): void {
		if (!this.isConnected())
			throw new Error('WebSocket未连接，无法发送数据')
		this.socket!.send(data)
	}

	/**
	 * 设置消息钩子（单槽，后注册覆盖前注册；connect 不会清空）
	 */
	onMessage(callback: (msg: string) => void): void {
		this.onMessageHook = callback
	}

	/**
	 * 设置重连失败时的错误钩子（单槽）
	 */
	onError(callback: (info: ObWsCloseInfo) => void): void {
		this.onErrorHook = callback
	}
	//#endregion

	//#region == 自身状态 ==========================================
	get state(): ConnectionState {
		return this.stateValue
	}

	/** 已连接：只认 connected（与发送门禁一致） */
	isConnected(): boolean {
		return this.stateValue === 'connected' && this.socket !== undefined
	}

	isConnecting(): boolean {
		return this.stateValue === 'connecting'
	}

	private setState(state: ConnectionState): void {
		this.stateValue = state
		this.options.onStateChange?.(state)
	}
	//#endregion

	//#region == 私有方法 ==========================================
	/** 静默关闭当前 socket（不发状态、不清钩子） */
	private teardown(): void {
		const socket = this.socket
		this.socket = undefined
		if (socket) {
			try {
				socket.close(1000)
			} catch {
				// 忽略重复关闭
			}
		}
	}

	/**
	 * 发起一次连接尝试
	 * @returns 是否在超时前打开成功
	 */
	private openSocket(): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			let settled = false
			let timer: ReturnType<typeof setTimeout> | undefined
			const finish = (result: boolean): void => {
				if (settled) return
				settled = true
				if (timer !== undefined) clearTimeout(timer)
				if (this.pendingFinish === finish)
					this.pendingFinish = undefined
				resolve(result)
			}
			this.pendingFinish = finish

			let socket: WebSocket
			try {
				socket = new WebSocket(this.socketUrl)
			} catch (err) {
				logger.error(err as Error, 'WebSocket 连接创建失败')
				finish(false)
				return
			}

			const generation = this.generation
			this.socket = socket
			let opened = false
			const isCurrent = (): boolean =>
				this.socket === socket && this.generation === generation

			timer = setTimeout(() => {
				if (!isCurrent()) {
					finish(false)
					return
				}
				// 建连超时：静默丢弃本次 socket，等待下次重连
				this.socket = undefined
				try {
					socket.close(4000)
				} catch {
					// 忽略关闭异常
				}
				logger.debug('WebSocket连接超时')
				finish(false)
			}, this.connectTimeout)

			socket.onopen = () => {
				if (!isCurrent()) return
				opened = true
				logger.info('WebSocket连接成功')
				this.setState('connected')
				finish(true)
			}

			socket.onmessage = (event: MessageEvent) => {
				if (!isCurrent()) return
				this.onMessageHook?.(event.data)
			}

			// onerror 与 onclose 共用同一处理：第一次处理后 socket 已被清空，
			// 第二次会因 this.socket !== socket 被丢弃，避免一次断线触发两轮重连。
			const onClose = (event: CloseEvent | Event) => {
				if (!isCurrent()) {
					finish(false)
					return
				}
				if (!opened) {
					this.socket = undefined
					finish(false)
					return
				}
				this.handleClose(socket, event)
			}
			socket.onclose = onClose
			socket.onerror = onClose
		})
	}

	/**
	 * 已连接 socket 意外断开：进入自动重连
	 */
	private handleClose(socket: WebSocket, event: CloseEvent | Event): void {
		if (this.socket !== socket) return
		const info: ObWsCloseInfo =
			event instanceof CloseEvent
				? { code: event.code, message: event.reason }
				: { code: -1, message: '连接异常关闭' }
		this.socket = undefined

		if (this.closing) {
			this.setState('disconnected')
			return
		}

		this.setState('error')
		this.options.onReconnecting?.()
		void this.reconnect(info)
	}

	/**
	 * 立即重连（无退避，最多 retry 次），全部失败后上报连接丢失
	 */
	private async reconnect(info: ObWsCloseInfo): Promise<void> {
		const generation = this.generation
		const retry = Math.max(1, this.retry)
		for (let i = 0; i < retry; i++) {
			if (this.closing || this.generation !== generation) return
			this.setState('connecting')
			const re = await this.openSocket()
			if (this.closing || this.generation !== generation) return
			if (re) return
		}

		this.setState('error')
		this.onErrorHook?.(info)
		this.options.onReconnectFailed?.(info)
		// 交由 login 层注册的 handler 清理 nowAdapter / 弹登录窗（此处不直接依赖）
		emitConnectionLost()
	}
	//#endregion
}
