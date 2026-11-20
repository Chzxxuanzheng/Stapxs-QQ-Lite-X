/*
 * @FileDescription: 用户 相关的模型
 * @Author: Mr.Lee
 * @Date: 2025/07/19
 * @Version: 1.0
 *           2.0
 * @Description: 提供模型定义和类型声明，用于处理用户相关的数据结构
 *               增加用户相关模型，而非仅局限于发送者
 */

import { MemberData, UserData } from '@renderer/function/adapter/interface'
import app from '@renderer/main'
import { Gender, Role } from '@renderer/function/adapter/enmu'
import { Name, Time } from '@renderer/function/model/data'
import { ProxyUrl } from '@renderer/function/model/proxyUrl'
import { UserSession } from '@renderer/function/model/session'
import { shallowRef, type ShallowRef } from 'vue'
import useRuntimeData from '@renderer/state/runtimeData'

/**
 * 信息不全,保底的
 */
export class User {
	user_id: string
	_avatar: ShallowRef<ProxyUrl>
	_nickname: Name
	_remark?: Name
	_longNick?: Name
	bot: boolean
	regTime: Time
	age: number
	sex: Gender
	class?: {
		id: string
		name: string
	}
	constructor(data: UserData) {
		this.user_id = data.id ?? '0'
		this._avatar = shallowRef(new ProxyUrl(data.avatar))
		this._nickname = new Name(data.nickname)
		if (data.remark) this._remark = new Name(data.remark)
		if (data.longNick) this._longNick = new Name(data.longNick)
		this.age = data.age
		this.regTime = new Time(data.regTime)
		this.sex = data.sex
		this.class = data.class
		this.bot = data.bot
	}

	upgrade(data: UserData, force = false) {
		for (const key in data) {
			if (key === 'id' || key === 'avatar') continue
			if (data[key] === undefined && !force) continue
			this[key] = data[key]
		}
		if (data.id !== undefined) this.user_id = data.id
		if (data.avatar !== undefined) this.avatar = data.avatar
	}

	get nickname(): Name | undefined {
		return this._nickname
	}

	get remark(): Name | undefined {
		return this._remark
	}

	get longNick(): Name | undefined {
		return this._longNick
	}

	set nickname(value: Name | string) {
		if (value instanceof Name) this._nickname = value
		else this._nickname = new Name(value)
	}

	set remark(value: Name | string) {
		if (value instanceof Name) this._remark = value
		else this._remark = new Name(value)
	}

	set longNick(value: Name | string) {
		if (value instanceof Name) this._longNick = value
		else this._longNick = new Name(value)
	}

	get avatar(): string {
		return this._avatar.value.url
	}

	set avatar(value: string | undefined) {
		this._avatar.value = new ProxyUrl(value ?? '')
	}

	get name(): string {
		return (
			this._remark?.toString() ??
			this._nickname?.toString() ??
			this._longNick?.toString() ??
			this.user_id.toString()
		)
	}

	get namePy(): string {
		const name =
			this._remark?.py ??
			this._nickname?.py ??
			this._longNick?.py ??
			this.user_id.toString()
		return name
	}

	match(search: string): boolean {
		search = search.trim().toLowerCase()
		if (this._nickname?.matchStr(search)) return true
		if (this._remark?.matchStr(search)) return true
		if (this._longNick?.matchStr(search)) return true
		if (this.user_id.toString().includes(search)) return true
		return false
	}

	serializeData(): UserData {
		return {
			id: this.user_id,
			avatar: this.avatar,
			nickname: this._nickname?.toString() ?? this.user_id.toString(),
			regTime: this.regTime.time,
			sex: this.sex,
			age: this.age,
			bot: this.bot,
			remark: this.remark?.toString(),
			longNick: this.longNick?.toString(),
			class: this.class,
		}
	}

	static createMe(): User {
		const runtimeData = useRuntimeData()
		return runtimeData.selfInfo!
	}
}

/**
 * 群成员
 */
export class Member extends User {
	_card?: Name
	join_time: Time
	last_sent_time: Time
	role: Role
	sex: Gender
	_title?: Name
	unfriendly: boolean
	/**
	 * 禁言到期时间
	 */
	_banTime?: number
	/**
	 * 对应的用户对象
	 */
	user?: UserSession
	/**
	 * 是否离开了群
	 */
	leave: boolean = false
	constructor(data: MemberData) {
		super(data)
		if (data.card) this._card = new Name(data.card)
		this.join_time = new Time(data.join_time)
		this.last_sent_time = new Time(data.last_sent_time)
		this.unfriendly = data.unfriendly
		if (data.nickname) this._nickname = new Name(data.nickname)
		if (data.title) this._title = new Name(data.title)
		this.user = data.id ? UserSession.getSessionById(data.id) : undefined
		if (data.banTime) {
			const banTime = data.banTime - Date.now() / 1000
			if (banTime > 0) this.setBanTime(banTime)
		}
		switch (data.role) {
			case 'owner':
				this.role = Role.Owner
				break
			case 'admin':
				this.role = Role.Admin
				break
			default:
				this.role = Role.User
				break
		}
		switch (data.sex) {
			case 'male':
				this.sex = Gender.Male
				break
			case 'female':
				this.sex = Gender.Female
				break
			default:
				this.sex = Gender.Unknown
				break
		}
	}

	private lastBanTimeoutId: number | undefined
	/**
	 * 设置禁言时间
	 * @param time 禁言时间 (s)
	 * @returns
	 */
	setBanTime(time: number): void {
		time *= 1000 // 转换为毫秒
		clearTimeout(this.lastBanTimeoutId)
		this._banTime = time + Date.now()
		this.lastBanTimeoutId = setTimeout(() => {
			this._banTime = undefined
		}, time) as unknown as number
	}
	/**
	 * 清除禁言时间
	 */
	clearBanTime(): void {
		clearTimeout(this.lastBanTimeoutId)
		this._banTime = undefined
	}

	/**
	 * 获取禁言剩余时间
	 */
	get banTime(): Time | undefined {
		if (!this._banTime) return undefined
		if (this._banTime < Date.now()) return undefined
		return new Time(this._banTime - Date.now())
	}

	get card(): Name | undefined {
		return this._card
	}

	get nickname(): Name | undefined {
		return this._nickname
	}

	get title(): Name | undefined {
		return this._title
	}

	set card(value: Name | string) {
		if (value instanceof Name) this._card = value
		else this._card = new Name(value)
	}

	set nickname(value: Name | string) {
		if (value instanceof Name) this._nickname = value
		else this._nickname = new Name(value)
	}

	set title(value: Name | string) {
		if (value instanceof Name) this._title = value
		else this._title = new Name(value)
	}

	get name(): string {
		const { $t } = app.config.globalProperties
		const name =
			this.user?.remark?.toString() ??
			this._card?.toString() ??
			this._nickname?.toString() ??
			this.user_id.toString()
		if (this.leave) return name + $t('(已离开)')
		return name
	}

	get namePy(): string {
		const name =
			this.user?.remark?.py ??
			this._card?.py ??
			this._nickname?.py ??
			this.user_id.toString()
		return name
	}

	/**
	 * 能否管理指定角色
	 * @param other 指定角色
	 * @returns
	 */
	canAdmin(other: Role): boolean {
		if (this.leave) return false
		return canAdmin(this.role, other)
	}

	/**
	 * 能否被指定角色管理
	 * @param other 指定角色
	 * @returns
	 */
	canBeAdmined(other: Role): boolean {
		if (this.leave) return false
		return canBeAdmined(this.role, other)
	}

	isAdmin(): boolean {
		if (this.leave) return false
		if (this.role === Role.Admin) return true
		if (this.role === Role.Owner) return true
		return false
	}

	match(search: string): boolean {
		search = search.trim().toLowerCase()
		if (this.leave) return false
		if (this.nickname?.matchStr(search)) return true
		if (this.card?.matchStr(search)) return true
		if (this._title?.matchStr(search)) return true
		if (this.user_id.toString().includes(search)) return true
		if (this.user?.match(search)) return true
		return false
	}

	/**
	 * 更新数据
	 * @param newData 新数据
	 */
	update(newData: Member): void {
		if (newData._card) this._card = newData._card
		if (newData._nickname) this._nickname = newData._nickname
		if (newData._title) this._title = newData._title
		this.join_time = newData.join_time
		this.last_sent_time = newData.last_sent_time
		this.role = newData.role
		if (newData._banTime) this._banTime = newData._banTime
	}

	serializeData(): UserData {
		const data = super.serializeData()
		data.nickname = this._card?.toString() ?? this._nickname.toString()
		return data
	}
}

function canAdmin(target: Role, other: Role): boolean {
	if (target === Role.Owner) return true
	if (target === Role.Admin) {
		if (other === Role.Owner) return false
		if (other === Role.Admin) return false
		return true
	}
	return false
}

function canBeAdmined(target: Role, other: Role): boolean {
	if (target === Role.Owner) return false
	if (target === Role.Admin) {
		if (other === Role.Owner) return true
		return false
	}
	if (other === Role.User) return false
	return true
}
