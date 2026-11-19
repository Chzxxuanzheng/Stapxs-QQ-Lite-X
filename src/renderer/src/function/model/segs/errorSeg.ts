import { autoMarkRaw } from '@renderer/function/model/utils'
import { Msg } from '@renderer/function/model/msg'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import app from '@renderer/main'
import { ErrorSegData } from '@renderer/function/adapter/interface'

@registerSegType
@autoMarkRaw
export class ErrorSeg extends Seg {
	static readonly type = 'error'
	static readonly inline = false

	plaintext(_?: Msg): string {
		const { $t } = app.config.globalProperties
		return $t('加载失败')
	}

	override reedit(): [ErrorSeg] {
		return [this]
	}

	override serializeData(): ErrorSegData {
		return {
			type: 'error',
		}
	}
}
