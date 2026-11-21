import {
	AdapterName,
	SegData,
	type UnknownSegData,
} from '@renderer/function/adapter/interface'
import { Msg } from '@renderer/function/model/msg'
import { autoMarkRaw } from '@renderer/function/model/utils'

export const segType = {}
type SegCon<T extends Seg> = { new (...args: any[]): T; type: string }
export function registerSegType<T extends Seg>(segClass: SegCon<T>): void {
	segType[segClass.type] = segClass
}

export abstract class Seg {
	declare static readonly type: string
	declare static readonly inline: boolean

	constructor(public extra?: Record<string, Record<AdapterName, any>>) {}

	abstract plaintext(msg?: Msg): string

	abstract serializeData(): SegData

	abstract reedit(): (Seg | string)[]

	init?(): void | Promise<void>
	getImgData?(): { url: string; id: string } | undefined

	static parse(data: SegData): Seg {
		const type = data.type
		const SegClass = segType[type] || UnknownSeg
		return new SegClass(data)
	}

	get type(): string {
		return (this.constructor as typeof Seg).type
	}

	get inline(): boolean {
		return (this.constructor as typeof Seg).inline
	}

	toString(): string {
		return this.plaintext()
	}

	copy(): typeof this {
		return Seg.parse(this.serializeData()) as typeof this
	}
}

@autoMarkRaw
export class UnknownSeg extends Seg {
	static readonly type = 'unknown'
	static readonly inline = false
	private readonly _type: string
	data: object
	constructor(data: UnknownSegData) {
		super()
		this._type = data.segType
		this.data = data.data
	}

	get type(): string {
		return this._type
	}

	override reedit(): [UnknownSeg] {
		return [this]
	}

	plaintext(_?: Msg): string {
		return `[不支持的消息类型: ${this._type}]`
	}

	override serializeData(): UnknownSegData {
		return {
			type: 'unknown',
			segType: this._type,
			data: this.data,
			extra: this.extra,
		}
	}
}
