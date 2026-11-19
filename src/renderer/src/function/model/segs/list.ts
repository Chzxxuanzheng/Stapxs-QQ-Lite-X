/*
 * @FileDescription: mdast List 节点
 */
import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { ListSegData } from '@renderer/function/adapter/interface'
import { Msg } from '@renderer/function/model/msg'

@registerSegType
@autoMarkRaw
export class ListSeg extends Seg {
	static readonly type = 'list'
	static readonly inline = false
	readonly ordered: boolean
	readonly children: Seg[][]

	constructor(data: ListSegData) {
		super()
		this.ordered = data.ordered
		this.children = data.children.map((item) =>
			item.map((child) => Seg.parse(child)),
		)
	}

	plaintext(msg?: Msg): string {
		return this.children
			.map((item, index) => {
				const prefix = this.ordered ? `${index + 1}. ` : '- '
				const content = item
					.map((child) => child.plaintext(msg))
					.join('')
				return `${prefix}${content}`
			})
			.join('\n')
	}

	override reedit(): (Seg | string)[] {
		const lines = this.children.map((item, index) => {
			const prefix = this.ordered ? `${index + 1}. ` : '- '
			const lineChildResult: (string | Seg)[] = []
			for (const child of item) {
				lineChildResult.push(...child.reedit())
			}
			return [prefix, ...lineChildResult]
		})

		const out: (Seg | string)[] = []
		for (let i = 0; i < lines.length; i++) {
			if (i > 0) out.push('\n')
			if (lines[i]) out.push(...lines[i])
		}
		return out
	}

	serializeData(): ListSegData {
		return {
			type: 'list',
			ordered: this.ordered,
			children: this.children.map((item) =>
				item.map((child) => child.serializeData()),
			),
		}
	}
}
