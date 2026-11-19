import { autoMarkRaw } from '@renderer/function/model/utils'
import { Msg } from '@renderer/function/model/msg'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { MfaceSegData } from '@renderer/function/adapter/interface'
import { ProxyUrl } from '@renderer/function/model/proxyUrl'
import { Img } from '@renderer/function/model/img'
import app from '@renderer/main'

@registerSegType
@autoMarkRaw
export class MfaceSeg extends Seg {
	static readonly type = 'mface'
	static readonly inline = false
	_url: ProxyUrl
	summary: string
	packageId: number
	id: string
	key: string
	imgData: Img

	constructor(data: MfaceSegData) {
		super()
		this._url = new ProxyUrl(data.url)
		this.summary = data.summary
		this.packageId = data.packageId
		this.id = data.id
		this.key = data.key
		this.imgData = new Img(data.url)
	}

	plaintext(_?: Msg): string {
		const { $t } = app.config.globalProperties
		return this.summary ?? '[' + $t('表情') + ']'
	}

	get url(): string {
		return this._url.url
	}

	get rawUrl(): string {
		return this._url.raw
	}

	get src(): string {
		return this.url
	}

	override reedit(): [MfaceSeg] {
		return [this]
	}

	override serializeData(): MfaceSegData {
		return {
			type: 'mface',
			url: this._url.raw,
			summary: this.summary,
			packageId: this.packageId,
			id: this.id,
			key: this.key,
		}
	}
}
