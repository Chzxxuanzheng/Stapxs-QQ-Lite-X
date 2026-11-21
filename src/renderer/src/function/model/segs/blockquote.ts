/*
 * @FileDescription: mdast Blockquote 节点
 */
import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { BlockquoteSegData } from '@renderer/function/adapter/interface'
import { Msg } from '@renderer/function/model/msg'

@registerSegType
@autoMarkRaw
export class BlockquoteSeg extends Seg {
	static readonly type = 'blockquote'
	static readonly inline = false
	readonly children: Seg[]

	constructor(data: BlockquoteSegData) {
		super(data.extra)
		this.children = data.children.map((child) => Seg.parse(child))
	}

	plaintext(msg?: Msg): string {
		return `> ${this.children.map((child) => child.plaintext(msg)).join('')}`
	}

	override reedit(): (string | Seg)[] {
		const out: (string | Seg)[] = []
		for (const child of this.children) {
			out.push(...child.reedit())
		}

		return ['> ', ...out]
	}

	serializeData(): BlockquoteSegData {
		return {
			type: 'blockquote',
			children: this.children.map((child) => child.serializeData()),
			extra: this.extra,
		}
	}
}
