import { computed, toRaw } from 'vue'
import useRuntimeData from '@renderer/state/runtimeData'

/**
 * 走代理的url
 */
export class ProxyUrl {
	constructor(public raw: string) {}

	private readonly _url = computed(() => ProxyUrl.proxy(this.raw))

	/**
	 * 代理后的url
	 * 想要获取原始url请使用 `this.raw`
	 */
	get url() {
		return toRaw(this)._url.value
	}

	/**
	 * 临时创建一个代理url
	 * @param raw 代理连接
	 * @returns
	 */
	static proxy(raw: string): string {
		const runtimeData = useRuntimeData()
		if (!runtimeData.tags.canCors) return raw
		return ProxyUrl.proxyMain(raw)
	}

	/**
	 * 强制走代理
	 * @param raw 原始链接
	 * @returns
	 */
	static forceProxy(raw: string): string {
		return ProxyUrl.proxyMain(raw)
	}

	toString(): string {
		return this.url
	}

	private static proxyMain(raw: string): string {
		if (!raw.toLowerCase().startsWith('http')) return raw
		const runtimeData = useRuntimeData()
		if (document.location.protocol == 'https:') {
			// 判断文件 URL 的协议
			// PS：Chrome 不会对 http 文件进行协议升级
			if (raw.toLowerCase().startsWith('http:')) {
				raw = 'https' + raw.substring(raw.indexOf('://'))
			}
		}
		// 获取跨域连接
		let proxyUrl: string | undefined
		if (runtimeData.sysConfig.proxyUrl?.trim().length > 0)
			proxyUrl = runtimeData.sysConfig.proxyUrl.trim()

		// url 校验
		if (proxyUrl && !proxyUrl.includes('{url}')) proxyUrl = undefined

		// 包装 url
		if (proxyUrl) return proxyUrl.replace('{url}', encodeURIComponent(raw))
		return raw
	}
}
