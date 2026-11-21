/*
 * @FileDescription: mdast Delete 节点
 */
import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type {
	DeleteSegData,
	SendMsgTextType,
} from '@renderer/function/adapter/interface'
import { Msg } from '@renderer/function/model/msg'

@registerSegType
@autoMarkRaw
export class DeleteSeg extends Seg {
	static readonly type = 'delete'
	static readonly inline = true
	readonly children: Seg[]

	constructor(data: DeleteSegData) {
		super(data.extra)
		this.children = data.children.map((child) => Seg.parse(child))
	}

	plaintext(msg?: Msg): string {
		return `~~${this.children.map((child) => child.plaintext(msg)).join('')}~~`
	}

	override reedit(ctx: Msg, type: SendMsgTextType): (string | Seg)[] {
		const out: (string | Seg)[] = []
		for (const child of this.children) {
			out.push(...child.reedit(ctx, type))
		}

		return ['~~', ...out, '~~']
	}

	serializeData(): DeleteSegData {
		return {
			type: 'delete',
			children: this.children.map((child) => child.serializeData()),
			extra: this.extra,
		}
	}
}
