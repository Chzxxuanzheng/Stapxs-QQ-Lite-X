import app from '@renderer/main'
import driver from '@renderer/function/driver'
import { Gender, Role } from '@renderer/function/adapter/enmu'
import { SenderData } from '@renderer/function/adapter/interface'
import { ObRequest, ObResponse } from '@renderer/function/adapter/ob/type'
import { logger } from '@renderer/function/base'

class WsError extends Error {
	params: any
	constructor(message: string, params: any) {
		super(message)
		this.params = params
	}
}

class TimeoutError extends WsError {
	constructor(params: any) {
		super('请求超时', params)
	}
}

class ActionFailedError extends WsError {
	data: any
	constructor(params: any, data: any) {
		super(`请求失败,返回代码:${data['retcode']}`, params)
		this.data = data
	}
}

/**
 * 请求类
 * 用于封装请求参数和处理响应
 */
class Request {
	timeout: number
	action: string
	params: any
	echo: string
	resolve!: (value: any) => void
	reject!: (reason?: any) => void
	promise: Promise<any>

	static readonly RequestMap: Map<string, Request> = new Map()

	constructor(
		action: string,
		params: any,
		echo: string = crypto.randomUUID(),
		timeout: number = 5000,
	) {
		// 生成Promise
		this.promise = new Promise((resolve, reject) => {
			this.resolve = resolve
			this.reject = reject
		})

		// 初始化参数
		this.action = action
		this.params = params
		this.echo = echo

		// 设置超时
		this.timeout = setTimeout(() => {
			Request.RequestMap.delete(this.params.echo)
			this.reject(new TimeoutError(this.params))
		}, timeout) as unknown as number

		// 将请求存入Map
		Request.RequestMap.set(echo, this)
	}

	/**
	 * 收到相应
	 * @param data 响应内容
	 * @returns
	 */
	static handleResponse(data: {
		echo: string
		status: string
		[key: string]: any
	}) {
		const request = Request.RequestMap.get(data.echo)
		if (!request) {
			logger.error(null, `未找到对应的请求: ${data.echo}`)
			return
		}
		clearTimeout(request.timeout)
		Request.RequestMap.delete(request.echo)
		if (data.status !== 'ok')
			request.reject(new ActionFailedError(request.params, data))
		else request.resolve(data)
	}

	/**
	 * 等待到有响应
	 * @returns 相应内容
	 */
	async waitResponse(): Promise<any> {
		return await this.promise
	}

	createJson(): string {
		try {
			return JSON.stringify({
				action: this.action,
				params: this.params,
				echo: this.echo,
			} as ObRequest<any>)
		} catch {
			throw new Error(
				'创建请求JSON失败' +
					JSON.stringify({
						action: this.action,
						params: this.params,
						echo: this.echo,
					}),
			)
		}
	}
}

/**
 * 将OB的连接方式进行封装
 * (基本上就是把WS转化成类似http这种发了就能拿到结果的版本)
 */
export class ObConnector {
	private onmessageHook: (msg: string) => void
	constructor(onmessage: (msg: string) => void) {
		this.onmessageHook = onmessage
	}

	/**
	 * 连接到WebSocket
	 * @param retry 重试次数
	 * @returns
	 */
	async open(url: string, ssl: boolean, token?: string): Promise<boolean> {
		driver.reset(url, ssl, token) // 重置driver状态
		driver.onMessage(this.onmessage.bind(this)) // 设置消息钩子
		return await driver.open()
	}

	async close(): Promise<void> {
		await driver.close()
	}

	onmessage(getData: string) {
		try {
			const data = JSON.parse(getData)
			// 如果有echo，说明是请求响应
			if (data.echo) Request.handleResponse(data)
			else this.onmessageHook(data)
		} catch (error) {
			logger.error(error as Error, 'WebSocket消息处理失败')
		}
	}

	/**
	 * 重置onmessage钩子
	 * @param onmessage 新钩子
	 */
	setOnMessageHook(onmessage: (msg: string) => void): void {
		this.onmessageHook = onmessage
		driver.onMessage(this.onmessage.bind(this))
	}

	async send(
		name: string,
		args: { [key: string]: any },
	): Promise<ObResponse<any>> {
		// 过滤掉空的参数
		if (!driver.isConnected())
			throw new Error('WebSocket未连接，无法发送消息')

		// 创建请求
		const resp = new Request(name, args)
		// 发送
		driver.send(resp.createJson())
		return await resp.waitResponse()
	}
}

export function $t(value: string): string {
	return app.config.globalProperties.$t(value)
}

/**
 * 获取性别
 * @param sex 性别字符串
 * @returns
 */
export function getGender(sex: 'male' | 'female' | 'unknown'): Gender {
	switch (sex) {
		case 'male':
			return Gender.Male
		case 'female':
			return Gender.Female
		case 'unknown':
			return Gender.Unknown
	}
}

/**
 * 获取角色
 * @param role 角色
 */
export function getRole(role: 'owner' | 'admin' | 'member'): Role {
	switch (role) {
		case 'owner':
			return Role.Owner
		case 'admin':
			return Role.Admin
		case 'member':
			return Role.User
	}
}

/**
 * 创建SenderData
 * @param user_id 用户ID
 * @param nickname 昵称
 */
export function createSender(user_id: number, nickname?: string): SenderData {
	if (!nickname) nickname = user_id.toString()
	return {
		id: user_id,
		nickname,
		sex: Gender.Unknown,
	}
}

/**
 * CQ码解析
 * @param msg CQCode 消息
 * @returns 消息对象
 */
export function parseCQ(cq: string) {
	// 将纯文本也处理为 CQCode 格式
	// PS：这儿不用担心方括号本身，go-cqhttp 会把它转义掉
	let reg = /^[^\]]+?\[|\].+\[|\][^[]+$|^[^[\]]+$/g
	const textList = RegExp(reg).exec(cq)
	if (textList !== null) {
		textList.forEach((item) => {
			item = item.replace(']', '').replace('[', '')
			cq = cq.replace(item, `[CQ:text,text=${item}]`)
		})
	}
	// 拆分 CQCode
	reg = /\[.+?\]/g
	cq = cq.replaceAll('\n', '\\n')
	const list = RegExp(reg).exec(cq)
	// 处理为 object
	const back: { [ket: string]: any }[] = []
	reg = /\[CQ:([^,]+),(.*)\]/g
	if (list !== null) {
		list.forEach((item) => {
			if (RegExp(reg).exec(item) !== null) {
				const info: { [key: string]: any } = { type: RegExp.$1 }
				RegExp.$2.split(',').forEach((key: string) => {
					const kv = [] as string[]
					kv.push(key.substring(0, key.indexOf('=')))
					// 对 html 转义字符进行反转义
					const a = document.createElement('a')
					a.innerHTML = key.substring(key.indexOf('=') + 1)
					kv.push(a.innerText)
					info[kv[0]] = kv[1]
				})
				// 对文本消息特殊处理
				if (info.type == 'text') {
					info.text = RegExp.$2
						.substring(RegExp.$2.lastIndexOf('=') + 1)
						.replaceAll('\\n', '\n')
					// 对 html 转义字符进行反转义
					const a = document.createElement('a')
					a.innerHTML = info.text
					info.text = a.innerText
				}
				back.push(info)
			}
		})
	}
	logger.debug('解析 CQ 消息结果: ' + JSON.stringify(back))
	return back
}

/**
 * 文件转二进制文件
 * @param file
 * @returns
 */
export async function fileToBase64(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer()
	const bytes = new Uint8Array(arrayBuffer)
	const binary = bytes.reduce(
		(acc, byte) => acc + String.fromCodePoint(byte),
		'',
	)
	return btoa(binary)
}
