import { autoMarkRaw } from '@renderer/function/model/utils'
import { Msg } from '@renderer/function/model/msg'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { PokeSegData } from '@renderer/function/adapter/interface'

@registerSegType
@autoMarkRaw
export class PokeSeg extends Seg {
	static readonly type = 'poke'
	static readonly inline = false
	constructor(_: PokeSegData) {
		super()
	}
	plaintext(_?: Msg): string {
		return '戳了戳你'
	}

	override reedit(): [PokeSeg] {
		return [this]
	}

	override serializeData(): PokeSegData {
		return {
			type: 'poke',
		}
	}
}
