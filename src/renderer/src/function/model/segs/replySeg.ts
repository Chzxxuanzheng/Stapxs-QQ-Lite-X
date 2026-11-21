import { autoMarkRaw } from '@renderer/function/model/utils'
import { Msg } from '@renderer/function/model/msg'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { ReplySegData } from '@renderer/function/adapter/interface'

@registerSegType
@autoMarkRaw
export class ReplySeg extends Seg {
	static readonly type = 'reply'
	static readonly inline = false
	id: string
	msg?: Msg
	constructor(msgId: string)
	constructor(data: ReplySegData)
	constructor(data: ReplySegData | string) {
		if (typeof data === 'string') {
			super()
			this.id = data
		} else {
			super(data.extra)
			this.id = data.id
		}
	}

	plaintext(_?: Msg): string {
		return ''
	}

	override reedit(): [ReplySeg] {
		throw Error('reply 不应该参与重编辑')
	}

	override serializeData(): ReplySegData {
		if (!this.id) throw new Error('回复消息ID缺失')
		return {
			type: 'reply',
			id: this.id,
			extra: this.extra,
		}
	}
}
