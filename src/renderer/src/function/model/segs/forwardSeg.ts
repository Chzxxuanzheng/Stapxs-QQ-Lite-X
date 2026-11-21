import { autoMarkRaw } from '@renderer/function/model/utils'
import { ForwardMsg, Msg } from '@renderer/function/model/msg'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { ForwardSegData } from '@renderer/function/adapter/interface'
import app from '@renderer/main'
import { Img } from '@renderer/function/model/img'
import { toRaw } from 'vue'

@registerSegType
@autoMarkRaw
export class ForwardSeg extends Seg {
	static readonly type = 'forward'
	static readonly inline = false
	id?: string
	content: Msg[]
	constructor(msgs?: Msg[])
	constructor(data: ForwardSegData)
	constructor(arg1?: Msg[] | ForwardSegData) {
		if (Array.isArray(arg1)) {
			const msgs = arg1
			super()
			this.content = msgs
		} else {
			const data = arg1 as ForwardSegData
			super(data?.extra)
			this.id = data.id
			this.content = data.content.map((item) => new ForwardMsg(item))
			// 图片拼装
			let tail: undefined | Img
			for (const msg of this.content) {
				if (msg.imgList.length === 0) continue
				const imgList = toRaw(msg.imgList)
				if (tail) {
					tail.concatNext(imgList.at(-1)!)
				}
				tail = imgList.at(0)
			}
		}
	}

	plaintext(_?: Msg): string {
		const { $t } = app.config.globalProperties
		return '[' + $t('合并转发') + ']'
	}

	get sending(): boolean {
		return this.id === undefined
	}

	override reedit(): [ForwardSeg] {
		return [this]
	}

	override serializeData(): ForwardSegData {
		if (!this.id) throw new Error('转发消息ID缺失')
		return {
			type: 'forward',
			id: this.id,
			content: this.content.map((item) =>
				(item as ForwardMsg).serializeNodeData(),
			),
			extra: this.extra,
		}
	}
}
