/*
 * @FileDescription: mdast Link 节点
 */
import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type {
	LinkSegData,
	SendMsgTextType,
} from '@renderer/function/adapter/interface'
import { Msg } from '@root/src/renderer/src/function/model/msg'

@registerSegType
@autoMarkRaw
export class LinkSeg extends Seg {
	static readonly type = 'link'
	static readonly inline = true
	readonly url: string
	readonly name: string

	constructor(data: LinkSegData) {
		super(data.extra)
		this.url = data.url
		this.name = data.name
	}

	override plaintext(): string {
		return this.url ? `[${this.name}](${this.url})` : this.name
	}

	override reedit(_ctx: Msg, type: SendMsgTextType): [string] {
		if (type === 'md') return [this.plaintext()]
		else return [this.name]
	}

	override serializeData(): LinkSegData {
		return {
			type: 'link',
			url: this.url,
			name: this.name,
			extra: this.extra,
		}
	}
}
