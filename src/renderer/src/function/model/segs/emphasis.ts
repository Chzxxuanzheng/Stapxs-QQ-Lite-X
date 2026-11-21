/*
 * @FileDescription: mdast Emphasis 节点
 */
import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { EmphasisSegData } from '@renderer/function/adapter/interface'
import { Msg } from '@renderer/function/model/msg'

@registerSegType
@autoMarkRaw
export class EmphasisSeg extends Seg {
	static readonly type = 'emphasis'
	static readonly inline = true
	readonly children: Seg[]

	constructor(data: EmphasisSegData) {
		super(data.extra)
		this.children = data.children.map((child) => Seg.parse(child))
	}

	plaintext(msg?: Msg): string {
		return `*${this.children.map((child) => child.plaintext(msg)).join('')}*`
	}

	override reedit(): (string | Seg)[] {
		const out: (string | Seg)[] = []
		for (const child of this.children) {
			out.push(...child.reedit())
		}

		return ['*', ...out, '*']
	}

	serializeData(): EmphasisSegData {
		return {
			type: 'emphasis',
			children: this.children.map((child) => child.serializeData()),
			extra: this.extra,
		}
	}
}
