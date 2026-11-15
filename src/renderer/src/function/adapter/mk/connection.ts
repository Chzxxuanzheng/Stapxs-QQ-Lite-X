/*
 * @FileDescription: Milky 连接层
 * @Author: Mr.Lee
 * @Date: 2026/11/15
 * @Version: 1.0
 * @Description: 负责 Milky 协议端的 WebSocket 事件流（/event）与 HTTP api 客户端组合。
 *               WS 生命周期、自动重连与状态回调集中在此；不引用 UI / 状态 / login，
 *               UI 语义（提示、登录窗）通过构造回调由适配器注入。
 */

import { logger } from '@renderer/function/base'
import { MilkyHttp } from '@renderer/function/adapter/mk/http'

/** 连接层内部状态（仅用于传输层生命周期，不对外暴露） */
export type ConnectionState =
	| 'disconnected'
	| 'connecting'
	| 'connected'
	| 'error'

/** WebSocket 关闭信息 */
export interface MilkyWsCloseInfo {
	code: string | number
	message: string
}

/** WebSocket 消息回调 */
export type MilkyWsMessageHandler = (message: string) => void

/** WebSocket 连接选项 */
export interface MilkyWsConnectionOptions {
	/** 自动重连次数，默认 5（与原实现一致） */
	retry?: number
	/** 单次建立连接的超时（ms），默认 15000；超时视为本次连接失败 */
	connectTimeout?: number
	/** 收到消息 */
	onMessage?: MilkyWsMessageHandler
	/** 自动重连彻底失败时的错误信息回调 */
	onError?: (info: MilkyWsCloseInfo) => void
	/** 连接状态变化 */
	onStateChange?: (state: ConnectionState) => void
	/** 断线后准备重连（对应「连接不稳定」提示） */
	onReconnecting?: () => void
	/** 自动重连彻底失败 */
	onReconnectFailed?: (info: MilkyWsCloseInfo) => void
}

/**
 * 把 WebSocket 关闭事件转换为统一的关闭信息
 * @param event 关闭/错误事件
 */
function toCloseInfo(event: CloseEvent | Event): MilkyWsCloseInfo {
	if (event instanceof CloseEvent)
		return {
			code: event.code,
			message: event.reason,
		}
	return {
		code: -1,
		message: '连接异常关闭',
	}
}

/**
 * Milky WebSocket 连接：只负责事件流的生命周期，不解析业务事件
 */
export class MilkyWsConnection {
	private wsUrl = ''
	private socket?: WebSocket
	private onMessageHook?: MilkyWsMessageHandler
	private onErrorHook?: (info: MilkyWsCloseInfo) => void
	private stateValue: ConnectionState = 'disconnected'
	/** 主动关闭标记，用于阻止在途重连 */
	private closing = false
	/** 代际编号，用于丢弃旧 socket / 旧重连循环的迟到事件 */
	private generation = 0
	private readonly retry: number
	private readonly connectTimeout: number
	private readonly options: MilkyWsConnectionOptions
	/** 在途 connect 的 resolve（close/reconnect 时提前结束） */
	private pendingFinish?: (result: boolean) => void
	/** 正在重连，避免同一次断线触发多轮重连与重复上报 */
	private reconnecting = false

	constructor(options: MilkyWsConnectionOptions = {}) {
		this.options = options
		this.retry = options.retry ?? 5
		this.connectTimeout = options.connectTimeout ?? 15000
		// 构造参数里的消息回调必须落到内部钩子，否则 onmessage 会调用空钩子（事件被静默丢弃）
		this.onMessageHook = options.onMessage
	}

	//#region == 配置与开启关闭 ======================================
	/**
	 * 配置 WebSocket 地址（事件流路径固定为 /event）
	 * @param url 协议端地址（host[:port][/base]）
	 * @param ssl 是否使用 wss
	 * @param token 访问令牌，会拼进 access_token
	 */
	configure(url: string, ssl: boolean, token?: string): void {
		const protocol = ssl ? 'wss' : 'ws'
		const base = `${protocol}://${url.replace(/\/+$/, '')}/event`
		this.wsUrl = token
			? `${base}?access_token=${encodeURIComponent(token)}`
			: base
	}

	/**
	 * 打开连接（会先静默关闭旧 socket）
	 * @returns 是否连接成功
	 */
	async connect(): Promise<boolean> {
		this.closing = false
		this.generation++
		this.pendingFinish?.(false)
		this.teardown()
		if (this.wsUrl === '') {
			this.setConnectionState('disconnected')
			return false
		}
		this.setConnectionState('connecting')
		const re = await this.openOnce()
		if (!re && !this.closing) this.setConnectionState('disconnected')
		return re
	}

	/**
	 * 关闭连接（幂等、不抛错，并阻止在途重连）
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
		this.setConnectionState('disconnected')
	}
	//#endregion

	//#region == 收发与钩子 ==========================================
	/**
	 * 发送数据；Milky 的事件流只收不发，此方法保留给后续扩展
	 * @param data 要发送的文本
	 */
	send(data: string): void {
		if (this.stateValue !== 'connected' || !this.socket)
			throw new Error('WebSocket未连接，无法发送数据')
		this.socket.send(data)
	}

	/**
	 * 注册消息回调（单槽，后注册覆盖前注册）
	 * @param callback 消息回调
	 */
	onMessage(callback: MilkyWsMessageHandler): void {
		this.onMessageHook = callback
	}

	/**
	 * 注册异常关闭回调（自动重连彻底失败时触发）
	 * @param callback 错误回调
	 */
	onError(callback: (info: MilkyWsCloseInfo) => void): void {
		this.onErrorHook = callback
	}
	//#endregion

	//#region == 自身状态 ============================================
	get state(): ConnectionState {
		return this.stateValue
	}

	isConnected(): boolean {
		return this.stateValue === 'connected' && this.socket !== undefined
	}

	isConnecting(): boolean {
		return this.stateValue === 'connecting'
	}
	//#endregion

	//#region == 私有方法 ============================================
	/**
	 * 静默关闭旧 socket（不发状态、不清消息钩子）
	 */
	private teardown(): void {
		const socket = this.socket
		this.socket = undefined
		if (!socket) return
		try {
			socket.close(1000)
		} catch {
			// 忽略重复关闭
		}
	}

	/**
	 * 单次建连尝试
	 * @returns 是否连接成功
	 */
	private openOnce(): Promise<boolean> {
		return new Promise<boolean>((resolve) => {
			let settled = false
			let timer: ReturnType<typeof setTimeout> | undefined
			const settle = (value: boolean): void => {
				if (settled) return
				settled = true
				if (timer !== undefined) clearTimeout(timer)
				if (this.pendingFinish === settle)
					this.pendingFinish = undefined
				resolve(value)
			}
			this.pendingFinish = settle

			if (this.closing) {
				settle(false)
				return
			}

			this.setConnectionState('connecting')
			let socket: WebSocket
			try {
				socket = new WebSocket(this.wsUrl)
			} catch (err) {
				logger.error(err as Error, 'WebSocket连接创建失败')
				this.setConnectionState('disconnected')
				settle(false)
				return
			}

			const generation = this.generation
			this.socket = socket
			let opened = false
			const isCurrent = (): boolean =>
				this.socket === socket && this.generation === generation

			// 建连超时：网络黑洞 / 半开连接下 onopen/onclose/onerror 都不会触发，
			// 没有这个定时器重连循环会永久挂起，登录窗也就永远不会弹出
			timer = setTimeout(() => {
				if (!isCurrent()) {
					settle(false)
					return
				}
				this.socket = undefined
				try {
					socket.close(4000)
				} catch {
					// 忽略关闭异常
				}
				logger.debug('WebSocket连接超时')
				settle(false)
			}, this.connectTimeout)

			socket.onopen = () => {
				if (!isCurrent()) return
				opened = true
				logger.info('WebSocket连接成功')
				this.setConnectionState('connected')
				settle(true)
			}
			const onFailure = (event: CloseEvent | Event): void => {
				// onerror 与 onclose 会先后触发，只处理当前代际的第一次
				if (!isCurrent()) {
					settle(false)
					return
				}
				this.socket = undefined
				if (opened) {
					void this.handleClose(event)
					return
				}
				this.setConnectionState('disconnected')
				settle(false)
			}
			socket.onclose = onFailure
			socket.onerror = onFailure
			socket.onmessage = (event: MessageEvent) => {
				if (!isCurrent()) return
				this.onMessageHook?.(event.data)
			}
		})
	}

	/**
	 * 已建立连接后的异常关闭处理：自动重连，彻底失败后回调
	 * @param event 关闭/错误事件
	 */
	private async handleClose(event: CloseEvent | Event): Promise<void> {
		if (this.closing) {
			this.setConnectionState('disconnected')
			return
		}
		// 同一次断线只处理一轮，避免 onerror/onclose 竞争触发多轮重连与重复上报
		if (this.reconnecting) return

		const generation = this.generation
		const info = toCloseInfo(event)
		this.reconnecting = true
		this.setConnectionState('error')
		// 与 ob 一致：每次断线只提示一次「连接不稳定」，不再按重连次数重复打扰
		this.options.onReconnecting?.()

		try {
			const reconnected = await this.reconnect(generation)
			// 期间被 close() 或新的 connect() 接管，交给它们维护状态
			if (this.closing || generation !== this.generation) return

			if (reconnected) {
				this.setConnectionState('connected')
				return
			}

			this.setConnectionState('disconnected')
			this.onErrorHook?.(info)
			// 只在重连彻底失败时上报一次，由适配器转成 emitConnectionLost
			this.options.onReconnectFailed?.(info)
		} finally {
			this.reconnecting = false
		}
	}

	/**
	 * 立即重试（无退避，保持原行为）
	 * @param generation 发起重连时的代际
	 * @returns 是否重连成功
	 */
	private async reconnect(generation: number): Promise<boolean> {
		const retry = Math.max(1, this.retry)
		for (let i = 0; i < retry; i++) {
			if (this.closing || this.generation !== generation) return false
			const re = await this.openOnce()
			if (re) return true
			if (this.closing || this.generation !== generation) return false
		}
		return false
	}

	/**
	 * 更新并广播连接状态（去重，避免重复通知）
	 * @param state 新状态
	 */
	private setConnectionState(state: ConnectionState): void {
		if (this.stateValue === state) return
		this.stateValue = state
		this.options.onStateChange?.(state)
	}
	//#endregion
}

/** Milky 连接层选项 */
export interface MilkyConnectionOptions {
	/** 收到事件（原始 JSON 文本） */
	onEvent: (json: string) => void | Promise<void>
	/** 连接状态变化（由适配器订阅并对外暴露） */
	onStateChange?: (state: ConnectionState) => void
	/** 断线后准备重连 */
	onReconnecting?: () => void
	/** 自动重连彻底失败 */
	onReconnectFailed?: (info: MilkyWsCloseInfo) => void
	/** 自动重连次数，默认 5 */
	retry?: number
	/** 单次建立连接的超时（ms），默认 15000 */
	connectTimeout?: number
}

/**
 * Milky 连接门面：WS 收事件 + HTTP 发 API
 */
export class MilkyConnection {
	readonly http: MilkyHttp
	private readonly ws: MilkyWsConnection
	private eventHandler: (json: string) => void | Promise<void>

	constructor(options: MilkyConnectionOptions) {
		this.eventHandler = options.onEvent
		this.http = new MilkyHttp()
		this.ws = new MilkyWsConnection({
			retry: options.retry,
			connectTimeout: options.connectTimeout,
			onMessage: (json) => this.dispatchEvent(json),
			onStateChange: options.onStateChange,
			onReconnecting: options.onReconnecting,
			onReconnectFailed: options.onReconnectFailed,
		})
	}

	/**
	 * 显式注册事件回调（对齐 ob 的 connection.onMessage 注册方式）
	 * 覆盖构造参数里的 onEvent；连接层不会在 connect/close 时清空该钩子
	 * @param callback 事件回调，入参为原始 JSON 文本
	 */
	onMessage(callback: (json: string) => void | Promise<void>): void {
		this.eventHandler = callback
		this.ws.onMessage((json) => this.dispatchEvent(json))
	}

	/**
	 * 连接协议端：先注册事件钩子，再配置 HTTP 并打开 /event 事件流
	 * @param url 协议端地址
	 * @param ssl 是否使用 SSL
	 * @param token 访问令牌
	 * @returns WebSocket 是否连接成功（版本探测由适配器继续）
	 */
	async connect(url: string, ssl: boolean, token?: string): Promise<boolean> {
		this.http.configure(url, ssl, token)
		this.ws.configure(url, ssl, token)
		// 确保钩子在建立 WS 之前就位，避免首帧落在空钩子上
		this.ws.onMessage((json) => this.dispatchEvent(json))
		return await this.ws.connect()
	}

	/**
	 * 关闭连接：停止事件流并中止在途请求（幂等、不抛错）
	 */
	async close(): Promise<void> {
		await this.ws.close()
		this.http.abortAll()
	}

	/**
	 * 发送 WebSocket 数据（Milky 事件流只收不发，保留给后续扩展）
	 * @param data 要发送的文本
	 */
	send(data: string): void {
		this.ws.send(data)
	}

	/** WebSocket 是否已连接（HTTP 调用门禁沿用此判断） */
	isConnected(): boolean {
		return this.ws.isConnected()
	}

	isConnecting(): boolean {
		return this.ws.isConnecting()
	}

	get state(): ConnectionState {
		return this.ws.state
	}

	/**
	 * 分发事件，处理回调抛出的同步异常与未捕获的异步异常
	 * @param json 原始事件文本
	 */
	private dispatchEvent(json: string): void {
		try {
			const result = this.eventHandler(json)
			if (result instanceof Promise)
				result.catch((err) =>
					logger.error(err as Error, 'Milky 事件处理失败'),
				)
		} catch (err) {
			logger.error(err as Error, 'Milky 事件处理失败')
		}
	}
}
