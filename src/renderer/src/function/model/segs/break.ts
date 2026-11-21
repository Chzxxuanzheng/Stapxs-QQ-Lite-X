/*
 * @FileDescription: mdast Break 节点
 */
import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { BreakSegData } from '@renderer/function/adapter/interface'

@registerSegType
@autoMarkRaw
export class BreakSeg extends Seg {
	static readonly type = 'break'
	static readonly inline = true

	constructor(data: BreakSegData) {
		super(data.extra)
	}

	override plaintext(): string {
		return '\n'
	}

	override reedit(): [string] {
		return ['\n']
	}

	override serializeData(): BreakSegData {
		return {
			type: 'break',
			extra: this.extra,
		}
	}
}
