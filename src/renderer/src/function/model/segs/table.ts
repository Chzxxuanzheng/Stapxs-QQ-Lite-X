/*
 * @FileDescription: mdast Table 节点
 */
import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { TableSegData } from '@renderer/function/adapter/interface'
import { Msg } from '@renderer/function/model/msg'

@registerSegType
@autoMarkRaw
export class TableSeg extends Seg {
	static readonly type = 'table'
	static readonly inline = false
	readonly head: Seg[][]
	readonly content: Seg[][][]

	constructor(data: TableSegData) {
		super()
		this.head = data.head.map((cell) =>
			cell.map((child) => Seg.parse(child)),
		)
		this.content = data.content.map((row) =>
			row.map((cell) => cell.map((child) => Seg.parse(child))),
		)
	}

	plaintext(msg?: Msg): string {
		const formatRow = (row: Seg[][]): string =>
			row
				.map((cell) =>
					cell.map((child) => child.plaintext(msg)).join(''),
				)
				.join(' | ')
		return [this.head, ...this.content]
			.map((row) => formatRow(row))
			.join('\n')
	}

	override reedit(): (Seg | string)[] {
		const parseChildren = <T>(
			segs: T[],
			parseFunc: (child: T) => (Seg | string)[],
			join?: string,
		): (Seg | string)[] => {
			const children = segs.map(parseFunc)

			const out: (Seg | string)[] = []
			for (let i = 0; i < children.length; i++) {
				if (i > 0 && join) out.push(join)
				if (children[i]) out.push(...children[i])
			}
			return out
		}

		const formatRow = (row: Seg[][]): (Seg | string)[] =>
			parseChildren(
				row,
				(cell) => parseChildren(cell, (child) => child.reedit()),
				'|',
			)
		return parseChildren([this.head, ...this.content], formatRow, '\n')
	}

	serializeData(): TableSegData {
		return {
			type: 'table',
			head: this.head.map((cell) =>
				cell.map((child) => child.serializeData()),
			),
			content: this.content.map((row) =>
				row.map((cell) => cell.map((child) => child.serializeData())),
			),
		}
	}
}
