/*
 * @FileDescription: mdast Strong 节点
 */
import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type {
	SendMsgTextType,
	StrongSegData,
} from '@renderer/function/adapter/interface'
import { Msg } from '@renderer/function/model/msg'

@registerSegType
@autoMarkRaw
export class StrongSeg extends Seg {
	static readonly type = 'strong'
	static readonly inline = true
	readonly children: Seg[]

	constructor(data: StrongSegData) {
		super(data.extra)
		this.children = data.children.map((child) => Seg.parse(child))
	}

	plaintext(msg?: Msg): string {
		return `**${this.children.map((child) => child.plaintext(msg)).join('')}**`
	}

	override reedit(ctx: Msg, type: SendMsgTextType): (string | Seg)[] {
		const out: (string | Seg)[] = []
		for (const child of this.children) {
			out.push(...child.reedit(ctx, type))
		}

		return ['**', ...out, '**']
	}

	serializeData(): StrongSegData {
		return {
			type: 'strong',
			children: this.children.map((child) => child.serializeData()),
			extra: this.extra,
		}
	}
}
