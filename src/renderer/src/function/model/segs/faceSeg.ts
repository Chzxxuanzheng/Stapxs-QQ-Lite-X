import { autoMarkRaw } from '@renderer/function/model/utils'
import { Msg } from '@renderer/function/model/msg'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { FaceSegData } from '@renderer/function/adapter/interface'
import Emoji from '@root/src/renderer/src/function/model/emoji'
import app from '@renderer/main'

@registerSegType
@autoMarkRaw
export class FaceSeg extends Seg {
	static readonly type = 'face'
	static readonly inline = true
	text?: string
	id: string
	face?: Emoji
	constructor(id: string)
	constructor(data: FaceSegData)
	constructor(arg: string | FaceSegData) {
		if (typeof arg === 'string') {
			super()
			this.id = arg
		} else {
			super(arg.extra)
			this.text = arg.text
			this.id = arg.id
		}
		this.face = Emoji.get(+this.id)
	}

	plaintext(_?: Msg): string {
		const { $t } = app.config.globalProperties
		if (this.text) return '[' + this.text + ']'
		else return '[' + $t('表情') + ']'
	}

	override reedit(): [FaceSeg] {
		return [this]
	}

	override serializeData(): FaceSegData {
		return {
			type: 'face',
			id: this.id,
			text: this.text,
			extra: this.extra,
		}
	}
}
