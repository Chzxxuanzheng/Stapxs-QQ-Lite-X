/*
 * @FileDescription: mdast Text 节点
 */
import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { TextSegData } from '@renderer/function/adapter/interface'

@registerSegType
@autoMarkRaw
export class TextSeg extends Seg {
	static readonly type = 'text'
	static readonly inline = true
	text: string

	constructor(data: TextSegData) {
		super(data.extra)
		this.text = data.text
	}

	override plaintext(): string {
		return this.text
	}

	override serializeData(): TextSegData {
		return {
			type: 'text',
			text: this.text,
			extra: this.extra,
		}
	}

	override reedit(): [string] {
		return [this.plaintext()]
	}

	static create(text: string): TextSeg {
		return new TextSeg({
			type: 'text',
			text,
		})
	}
}
