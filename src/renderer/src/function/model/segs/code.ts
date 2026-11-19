/*
 * @FileDescription: mdast Code 节点
 */
import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { CodeSegData } from '@renderer/function/adapter/interface'

@registerSegType
@autoMarkRaw
export class CodeSeg extends Seg {
	static readonly type = 'code'
	static readonly inline = false
	readonly content: string
	readonly lang: string

	constructor(data: CodeSegData) {
		super()
		this.content = data.content
		this.lang = data.lang
	}

	override plaintext(): string {
		return `\n\`\`\`\n${this.content}\n\`\`\`\n`
	}

	override reedit(): [string] {
		return [this.plaintext()]
	}

	override serializeData(): CodeSegData {
		return {
			type: 'code',
			content: this.content,
			lang: this.lang,
		}
	}
}
