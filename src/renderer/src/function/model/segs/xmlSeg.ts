import { autoMarkRaw } from '@renderer/function/model/utils'
import { Msg } from '@renderer/function/model/msg'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { XmlSegData } from '@renderer/function/adapter/interface'

@registerSegType
@autoMarkRaw
export class XmlSeg extends Seg {
	static readonly type = 'xml'
	static readonly inline = false
	readonly data: string
	readonly id: string
	constructor(data: XmlSegData) {
		super(data.extra)
		this.data = data.data
		this.id = data.id
	}

	plaintext(_?: Msg): string {
		let name = this.data.substring(this.data.indexOf('<source name="') + 14)
		name = name.substring(0, name.indexOf('"'))
		return '[' + name + ']'
	}

	override reedit(): [XmlSeg] {
		return [this]
	}

	override serializeData(): XmlSegData {
		return {
			type: 'xml',
			data: this.data,
			id: this.id,
			extra: this.extra,
		}
	}
}
