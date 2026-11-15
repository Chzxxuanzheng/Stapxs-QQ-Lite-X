/*
 * @FileDescription: Milky HTTP 传输层
 * @Author: Mr.Lee
 * @Date: 2026/11/15
 * @Version: 1.0
 * @Description: 负责 Milky 协议端 api/* 的 HTTP 请求（Bearer 鉴权 + JSON 请求体），
 *               只服务 mk 适配器，不引用 UI / 状态 / login，也不持有连接状态。
 */

/** 请求描述 */
export interface MilkyRequest {
	/** 相对协议端的路径，允许以 / 开头 */
	path: string
	body?: unknown
	headers?: Record<string, string>
	signal?: AbortSignal
	/** 单次请求硬超时（ms），<= 0 表示不额外计时 */
	timeout?: number
}

/**
 * HTTP 请求错误，保留状态码与原始响应体
 */
export class MilkyHttpError extends Error {
	readonly status: number
	readonly body?: unknown

	constructor(status: number, message: string, body?: unknown) {
		super(message)
		this.name = 'MilkyHttpError'
		this.status = status
		this.body = body
	}

	/**
	 * 从非 2xx 响应构造错误：优先取错误体中的 message/error，非 JSON 时取文本前 200 字
	 * @param response 非 2xx 响应
	 */
	static async fromResponse(response: Response): Promise<MilkyHttpError> {
		let text = ''
		try {
			text = await response.text()
		} catch {
			// 响应体读取失败时只保留状态码
		}

		let body: unknown = text
		let message = ''
		let isJson = false
		if (text !== '') {
			try {
				const parsed: unknown = JSON.parse(text)
				isJson = true
				body = parsed
				if (typeof parsed === 'object' && parsed !== null) {
					const record = parsed as Record<string, unknown>
					if (typeof record.message === 'string')
						message = record.message
					else if (typeof record.error === 'string')
						message = record.error
				}
			} catch {
				// 非 JSON 错误体，后面回退到文本
			}
		}

		if (message === '') {
			if (!isJson && text !== '') message = text.slice(0, 200)
			else message = '网络请求失败'
		}

		return new MilkyHttpError(response.status, message, body)
	}
}

/**
 * Milky HTTP 客户端
 */
export class MilkyHttp {
	/** http(s)://host[:port][/base]，不含尾斜杠 */
	private base = ''
	private token?: string
	private header: Record<string, string> = {}
	private readonly inflight = new Set<AbortController>()

	/**
	 * 配置协议端地址与鉴权信息
	 * @param url 协议端地址（host[:port][/base]）
	 * @param ssl 是否使用 https
	 * @param token 访问令牌，传空则不带鉴权头
	 * @param headers 额外请求头
	 */
	configure(
		url: string,
		ssl: boolean,
		token?: string,
		headers: Record<string, string> = {},
	): void {
		// 清理上一次连接的残留请求
		this.abortAll()
		this.base = `${ssl ? 'https' : 'http'}://${url.replace(/\/+$/, '')}`
		this.token = token
		this.header = { ...headers }
	}

	/**
	 * 更新访问令牌
	 * @param token 访问令牌，传 undefined 清除
	 */
	setToken(token?: string): void {
		this.token = token
	}

	/** HTTP base url（保留协议端地址里的路径） */
	get baseUrl(): string {
		return this.base
	}

	/**
	 * POST JSON 数据（Milky 的 api/* 唯一通道）
	 * @param path 相对协议端的路径
	 * @param data 请求体，会被序列化为 JSON
	 * @returns 响应文本
	 */
	async post(path: string, data: unknown): Promise<string> {
		return await this.request({
			path,
			body: data,
		})
	}

	/**
	 * 通用请求，统一返回响应文本（Milky 的 api/* 只接受 POST）
	 * @param req 请求描述
	 * @returns 响应文本；非 2xx 抛 MilkyHttpError
	 */
	async request(req: MilkyRequest): Promise<string> {
		const controller = new AbortController()
		this.inflight.add(controller)
		const onAbort = () => controller.abort()

		if (req.signal) {
			if (req.signal.aborted) controller.abort()
			else req.signal.addEventListener('abort', onAbort, { once: true })
		}

		let timer: ReturnType<typeof setTimeout> | undefined
		if (req.timeout !== undefined && req.timeout > 0) {
			timer = setTimeout(() => controller.abort(), req.timeout)
		}

		try {
			const headers = new Headers()
			headers.set('Accept', 'application/json')
			if (this.token) headers.set('Authorization', `Bearer ${this.token}`)
			for (const [key, value] of Object.entries(this.header))
				headers.set(key, value)
			for (const [key, value] of Object.entries(req.headers ?? {}))
				headers.set(key, value)

			const response = await fetch(this.buildUrl(req.path), {
				method: 'POST',
				headers,
				body: encodeBody(req.body, headers),
				signal: controller.signal,
			})
			if (!response.ok) throw await MilkyHttpError.fromResponse(response)
			return await response.text()
		} finally {
			if (timer !== undefined) clearTimeout(timer)
			req.signal?.removeEventListener('abort', onAbort)
			this.inflight.delete(controller)
		}
	}

	/** 中止全部在途请求 */
	abortAll(): void {
		for (const controller of this.inflight) controller.abort()
		this.inflight.clear()
	}

	/**
	 * 拼接请求地址
	 * @param path 相对路径，自动补前导斜杠
	 */
	private buildUrl(path: string): string {
		const normalized = path.startsWith('/') ? path : `/${path}`
		return new URL(`${this.base}${normalized}`).toString()
	}
}

/**
 * 编码请求体：Blob/ArrayBuffer/string 等原样发送，其余转 JSON
 * @param body 原始请求体
 * @param headers 请求头（会被补充 Content-Type）
 */
function encodeBody(body: unknown, headers: Headers): BodyInit | undefined {
	if (body === undefined || body === null) return undefined
	if (
		typeof body === 'string' ||
		body instanceof Blob ||
		body instanceof ArrayBuffer ||
		body instanceof FormData ||
		body instanceof URLSearchParams
	) {
		if (
			body instanceof Blob &&
			body.type !== '' &&
			!headers.has('Content-Type')
		)
			headers.set('Content-Type', body.type)
		return body
	}
	if (!headers.has('Content-Type'))
		headers.set('Content-Type', 'application/json')
	return JSON.stringify(body)
}
