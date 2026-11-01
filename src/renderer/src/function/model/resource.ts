/*
 * @FileDescription: 资源模型
 * @Author: Mr.Lee
 * @Date: 2025/07/15
 * @Version: 1.0
 * @Description: 对tx资源id的封装，支持主动获取资源id
 */

import { markRaw, shallowRef } from 'vue'
import useRuntimeData from '@renderer/state/runtimeData'
import { ProxyUrl } from './proxyUrl'

export class Resource {
    _id?: string
    _url = shallowRef<ProxyUrl>(undefined as unknown as ProxyUrl)
	private refreshTimeout: undefined | ReturnType<typeof setTimeout>

    protected constructor(id: string | undefined, url: string) {
        this._id = id
        this._url.value = new ProxyUrl(url)

        // 设置定时更新
        this.scheduleRefresh()
    }

    /**
     * 通过资源id创建
     * 适配器不支持获取资源时url为空字符串
     * @param id
     * @returns
     */
    static async fromId(id: string): Promise<Resource> {
        const runtimeData = useRuntimeData()
        if (!runtimeData.nowAdapter?.getResource) return new Resource(id, '')
        const url = await runtimeData.nowAdapter.getResource(id)
        if (!url) return new Resource(id, '')
        return markRaw(new Resource(id, url))
    }

    /**
     * 通过资源url创建
     * @param url
     * @param id
     * @returns
     */
    static fromUrl(url: string, id?: string): Resource {
        return markRaw(new Resource(id, url))
    }

    get url(): string {
        return this._url.value.url
    }

    get proxyUrl(): ProxyUrl {
        return this._url.value
    }

    get rawUrl(): string {
        return this._url.value.raw
    }

    protected scheduleRefresh(): void {
        clearTimeout(this.refreshTimeout)
        if (!this._id) return

        const ref = new WeakRef(this)
        this.refreshTimeout = setTimeout(
			() => void ref.deref()?.refresh(),
			55 * 60 * 1000
		)

    }

	protected async _refresh_func(): Promise<boolean> {
        const runtimeData = useRuntimeData()
		if (!runtimeData.nowAdapter?.getResource) return false
		const newUrl = await runtimeData.nowAdapter.getResource(
			this._id as string,
		)
		if (!newUrl) return false
		this._url.value = new ProxyUrl(newUrl)

		return true
	}

	async refresh(): Promise<boolean> {
		clearTimeout(this.refreshTimeout)

		if (!this._id) return false

		const re = await this._refresh_func()

		this.scheduleRefresh()

		return re
	}
}
