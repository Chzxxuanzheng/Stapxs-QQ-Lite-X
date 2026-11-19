import { autoMarkRaw } from '@renderer/function/model/utils'
import { Msg } from '@renderer/function/model/msg'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { JsonSegData } from '@renderer/function/adapter/interface'
import app from '@renderer/main'

@registerSegType
@autoMarkRaw
export class JsonSeg extends Seg {
	static readonly type = 'json'
	static readonly inline = false
	readonly data: string
	readonly id: string
	constructor(data: JsonSegData) {
		super()
		this.data = data.data
		this.id = data.id
	}

	plaintext(_?: Msg): string {
		try {
			return JSON.parse(this.data).prompt
		} catch {
			const { $t } = app.config.globalProperties
			return '[' + $t('卡片消息') + ']'
		}
	}

	override reedit(): [JsonSeg] {
		return [this]
	}

	override serializeData(): JsonSegData {
		return {
			type: 'json',
			data: this.data,
			id: this.id,
		}
	}
}
