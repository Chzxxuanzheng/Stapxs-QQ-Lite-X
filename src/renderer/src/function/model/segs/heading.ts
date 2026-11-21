/*
 * @FileDescription: mdast Heading 节点
 */
import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type {
	HeadingSegData,
	SendMsgTextType,
} from '@renderer/function/adapter/interface'
import { Msg } from '@renderer/function/model/msg'

@registerSegType
@autoMarkRaw
export class HeadingSeg extends Seg {
	static readonly type = 'heading'
	static readonly inline = false
	readonly level: 1 | 2 | 3 | 4 | 5 | 6
	readonly children: Seg[]

	constructor(data: HeadingSegData) {
		super(data.extra)
		this.level = data.level
		this.children = data.children.map((child) => Seg.parse(child))
	}

	plaintext(msg?: Msg): string {
		return `${'#'.repeat(this.level)} ${this.children.map((child) => child.plaintext(msg)).join('')}`
	}

	override reedit(ctx: Msg, type: SendMsgTextType): (string | Seg)[] {
		const out: (string | Seg)[] = []
		for (const child of this.children) {
			out.push(...child.reedit(ctx, type))
		}

		return ['#'.repeat(this.level) + ' ', ...out]
	}

	serializeData(): HeadingSegData {
		return {
			type: 'heading',
			level: this.level,
			children: this.children.map((child) => child.serializeData()),
			extra: this.extra,
		}
	}
}
