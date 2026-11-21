import { autoMarkRaw } from '@renderer/function/model/utils'
import { Msg } from '@renderer/function/model/msg'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { ImgSegData } from '@renderer/function/adapter/interface'
import { Resource } from '@renderer/function/model/resource'
import { Img } from '@renderer/function/model/img'
import app from '@renderer/main'

@registerSegType
@autoMarkRaw
export class ImgSeg extends Seg {
	static readonly type = 'image'
	static readonly inline = false
	_url: Resource
	summary: string
	isFace: boolean = false
	isLottie: boolean = false
	imgData: Img
	width?: number
	height?: number
	constructor(url: string, isFace?: boolean)
	constructor(data: ImgSegData)
	constructor(arg1: string | ImgSegData, arg2: boolean = false) {
		const { $t } = app.config.globalProperties
		if (typeof arg1 === 'string') {
			// constructor(url: string, isFace ?: boolean)
			super()
			const url = arg1
			const isFace = arg2 as boolean | undefined
			this._url = Resource.fromUrl(url)
			this.isFace = isFace || false
			this.summary = $t('[图片]')
		} else {
			// constructor(data: ImgSegData)
			const data = arg1
			super(data.extra)
			this._url = data.url
			this.summary = data.summary ?? $t('[图片]')
			this.isFace = data.isFace
			this.isLottie = data.isLottie ?? false
			this.width = data.width
			this.height = data.height
		}
		this.imgData = new Img(this._url)
	}

	plaintext(_?: Msg): string {
		const { $t } = app.config.globalProperties
		return this.summary ?? '[' + $t('图片') + ']'
	}

	setSize(width: number, height: number): void {
		if (this.width) throw new Error('图片宽度已设置，不能重复设置')
		this.width = width
		this.height = height
	}

	get url(): string {
		return this._url.url
	}

	get rawUrl(): string {
		return this._url.rawUrl
	}

	get src(): string {
		if (this.url.startsWith('base64:'))
			return 'data:image/png;base64,' + this.url.substring(9)
		return this.url
	}

	async refreshResource(): Promise<boolean> {
		return await this._url.refresh()
	}

	override reedit(): [ImgSeg] {
		return [this]
	}

	override serializeData(): ImgSegData {
		return {
			type: 'image',
			url: this._url,
			summary: this.summary,
			isFace: this.isFace,
			width: this.width,
			height: this.height,
			extra: this.extra,
		}
	}
}
