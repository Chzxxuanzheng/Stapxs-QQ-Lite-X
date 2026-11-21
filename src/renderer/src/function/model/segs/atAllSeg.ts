import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import app from '@renderer/main'
import type { AtAllSegData } from '@renderer/function/adapter/interface'

@registerSegType
@autoMarkRaw
export class AtAllSeg extends Seg {
	static readonly type = 'atall'
	static readonly inline = true
	constructor(data?: AtAllSegData) {
		super(data?.extra)
	}

	plaintext(): string {
		const { $t } = app.config.globalProperties
		return '@' + $t('所有人')
	}

	override reedit(): [AtAllSeg] {
		return [this]
	}

	override serializeData(): AtAllSegData {
		return {
			type: 'atall',
			extra: this.extra,
		}
	}
}
