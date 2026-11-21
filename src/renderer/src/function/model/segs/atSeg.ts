import { autoMarkRaw } from '@renderer/function/model/utils'
import { Msg } from '@renderer/function/model/msg'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { AtSegData } from '@renderer/function/adapter/interface'

@registerSegType
@autoMarkRaw
export class AtSeg extends Seg {
	static readonly type = 'at'
	static readonly inline = true
	user_id: string
	constructor(user_id: string)
	constructor(data: AtSegData)
	constructor(arg: AtSegData | string) {
		if (typeof arg === 'string') {
			super()
			this.user_id = arg
		} else {
			super(arg.extra)
			this.user_id = arg.user_id
		}
	}

	plaintext(msg?: Msg): string {
		if (!msg?.session) return `@${this.user_id}`

		const user = msg.session.getUserById(this.user_id)
		if (user) return '@' + user.name
		return `@${this.user_id}`
	}

	override reedit(): [AtSeg] {
		return [this]
	}

	override serializeData(): AtSegData {
		return {
			type: 'at',
			user_id: this.user_id,
			extra: this.extra,
		}
	}
}
