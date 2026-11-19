/*
 * @FileDescription: mdast InlineCode 节点
 */
import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { InlineCodeSegData } from '@renderer/function/adapter/interface'

@registerSegType
@autoMarkRaw
export class InlineCodeSeg extends Seg {
	static readonly type = 'inline-code'
	static readonly inline = true
	readonly content: string

	constructor(data: InlineCodeSegData) {
		super()
		this.content = data.content
	}

	override plaintext(): string {
		return `\`${this.content}\``
	}

	override reedit(): [string] {
		return [this.plaintext()]
	}

	override serializeData(): InlineCodeSegData {
		return {
			type: 'inline-code',
			content: this.content,
		}
	}
}
