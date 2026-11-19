/*
 * @FileDescription: mdast ThematicBreak 节点
 */
import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { ThematicBreakSegData } from '@renderer/function/adapter/interface'

@registerSegType
@autoMarkRaw
export class ThematicBreakSeg extends Seg {
	static readonly type = 'thematic-break'
	static readonly inline = false

	constructor(_: ThematicBreakSegData) {
		super()
	}

	override plaintext(): string {
		return '---'
	}

	override reedit(): [string] {
		return [this.plaintext()]
	}

	override serializeData(): ThematicBreakSegData {
		return {
			type: 'thematic-break',
		}
	}
}
