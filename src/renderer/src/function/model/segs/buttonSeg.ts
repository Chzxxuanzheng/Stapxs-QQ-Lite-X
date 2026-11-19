/*
 * @FileDescription: mdast Blockquote 节点
 */
import { autoMarkRaw } from '@renderer/function/model/utils'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { ButtonSegData } from '@renderer/function/adapter/interface'
import { popInfo } from '@root/src/renderer/src/function/base'

@registerSegType
@autoMarkRaw
export class ButtonSeg extends Seg {
	static readonly type = 'button'
	static readonly inline = true
	name: string
	cmd: string

	constructor(data: ButtonSegData) {
		super()
		this.name = data.name
		this.cmd = data.cmd
	}

	click() {
		popInfo.info('按钮消息点击动作还没有做')
	}

	plaintext(): string {
		return `[按钮:${this.name}]`
	}

	override reedit(): [ButtonSeg] {
		return [this]
	}

	serializeData(): ButtonSegData {
		return {
			type: 'button',
			name: this.name,
			cmd: this.cmd,
		}
	}
}
