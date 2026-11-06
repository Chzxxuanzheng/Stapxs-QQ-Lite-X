/*
 * @FileDescription: 群公告相关的模型
 * @Author: Mr.Lee
 * @Date: 2025/07/28
 * @Version: 1.0
 * @Description: 群公告模型
 */

import { GroupAnnouncementData } from '../adapter/interface'
import { Time } from './data'
import { Img } from './img'
import { GroupSession } from './session'
import { BaseUser, IUser } from './user'

export class Ann {
	content: string
	img?: string
	time: Time
	sender: IUser
	session: GroupSession
	read?: boolean
	readNum?: number
	imgData?: Img

	constructor(data: GroupAnnouncementData, session: GroupSession) {
		this.content = data.content
		this.img = data.img
		this.time = new Time(data.time)
		this.read = data.is_read
		this.readNum = data.read_num
		this.session = session
		this.sender =
			this.session.getUserById(data.sender) ?? new BaseUser(data.sender)
		if (this.img) this.imgData = new Img(this.img)
	}

	match(search: string): boolean {
		if (this.sender.match(search)) return true
		if (this.content.includes(search)) return true
		return false
	}
}
