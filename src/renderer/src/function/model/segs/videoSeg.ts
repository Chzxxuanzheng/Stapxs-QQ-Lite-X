import { autoMarkRaw } from '@renderer/function/model/utils'
import { Msg } from '@renderer/function/model/msg'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { VideoSegData } from '@renderer/function/adapter/interface'
import { Resource } from '@root/src/renderer/src/function/model/resource'
import app from '@renderer/main'

@registerSegType
@autoMarkRaw
export class VideoSeg extends Seg {
	static readonly type = 'video'
	static readonly inline = false
	file: string
	_url: Resource
	constructor(data: VideoSegData) {
		super(data.extra)
		this.file = data.file
		this._url = data.url
	}
	plaintext(_?: Msg): string {
		const { $t } = app.config.globalProperties
		return '[' + $t('视频') + ']'
	}
	get url(): string {
		return this._url.url
	}
	get rawUrl(): string {
		return this._url.rawUrl
	}

	async refreshResource(): Promise<boolean> {
		return await this._url.refresh()
	}

	override reedit(): [VideoSeg] {
		return [this]
	}

	override serializeData(): VideoSegData {
		return {
			type: 'video',
			file: this.file,
			url: this._url,
			extra: this.extra,
		}
	}
}
