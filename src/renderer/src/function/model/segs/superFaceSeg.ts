import { autoMarkRaw } from '@renderer/function/model/utils'
import { Msg } from '@renderer/function/model/msg'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { SuperFaceSegData } from '@renderer/function/adapter/interface'
import app from '@renderer/main'
import Emoji from '@renderer/function/model/emoji'

@registerSegType
@autoMarkRaw
export class SuperFaceSeg extends Seg {
	static readonly type = 'super-face'
	static readonly inline = true
	text?: string
	id: string
	face?: Emoji
	constructor(id: string)
	constructor(data: SuperFaceSegData)
	constructor(arg: string | SuperFaceSegData) {
		super()
		if (typeof arg === 'string') {
			this.id = arg
		} else {
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

	override reedit(): [SuperFaceSeg] {
		return [this]
	}

	override serializeData(): SuperFaceSegData {
		return {
			type: 'super-face',
			id: this.id,
			text: this.text,
		}
	}
}
