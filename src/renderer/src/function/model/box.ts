/*
 * @FileDescription: Session 收纳盒
 * @Author: Mr.Lee
 * @Date: 2025/08/02
 * @Version: 1.0
 * @Description: 提供分组的收纳盒
 */

import { Name } from './data'
import {
	shallowReactive,
	ShallowReactive,
	shallowRef,
	ShallowRef,
	watchEffect,
	computed,
	ComputedRef,
} from 'vue'
import { Message } from './message'
import { GroupSession, Session } from './session'
import useRuntimeData from '@renderer/state/runtimeData'
import { Msg } from './msg'
import win from '@renderer/runtime/win'

// 对于会话而言，收纳盒是有序的，对于收纳盒，会话是无序的，所以不把content塞到这个表里
export interface SessionBoxData {
	id: string
	name: string
	icon: string
	color: number

	alwaysTop: boolean
}

export class SessionBox {
	readonly type = 'box'
	// 基础属性
	id: string = crypto.randomUUID()
	private readonly _name: ShallowRef<Name>
	private readonly _icon: ShallowRef<string>
	private readonly _color: ShallowRef<number>
	readonly content: Set<Session> = shallowReactive(new Set())
	// 设置
	private readonly _alwaysTop: ShallowRef<boolean> = shallowRef(false)

	// 缓存
	private readonly _preMessage: ComputedRef<Message | undefined> = computed(
		() => {
			let latestMsg: Message | undefined = undefined
			for (const session of this.content) {
				if (!session.preMessage) continue
				if (!latestMsg && !session.preMessage.time) {
					latestMsg = session.preMessage
					continue
				}
				if (!session.preMessage.time) continue
				if (!latestMsg?.time) {
					latestMsg = session.preMessage
					continue
				}
				if (
					latestMsg.time &&
					session.preMessage.time.time <= latestMsg.time.time
				)
					continue
				latestMsg = session.preMessage
			}
			return latestMsg
		},
	)
	private readonly _highlightInfo: ComputedRef<string[]> = computed(() => {
		const out: string[] = []
		for (const session of this.content) {
			// 过滤置顶会话
			for (const info of session.highlightInfo) {
				if (out.includes(info)) continue
				out.push(info)
			}
		}
		return out
	})
	private readonly _showNotice: ComputedRef<boolean> = computed(() => {
		// 如果有置顶会话，则不显示通知
		for (const session of this.content) {
			if (session.alwaysTop) continue
			if (session.showNotice) return true
		}
		return false
	})
	_newMsg: ComputedRef<number> = computed(() => {
		let out = 0
		for (const session of this.content) out += session.newMsg
		return out
	})
	_isActive: ComputedRef<boolean> = computed(() => {
		// 如果有置顶会话，则不显示通知
		for (const session of this.content) {
			if (session.isActive) return true
		}
		return false
	})

	// 静态缓存
	static sessionBoxes: ShallowReactive<SessionBox[]> = shallowReactive([])
	static alwaysTopBoxes: ShallowReactive<Set<SessionBox>> = shallowReactive(
		new Set(),
	)
	constructor(name: string, icon: string, color: number) {
		this._name = shallowRef(new Name(name))
		this._icon = shallowRef(icon)
		this._color = shallowRef(color)

		// 显示的内容排序
		watchEffect(() => {
			this.sortContent()
		})
	}

	//#region == 静态工具 ==============================================================
	/**
	 * 保存新的收纳盒
	 * @param box 新盒子
	 */
	static addBox(box: SessionBox): void {
		SessionBox.sessionBoxes.push(shallowReactive(box))
		SessionBox.saveData()
	}
	/**
	 * 清空收纳盒
	 */
	static clear(): void {
		SessionBox.sessionBoxes.length = 0
		SessionBox.alwaysTopBoxes.clear()
	}
	static getBoxById(id: string): SessionBox | undefined {
		return this.sessionBoxes.find((box) => box.id === id)
	}
	//#endregion

	//#region == 保存加载 ==============================================================
	/**
	 * 从缓存数据里读取
	 */
	static parse(data: SessionBoxData): SessionBox {
		const box = new SessionBox(data.name, data.icon, data.color)
		box.id = data.id

		// 设置属性
		box.setAlwaysTop(data.alwaysTop, false)

		// 记录到缓存里
		this.sessionBoxes.push(shallowReactive(box))
		return box
	}
	/**
	 * 加载所有的收纳盒
	 * @returns
	 */
	static load(): void {
		const runtimeData = useRuntimeData()
		// 读取所有的收纳盒
		for (const box of runtimeData.sysConfig.boxes) {
			this.parse(box)
		}

		// 读取群组对应的收纳盒
		for (const sessionId in runtimeData.sysConfig.session_box_map) {
			const session = Session.getSessionById(Number(sessionId))
			if (!session) continue
			for (const boxId of runtimeData.sysConfig.session_box_map[
				sessionId
			]) {
				const box = this.getBoxById(boxId)
				if (!box) continue
				box.putSession(session)
			}
		}
	}
	/**
	 * 保存当前收纳盒的状态
	 */
	static saveData(): void {
		const runtimeData = useRuntimeData()
		// 检查前提条件
		if (!runtimeData.loginInfo?.uin) return

		// 保存收纳盒数据
		runtimeData.sysConfig.boxes = this.sessionBoxes.map((box) =>
			box.toData(),
		)
		// 保存群组对应收纳盒数据
		const data = {}
		for (const session of Session.sessionList) {
			if (session.boxes.length === 0) continue
			data[session.id] = session.boxes.map((box) => box.id)
		}

		runtimeData.sysConfig.session_box_map = data
	}
	/**
	 * 将自身转化为往配置文件存储的数据
	 * @returns
	 */
	toData(): SessionBoxData {
		return {
			id: this.id,
			name: this._name.value.toString(),
			icon: this._icon.value,
			color: this._color.value,
			alwaysTop: this.alwaysTop,
		}
	}
	//#endregion

	//#region == 设置相关 ==============================================================
	setAlwaysTop(value: boolean, saveCfg: boolean = true): void {
		this.alwaysTop = value

		// 更新缓存列表
		if (value && !SessionBox.alwaysTopBoxes.has(this))
			SessionBox.alwaysTopBoxes.add(this)
		else if (!value && SessionBox.alwaysTopBoxes.has(this))
			SessionBox.alwaysTopBoxes.delete(this)

		if (!saveCfg) return
		SessionBox.saveData()
	}
	//#endregion

	//#region == 管理会话 ==============================================================
	/**
	 * 设置为已读状态
	 */
	setRead(from: 'viewer' | 'sender' | 'cmd'): void {
		for (const s of this.content) {
			s.setRead(from)
		}
	}
	/**
	 * 卸载
	 */
	unactive(): void {
		for (const session of this.content) session.unactive()
	}
	/**
	 * 将会话加入到收纳盒
	 * @param session 放入的会话
	 */
	putSession(session: Session): void {
		if (this.content.has(session)) return
		const runtimeData = useRuntimeData()
		// 加入到收纳盒
		this.content.add(session)
		session.addBox(this)

		// 自动离开群收纳盒
		if (runtimeData.sysConfig.bubble_sort_user && session.type === 'group')
			BubbleBox.instance.removeSession(session)
	}
	/**
	 * 将会话从收纳盒中移除
	 * @param session 会话
	 * @returns
	 */
	removeSession(session: Session): void {
		// 离开收纳盒
		if (!this.content.has(session)) return
		const runtimeData = useRuntimeData()
		this.content.delete(session)
		session.leaveBox(this)
		// 更新当前收纳盒
		if (
			runtimeData.nowChat?.id === session.id &&
			runtimeData.nowBox?.id === this.id
		)
			runtimeData.nowBox = undefined

		if (
			runtimeData.sysConfig.bubble_sort_user &&
			session.type === 'group' &&
			session.boxes.length === 0
		)
			BubbleBox.instance.putSession(session)
	}
	//#endregion

	// 杂项
	/**
	 * 删除自身
	 * @returns
	 */
	remove(): void {
		const id = SessionBox.sessionBoxes.findIndex(
			(box) => box.id === this.id,
		)
		if (id === -1) return
		// 从缓存中删除
		SessionBox.sessionBoxes.splice(id, 1)
		// 清空会话
		for (const session of this.content) this.removeSession(session)
		// 保存数据
		SessionBox.saveData()
	}

	match(query: string): boolean {
		return this._name.value.matchStr(query)
	}

	get showName(): string {
		return this._name.value.toString()
	}

	get showNamePy(): string {
		return this._name.value.py
	}

	get name(): string {
		return this._name.value.toString()
	}

	set name(value: string) {
		this._name.value = new Name(value)
	}

	get icon(): string {
		return this._icon.value
	}

	set icon(value: string) {
		this._icon.value = value
	}

	get color(): string {
		if (win.darkMode) return `hsl(${this._color.value}deg, 50%, 35%)`
		return `hsl(${this._color.value}deg, 50%, 90%)`
	}

	set color(value: number) {
		this._color.value = value
	}

	get alwaysTop(): boolean {
		return this._alwaysTop.value
	}

	set alwaysTop(value: boolean) {
		this._alwaysTop.value = value
	}

	get preMessage(): Message | undefined {
		return this._preMessage.value
	}

	get highlightInfo(): string[] {
		return this._highlightInfo.value
	}

	get showNotice(): boolean {
		return this._showNotice.value
	}

	private readonly _sortContentByName: ShallowRef<Session[]> = shallowRef([])
	private readonly _sortContentByTime: ShallowRef<Session[]> = shallowRef([])

	get sortContentByName(): Session[] {
		return this._sortContentByName.value
	}
	get sortContentByTime(): Session[] {
		return this._sortContentByTime.value
	}

	get newMsg(): number {
		return this._newMsg.value
	}

	get length(): number {
		return this.content.size
	}

	get isActive(): boolean {
		return this._isActive.value
	}

	get preMsg(): string {
		if (!this.preMessage) return ''
		let txt: string
		if (this.preMessage instanceof Msg) txt = this.preMessage.plaintext()
		else txt = this.preMessage.preMsg
		return this.preMessage.session?.showName + ':' + txt
	}

	private sortContent(): void {
		this._sortContentByName.value = [...this.content].sort((a, b) =>
			a.showNamePy.localeCompare(b.showNamePy),
		)
		this._sortContentByTime.value = [...this.content].sort((a, b) => {
			if (!a.preMessage?.time && b.preMessage?.time) return 1
			if (a.preMessage?.time && !b.preMessage?.time) return -1
			if (a.preMessage?.time && b.preMessage?.time) {
				return b.preMessage.time.time - a.preMessage.time.time
			}
			return a.showNamePy.localeCompare(b.showNamePy)
		})
	}
}

export class BubbleBox extends SessionBox {
	static instance: BubbleBox = new BubbleBox()
	// 这玩意里的元素都是激活的，按照里面有没有元素算就行了
	override _isActive: ComputedRef<boolean> = computed(() => {
		return this.content.size > 0
	})

	protected constructor() {
		super('群收纳盒', 'user-group', 0)
		SessionBox.sessionBoxes.pop() // 给自己删了

		setTimeout(() => {
			const runtimeData = useRuntimeData()
			// 添加到群收纳盒
			Session.afterActiveHook.push((session: Session) => {
				if (!runtimeData.sysConfig.bubble_sort_user) return
				if (session.alwaysTop) return
				if (session.boxes.length > 0) return
				if (!(session instanceof GroupSession)) return
				this.putSession(session)
			})

			// 卸载时移除
			Session.afterUnactiveHook.push((session: Session) => {
				if (this.content.has(session)) this.removeSession(session)
			})
		}, 0)
	}

	/**
	 * 将会话加入到收纳盒
	 * @param session 放入的会话
	 */
	override putSession(session: Session): void {
		if (this.content.has(session)) return
		// 加入到收纳盒
		this.content.add(session)
		session.addBox(this)
	}

	/**
	 * 将会话从收纳盒中移除
	 * @param session 会话
	 * @returns
	 */
	override removeSession(session: Session): void {
		// 离开收纳盒
		if (!this.content.has(session)) return
		this.content.delete(session)
		session.leaveBox(this)
	}

	override get color(): string {
		return 'var(--color-card-2)'
	}

	override set color(_: number) {
		// 不允许修改颜色
		throw new Error('群收纳盒禁止修改颜色')
	}
}
