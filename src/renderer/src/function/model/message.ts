/*
 * @FileDescription: Message 相关的模型
 * @Author: Mr.Lee
 * @Date: 2025/07/20
 * @Version: 1.0
 * @Description: 直接在消息栏上展示的模型
 */

import { Session } from '@renderer/function/model/session'
import { Time } from '@renderer/function/model/data'

export abstract class Message {
	/**
	 * 消息ID
	 * @description 项目内部使用唯一标识符时优先使用这个，不要用message_id
	 */
	abstract readonly type: string
	readonly uuid: string = crypto.randomUUID()
	abstract session?: Session
	abstract toMe: boolean
	abstract fromMe: boolean
	time?: Time
	constructor(data: { time?: number }) {
		if (data.time && !isNaN(data.time)) this.time = new Time(data.time)
	}

	abstract get preMsg(): string
}
