/*
 * @FileDescription: Session 相关的模型
 * @Author: Mr.Lee
 * @Date: 2025/07/15
 * @Version: 1.0
 *           2.0
 * @Description: 聊天上下文模型,目前仅用在提供消息信息上了
 *               用于会话，而非单纯的消息来源
 */

import app, { nowTimes } from '@renderer/main'
import {
	ComputedRef,
	ShallowRef,
	computed,
	shallowReactive,
	shallowRef,
} from 'vue'
import { Role } from '../adapter/enmu'
import { SessionData } from '../adapter/interface'
import { logger, popInfo } from '../base'
import useRuntimeData from '@renderer/state/runtimeData'
import { Notify } from '../notify'
import { queueWait } from '../utils/baseUtil'
import { Ann } from './ann'
import { SessionBox } from './box'
import { Name } from './data'
import { GroupFile, GroupFileFolder } from './file'
import { Img } from './img'
import { Message } from './message'
import { EssenceMsg, Msg } from './msg'
import { SystemNotice } from './notice'
import { ProxyUrl } from './proxyUrl'
import { BaseUser, IUser, Member, User } from './user'
import { autoMarkRaw } from './utils'
import { InputMsg } from './inputMsg'

export type VoidReturn = void | Promise<void>

export type SessionType = 'group' | 'user' | 'temp'

/**
 * 会话基类
 * 早期写的代码，对响应式对象理解不到位
 */
export abstract class Session {
	// 基本信息
	abstract type: SessionType
	abstract sessionClass: SessionClass
	id: number
	_name: Name
	protected abstract _face: ComputedRef<string>
	// 消息列表相关
	readonly messageList: Message[] = shallowReactive([])
	imgHead: Img | undefined
	imgTail: Img | undefined
	private readonly _newMsg = shallowRef(0)
	headMsg?: Msg
	private readonly _preMessage = shallowRef<undefined | Message>()
	// 输入信息
	inputMsg: InputMsg = new InputMsg(this)
	// 设置
	private readonly _alwaysTop = shallowRef(false)
	// 额外信息
	appendInfo?: string
	// 高亮信息
	readonly highlightInfo: string[] = shallowReactive([])
	private readonly _showNotice = shallowRef(false)
	// 分组盒子
	boxes: SessionBox[] = []

	// 内部信息
	// 已有会话列表
	/**
	 * 是否激活
	 * 激活会在message里显示，且会调用获取历史记录等API
	 */
	_isActive: ShallowRef<boolean> = shallowRef(false)
	// 缓存
	/**
	 * 会话列表
	 */
	static readonly sessionList: Session[] = shallowReactive([])
	/**
	 * 置顶列表
	 */
	static readonly alwaysTopSessions: Set<Session> = shallowReactive(
		new Set(),
	) as unknown as Set<Session>
	/**
	 * 激活会话列表
	 */
	static readonly activeSessions: Set<Session> = shallowReactive(
		new Set(),
	) as unknown as Set<Session>

	constructor(id: number, name: string) {
		this.id = id
		this._name = new Name(name)
		Session.sessionList.push(this)
	}

	//#region == 激活会话 ==============================================================
	private activePromise?: Promise<void>
	/**
	 * 激活会话
	 */
	async activate(): Promise<void> {
		if (this.activePromise) return await this.activePromise
		this.activePromise = this._activate()
		return await this.activePromise
	}
	private async _activate() {
		if (this.isActive) return

		await this.runHook('beforeActiveHook')

		await this.prepareActive()
		this.isActive = true
		Session.activeSessions.add(this)

		await this.runHook('afterActiveHook')
	}
	/**
	 * 准备激活会话
	 */
	abstract prepareActive(): Promise<void>
	/**
	 * 卸载
	 */
	unactive() {
		this.runHook('beforeUnactiveHook')
		this.messageList.length = 0
		this.imgHead = undefined
		this.imgTail = undefined
		this.headMsg = undefined
		this.preMessage = undefined
		this.highlightInfo.length = 0
		this.isActive = false
		this.newMsg = 0
		this.showNotice = false
		this.loadHistoryLock.value = undefined
		this.lastLoadFailFlag.value = false
		this.canLoadMoreHistory.value = true
		this.inputMsg.clear()
		this.activePromise = undefined
		Session.activeSessions.delete(this)
		this.prepareUnactive()
		this.runHook('afterUnactiveHook')
	}
	abstract prepareUnactive(): void
	//#endregion

	//#region == 抽象方法 ==============================================================
	/**
	 * 是否在搜索时被匹配
	 * @param str 搜索内容
	 */
	abstract match(str: string): boolean
	/**
	 * 通过id获取用户
	 * @param id  用户id
	 */
	abstract getUserById(id: number): IUser | undefined
	//#endregion

	//#region == 静态工具 ==============================================================
	/**
	 * 通过id获取会话
	 * @param id 会话id
	 * @returns 会话实例
	 */
	static getSessionById(id: number): Session | undefined {
		return Session.sessionList.find((item) => item.id === id)
	}

	/**
	 * 获得会话。没有的临时会话会创建，群聊和私聊会抛异常
	 * @param data 会话数据
	 */
	static getSession(data: SessionData): Session
	/**
	 * 获得会话。没有的临时会话会创建，群聊和私聊会抛异常
	 * @param type 会话类型
	 * @param id 会话id
	 * @param group_id 临时会话的群id
	 */
	static getSession(type: SessionType, id: number, group_id?: number): Session
	static getSession(
		arg1: SessionType | SessionData,
		arg2?: number,
		arg3?: number,
	): Session {
		if (!arg2) {
			const data = arg1 as SessionData
			return Session.getSession(data.type, data.id, data.group_id)
		}
		const type = arg1 as SessionType
		const id = arg2
		const group_id = arg3
		let session: Session | undefined
		switch (type) {
			case 'group':
				session = GroupSession.getSessionById(id)
				if (!session) throw new Error(`群组 ${id} 不存在`)
				break
			case 'user':
				session = UserSession.getSessionById(id)
				if (!session) throw new Error(`用户 ${id} 不存在`)
				break
			case 'temp':
				session = TempSession.getSessionById(id)
				if (!session) {
					if (group_id === undefined)
						throw new Error('临时会话需要指定群组id')
					session = new TempSession(id, group_id)
				}
				break
			default:
				throw new Error(`未知的会话类型 ${type}`)
		}
		return session
	}

	/**
	 * 清空会话列表
	 */
	static clear(): void {
		// 取消激活
		for (const session of Session.activeSessions) session.unactive()

		Session.sessionList.length = 0
		Session.alwaysTopSessions.clear()
		GroupSession.sessionList.length = 0
		UserSession.sessionList.length = 0
		TempSession.sessionList.length = 0
		SessionClass.clear()
	}
	//#endregion

	//#region == 设置相关 ==============================================================

	/**
	 * 设置置顶
	 * @param flag 是否置顶
	 * @param saveCfg 是否写入配置
	 */
	setAlwaysTop(flag: boolean, saveCfg: boolean = true): void {
		this.alwaysTop = flag
		const runtimeData = useRuntimeData()
		// 更新置顶列表
		if (flag && !Session.alwaysTopSessions.has(this))
			Session.alwaysTopSessions.add(this)
		else if (!flag && Session.alwaysTopSessions.has(this))
			Session.alwaysTopSessions.delete(this)

		if (!saveCfg) return
		if (flag) {
			if (runtimeData.sysConfig.pin_sessions.includes(this.id)) return
			runtimeData.sysConfig.pin_sessions = [
				...runtimeData.sysConfig.pin_sessions,
				this.id,
			]
		} else {
			if (!runtimeData.sysConfig.pin_sessions.includes(this.id)) return
			runtimeData.sysConfig.pin_sessions =
				runtimeData.sysConfig.pin_sessions.filter((i) => i !== this.id)
		}
	}
	//#endregion

	//#region == 消息相关 ==============================================================
	/**
	 * 新增消息
	 * @param msg 消息
	 */
	async addMessage(msg: Message) {
		await queueWait(
			this._addMessage(msg),
			`addMessage-${this.type}-${this.id}`,
			10000,
		)
	}
	private async _addMessage(msg: Message) {
		const runtimeData = useRuntimeData()
		// 过滤空消息
		if (
			msg instanceof Msg &&
			runtimeData.sysConfig.hide_empty_msg &&
			msg.message.length === 0
		) {
			return
		}
		let beforeActive = false
		// 激活消息
		if (!this.isActive) {
			beforeActive = true
			await this.activate()
		}

		const lastMsg = this.messageList.at(-1)

		// 去重
		if (
			msg instanceof Msg &&
			lastMsg instanceof Msg &&
			lastMsg.message_id === msg.message_id
		) {
			// 第一条消息钩子缺失的补偿
			if (beforeActive) {
				this.runHook('beforeNewMessageHook', msg)
				this.runHook('afterNewMessageHook', msg)
			}
			return
		}

		// 消息其他处理
		try {
			let timeout: ReturnType<typeof setTimeout>
			const timeoutPromise = new Promise<void>((_, reject) => {
				timeout = setTimeout(
					() => reject(new Error('添加消息超时')),
					10000,
				)
			})

			const mainPromise = async () => {
				if (!this.isActive) await this.activate()
				this.runHook('beforeNewMessageHook', msg)
				this.imgFromNewMsg(msg)
				clearTimeout(timeout)
			}
			await Promise.race([mainPromise(), timeoutPromise])
		} catch (e) {
			logger.error(e as Error, '添加消息失败')
		}

		// 保存消息
		this.messageList.push(msg)
		this.refreshPreMsg()
		if (
			msg instanceof Msg &&
			msg.sender.user_id !== runtimeData.loginInfo?.uin
		)
			this.newMsg++

		this.runHook('afterNewMessageHook', msg)
	}

	private readonly loadHistoryLock: ShallowRef<number | undefined> =
		shallowRef(undefined)
	private readonly lastLoadFailFlag: ShallowRef<boolean> = shallowRef(false)
	private readonly canLoadMoreHistory: ShallowRef<boolean> = shallowRef(true)
	/**
	 * 加载历史
	 * @returns 是否加载成功
	 */
	async loadHistory(): Promise<boolean> {
		if (this.loadHistoryLock.value) return false
		if (!this.canLoadMoreHistory.value) return false
		const selfId = Date.now()
		this.loadHistoryLock.value = selfId

		const { $t } = app.config.globalProperties
		const runtimeData = useRuntimeData()
		// 过滤不支持的适配器
		if (!runtimeData.nowAdapter?.getHistoryMsg) {
			this.lastLoadFailFlag.value = true
			this.messageList.unshift(
				SystemNotice.info(
					runtimeData.nowAdapter?.name + $t('不支持获取历史记录'),
				),
			)
			return false
		}
		try {
			await this.runHook('beforeLoadHistoryHook')

			// 调API
			const data = await runtimeData.nowAdapter.getHistoryMsg(
				this,
				20,
				this.headMsg,
			)

			// 中断处理
			if (this.loadHistoryLock.value !== selfId) return false

			// 处理消息
			if (!data) throw new Error('获取历史记录失败')
			let msgs: Message[]
			if (data.length === 0) {
				this.canLoadMoreHistory.value = false
				msgs = []
			} else {
				msgs = data.map((item) => new Msg(item))
			}

			this.imgFromHistory(msgs)
			// 合并消息列表
			this.messageList.unshift(...msgs)

			// 重设headMsg
			this.headMsg = <Msg>msgs[0]

			await this.runHook(
				'afterLoadHistoryHook',
				this.canLoadMoreHistory.value ? 'success' : 'end',
				msgs,
			)
		} catch (e) {
			await this.runHook('afterLoadHistoryHook', 'fail', [])
			logger.error(e as Error, '加载历史消息失败')
			this.lastLoadFailFlag.value = true
			popInfo.error(app.config.globalProperties.$t('获取历史记录失败'))
			this.loadHistoryLock.value = undefined
			return false
		}
		this.loadHistoryLock.value = undefined
		return true
	}

	get loadHistoryState(): 'loading' | 'fail' | 'end' | 'normal' {
		if (this.loadHistoryLock.value) return 'loading'
		if (this.lastLoadFailFlag.value) return 'fail'
		if (!this.canLoadMoreHistory.value) return 'end'
		return 'normal'
	}

	/**
	 * 刷新预览消息
	 */
	refreshPreMsg(): void {
		const runtimeData = useRuntimeData()
		for (let i = this.messageList.length - 1; i >= 0; i--) {
			const msg = this.messageList[i]
			// 启用预览通知
			if (runtimeData.sysConfig.preview_notice) {
				if (msg instanceof SystemNotice) continue
			} else if (!(msg instanceof Msg)) continue
			this.preMessage = msg
			break
		}
	}

	/**
	 * 设为已读消息
	 * @param from 触发来源
	 * @param msgId 消息id
	 */
	async setRead(
		from: 'viewer' | 'sender' | 'cmd',
		targetMsg?: Msg,
	): Promise<void> {
		this.showNotice = false
		this.highlightInfo.length = 0
		// 关闭该会话所有通知
		new Notify().closeAll(this.id.toString())
		// 避免频繁调用...昨天吃警告了.tx竟然没给我踹下去
		if (this.newMsg === 0) return
		this.newMsg = 0

		if (!targetMsg) {
			for (const msg of this.messageList) {
				if (msg instanceof Msg) {
					targetMsg = msg
					break
				}
			}
		}

		if (!targetMsg) return

		await this.runHook('beforeSetReadHook')

		const runtimeData = useRuntimeData()

		// 调用api
		// 过滤设置
		if (
			from === 'viewer' &&
			runtimeData.sysConfig.auto_mark_read !== 'viewer'
		)
			return
		if (
			from === 'sender' &&
			runtimeData.sysConfig.auto_mark_read === 'none'
		)
			return
		await runtimeData.nowAdapter?.setMsgReaded?.(this, targetMsg)
		await this.runHook('afterSetReadHook')
	}

	/**
	 * 删除消息
	 */
	async removeMsg(msg: Msg) {
		const index = this.messageList.indexOf(msg)
		if (index < 0) return
		await this.runHook('beforeRmMessageHook', msg)
		this.messageList.splice(index, 1)
		this.removeImgList(msg.imgList)
		await this.runHook('afterRmMessageHook', msg)
	}

	/**
	 * 根据 message_id 查找消息
	 * @param message_id
	 */
	getMsgById(message_id: string): Msg | undefined {
		return this.messageList.find((msg) => {
			if (!(msg instanceof Msg)) return false
			return msg.message_id === message_id
		}) as Msg | undefined
	}
	//#endregion

	//#region == 钩子相关 ==============================================================
	// 我为啥要写这东西?我自己也不知道...照着nb抄着抄着就有这东西了...
	// 激活
	static readonly beforeActiveHook: ((session: Session) => VoidReturn)[] = []
	readonly beforeActiveHook: ((session: Session) => VoidReturn)[] = []
	static readonly afterActiveHook: ((session: Session) => VoidReturn)[] = []
	readonly afterActiveHook: ((session: Session) => VoidReturn)[] = []
	// 取消激活
	static readonly beforeUnactiveHook: ((session: Session) => VoidReturn)[] =
		[]
	readonly beforeUnactiveHook: ((session: Session) => VoidReturn)[] = []
	static readonly afterUnactiveHook: ((session: Session) => VoidReturn)[] = []
	readonly afterUnactiveHook: ((session: Session) => VoidReturn)[] = []
	// 新消息
	static readonly beforeNewMessageHook: ((
		session: Session,
		msg: Message,
	) => VoidReturn)[] = []
	readonly beforeNewMessageHook: ((
		session: Session,
		msg: Message,
	) => VoidReturn)[] = []
	static readonly afterNewMessageHook: ((
		session: Session,
		msg: Message,
	) => VoidReturn)[] = []
	readonly afterNewMessageHook: ((
		session: Session,
		msg: Message,
	) => VoidReturn)[] = []
	// 历史消息加载
	static readonly beforeLoadHistoryHook: ((
		session: Session,
	) => VoidReturn)[] = []
	readonly beforeLoadHistoryHook: ((session: Session) => Promise<void>)[] = []
	static readonly afterLoadHistoryHook: ((
		session: Session,
		state: 'success' | 'fail' | 'end',
		msgs: Message[],
	) => VoidReturn)[] = []
	readonly afterLoadHistoryHook: ((
		session: Session,
		state: 'success' | 'fail' | 'end',
		msgs: Message[],
	) => VoidReturn)[] = []
	// 删除消息钩子
	static readonly beforeRmMessageHook: ((
		session: Session,
		msg: Msg,
	) => VoidReturn)[] = []
	readonly beforeRmMessageHook: ((
		session: Session,
		msg: Msg,
	) => VoidReturn)[] = []
	static readonly afterRmMessageHook: ((
		session: Session,
		msg: Msg,
	) => VoidReturn)[] = []
	readonly afterRmMessageHook: ((
		session: Session,
		msg: Msg,
	) => VoidReturn)[] = []
	// 设置已读消息钩子
	static readonly beforeSetReadHook: ((session: Session) => VoidReturn)[] = []
	readonly beforeSetReadHook: ((session: Session) => VoidReturn)[] = []
	static readonly afterSetReadHook: ((session: Session) => VoidReturn)[] = []
	readonly afterSetReadHook: ((session: Session) => VoidReturn)[] = []
	/**
	 * 执行钩子
	 * @param hookList 钩子列表
	 * @param args 参数
	 */
	async runHook(
		hookNames: 'beforeActiveHook' | 'afterActiveHook',
	): Promise<void>
	async runHook(
		hookNames: 'beforeUnactiveHook' | 'afterUnactiveHook',
	): Promise<void>
	async runHook(
		hookNames: 'beforeNewMessageHook' | 'afterNewMessageHook',
		msg: Message,
	): Promise<void>
	async runHook(hookNames: 'beforeLoadHistoryHook'): Promise<void>
	async runHook(
		hookNames: 'afterLoadHistoryHook',
		state: 'success' | 'fail' | 'end',
		msgs: Message[],
	): Promise<void>
	async runHook(
		hookNames: 'beforeRmMessageHook' | 'afterRmMessageHook',
		msg: Msg,
	): Promise<void>
	async runHook(
		hookNames: 'beforeSetReadHook' | 'afterSetReadHook',
	): Promise<void>
	async runHook(hookNames: string, ...args: any[]): Promise<void> {
		const tasks: Promise<any>[] = []
		const hooks: ((...args: any[]) => void | Promise<void>)[] = [
			...this[hookNames],
			...Session[hookNames],
		] as any
		for (const hook of hooks) {
			const task = hook(this, ...args)
			if (task instanceof Promise) tasks.push(task)
		}
		await Promise.all(tasks)
	}
	//#endregion

	//#region == 发送相关 ==============================================================
	/**
	 * 组装发送参数
	 */
	abstract createSendParam(): { user_id?: number; group_id?: number }
	/**
	 * 获取发送API
	 * @param merge 是否拿去合并转发api
	 */
	abstract getSendApi(merge?: boolean): string
	//#endregion

	//#region == 图片更新 ==============================================================
	private imgFromNewMsg(msg: Message): void {
		if (!(msg instanceof Msg)) return
		const imgList = msg.imgList
		if (imgList.length === 0) return
		if (!this.imgHead || !this.imgTail) {
			this.imgHead = imgList.at(0)
			this.imgTail = imgList.at(-1)
		} else {
			this.imgTail.concatNext(imgList.at(0)!)
			this.imgTail = imgList.at(-1)
		}
	}
	private imgFromHistory(msgs: Message[]): void {
		for (const msg of [...msgs].reverse()) {
			if (!(msg instanceof Msg)) continue
			if (msg.imgList.length === 0) continue
			const imgList = msg.imgList
			if (!this.imgHead || !this.imgTail) {
				this.imgHead = imgList.at(0)
				this.imgTail = imgList.at(-1)
			} else {
				this.imgHead.concatPrev(imgList.at(-1)!)
				this.imgHead = imgList.at(0)
			}
		}
	}
	/**
	 * 自身消息更新图片列表用
	 */
	updateImgList(oldData: Img[], newData: Img[]): void {
		if (oldData.length === 0 && newData.length !== 0)
			throw new Error('旧数据不能为空')

		const head = oldData.at(0)!.prev
		const tail = newData.at(-1)!.next
		this.removeImgList(oldData)
		if (head) {
			head.extendNext(newData.at(0)!)
			if (!this.imgTail || this.imgTail === head)
				this.imgTail = newData.at(-1)!
		} else if (tail) {
			tail.extendPrev(oldData.at(-1)!)
			if (!this.imgHead || this.imgHead === tail)
				this.imgHead = newData.at(0)!
		}
	}
	/**
	 * 删除图片
	 * @param imgs 消息段
	 * @returns
	 */
	removeImgList(imgs: Img[]): void {
		for (const img of imgs) {
			if (img === this.imgHead) this.imgHead = img.next
			if (img === this.imgTail) this.imgTail = img.prev
			img.delete()
		}
	}
	//#endregion

	/**
	 * 获取自身成员对象(群组未激活返回 undefined)
	 * @returns 自身成员对象
	 */
	getMe(): IUser {
		return BaseUser.createMe()
	}

	/**
	 * 获取用户信息,拿不到拿id创建一个BaseUser保底
	 * @param id
	 */
	getUserByIdWithBu(id: number): IUser {
		const user = this.getUserById(id)
		if (user) return user
		return BaseUser.createById(id)
	}

	/**
	 * 加入到收纳盒
	 * @param box
	 * @returns
	 */
	addBox(box: SessionBox): void {
		if (this.boxes.includes(box)) return
		this.boxes.push(box)
	}

	/**
	 * 离开收纳盒
	 * @param box
	 * @returns
	 */
	leaveBox(box: SessionBox): void {
		const index = this.boxes.findIndex((b) => b.id === box.id)
		if (index < 0) return
		this.boxes.splice(index, 1)
	}

	get showName(): string {
		return this._name.toString()
	}

	get showNamePy(): string {
		return this._name.py.replaceAll(/[\u202A-\u202E\u2066-\u2069]/g, '')
	}

	get isActive(): boolean {
		return this._isActive.value
	}

	protected set isActive(active: boolean) {
		this._isActive.value = active
	}

	get name(): Name {
		return this._name
	}

	get face(): string {
		// 用来解决vue自动解包的
		if (typeof this._face === 'string') return this._face
		return this._face.value
	}

	set name(name: string | Name) {
		if (name instanceof Name) this._name = name
		else this._name = new Name(name)
	}

	get newMsg(): number {
		return this._newMsg.value
	}

	set newMsg(num: number) {
		if (num < 0) num = 0
		this._newMsg.value = num
	}

	get preMessage(): Message | undefined {
		return this._preMessage.value
	}

	set preMessage(value: Message | undefined) {
		this._preMessage.value = value
	}

	get alwaysTop(): boolean {
		return this._alwaysTop.value
	}

	set alwaysTop(flag: boolean) {
		this._alwaysTop.value = flag
	}

	get showNotice(): boolean {
		return this._showNotice.value
	}

	set showNotice(flag: boolean) {
		this._showNotice.value = flag
	}
}

// TODO: 群头衔
@autoMarkRaw
export class GroupSession extends Session {
	override type = 'group' as const
	override sessionClass: SessionClass
	static readonly sessionList: GroupSession[] = shallowReactive([])
	memberList: Member[] = []
	me: Member | null = null
	// 设置
	/**
	 * 是否开启通知
	 */
	notice: boolean = false
	constructor(id: number, name: string, memberCount: number) {
		const { $t } = app.config.globalProperties
		super(id, name)
		GroupSession.sessionList.push(this)
		// 用 null 占位，长度用于在加载成员前展示成员数、判断是否已加载
		this.memberList = Array.from(
			{ length: memberCount },
			() => null,
		) as unknown as Member[]
		const groupClass =
			SessionClass.getClass(99999) ?? new SessionClass(99999, $t('群组'))
		groupClass.addSession(this)
		this.sessionClass = groupClass
	}

	override async prepareActive(): Promise<void> {
		const runtimeData = useRuntimeData()
		// 加载群成员 ==============================================
		// emm, 这种高危api,还是不要刷新缓存得了...
		await this.reloadUserList()
		if (!runtimeData.loginInfo) {
			logger.error(null, '没有登录信息，无法获取自身成员信息')
		} else {
			this.me = this.getUserById(runtimeData.loginInfo?.uin) ?? null
			if (!this.me)
				logger.error(
					null,
					`群 ${this.id} 成员列表中没有自己(${runtimeData.loginInfo?.uin})的信息`,
				)
		}
		// 加载历史记录 ============================================
		if (this.messageList.length < 20) await this.loadHistory()

		// 刷新预览消息 ============================================
		this.refreshPreMsg()
	}

	private readonly _memsLoaded = shallowRef(false)
	private memsLoadLocker = false
	get memsLoaded(): boolean {
		return this._memsLoaded.value
	}
	set memsLoaded(flag: boolean) {
		this._memsLoaded.value = flag
	}
	async reloadUserList(useCache: boolean = true): Promise<void> {
		if (useCache && this.memsLoaded) return
		if (this.memsLoadLocker) return
		this.memsLoadLocker = true
		this.memsLoaded = false
		const runtimeData = useRuntimeData()
		// 获取新数据
		const memData = await runtimeData.nowAdapter?.getMemberList(
			this,
			useCache,
		)
		if (!memData) {
			this.memsLoadLocker = false
			this.memsLoaded = true
			throw new Error('获取群成员列表失败')
		}

		const newDataMap = new Map<number, Member>()
		for (const item of memData) {
			const newData = new Member(item)
			newDataMap.set(newData.user_id, newData)
		}

		// 比对数据
		const newMemberList: Member[] = []
		const oldDataMap = new Map<number, Member>()
		for (const item of this.memberList) {
			if (!item) continue
			oldDataMap.set(item.user_id, item)
		}
		for (const [id, newData] of newDataMap) {
			const oldData = oldDataMap.get(id)
			if (oldData) {
				oldData.update(newData)
				newMemberList.push(oldData)
				oldDataMap.delete(id)
			} else {
				newMemberList.push(newData)
			}
		}
		this.memberList = newMemberList.toSorted((a, b) => {
			if (a.role === Role.Owner) return -1
			if (b.role === Role.Owner) return 1
			if (a.role === Role.Admin && b.role !== Role.Admin) return -1
			if (b.role === Role.Admin && a.role !== Role.Admin) return 1
			if (a.role === Role.Bot && b.role !== Role.Bot) return -1
			if (b.role === Role.Bot && a.role !== Role.Bot) return 1
			return a.namePy.localeCompare(b.namePy)
		})

		// 删除不存在的成员
		for (const item of oldDataMap.values()) item.leave = true

		this.memsLoadLocker = false
		this.memsLoaded = true
	}

	override prepareUnactive(): void {
		this.memsLoaded = false
		this.memberList = Array.from(
			{ length: this.memberList.length },
			() => null,
		) as unknown as Member[]
		this.me = null
		this.annsLoaded = false
		this.anns.length = 0
		this.filesLoaded = false
		this.files.length = 0
		this.essenceMsgLoaded = false
		this.essenceMsgs.length = 0
	}

	override match(str: string): boolean {
		str = str.trim().toLowerCase()
		if (this.name.matchStr(str)) return true
		if (String(this.id).includes(str)) return true
		return false
	}

	override _face = computed(() => {
		return ProxyUrl.proxy(
			`https://p.qlogo.cn/gh/${this.id}/${this.id}/0?d=${nowTimes}`,
		)
	})

	static override getSessionById(id: number): GroupSession | undefined {
		return GroupSession.sessionList.find((item) => item.id === id)
	}

	override createSendParam(): { user_id?: number; group_id?: number } {
		return { group_id: this.id }
	}

	override getSendApi(merge: boolean = false): string {
		if (merge) return 'send_group_forward'
		return 'send_msg'
	}

	/**
	 * 通过id获取群成员
	 * @param id 成员id
	 * @returns 成员对象
	 */
	getUserById(id: number): Member | undefined {
		if (this.memberList.at(0) === null)
			throw new Error('请先加载群成员列表')
		return this.memberList.find((item) => item.user_id === id)
	}

	/**
	 * 获取自身成员对象
	 * @returns 自身成员对象
	 */
	override getMe(): Member {
		if (!this.me) throw new Error('请先激活会话')
		return this.me
	}

	/**
	 * 设置是否开启通知
	 * @param flag 是否开启
	 * @param saveCfg 是否写入配置
	 */
	setNotice(flag: boolean, saveCfg: boolean = true): void {
		this.notice = flag

		if (!saveCfg) return
		const runtimeData = useRuntimeData()
		if (flag) {
			if (runtimeData.sysConfig.notice_group.includes(this.id)) return
			runtimeData.sysConfig.notice_group = [
				...runtimeData.sysConfig.notice_group,
				this.id,
			]
		} else {
			if (!runtimeData.sysConfig.notice_group.includes(this.id)) return
			runtimeData.sysConfig.notice_group =
				runtimeData.sysConfig.notice_group.filter((i) => i !== this.id)
		}
	}

	private readonly _annsLoaded = shallowRef(false)
	readonly anns = shallowReactive<Ann[]>([])
	private annsLoadLocker = false
	/**
	 * 获得群公告
	 */
	async loadAnns(useCache: boolean = true): Promise<void> {
		if (useCache && this.annsLoaded) return
		if (this.annsLoadLocker) return
		this.annsLoadLocker = true
		this.annsLoaded = false

		await this.activate()

		const runtimeData = useRuntimeData()
		if (!runtimeData.nowAdapter?.getGroupAnnouncement) {
			popInfo.error(
				app.config.globalProperties.$t('当前适配器不支持获取群公告'),
			)
			this.annsLoaded = true
			this.annsLoadLocker = false
			return
		}

		const data = await runtimeData.nowAdapter.getGroupAnnouncement(this)
		if (!data) {
			popInfo.error(app.config.globalProperties.$t('获取群公告失败'))
			this.annsLoaded = true
			this.annsLoadLocker = false
			return
		}
		const anns = data.map((item) => new Ann(item, this))
		// 拼接图片
		let tail: Img | undefined
		for (const ann of anns) {
			if (!ann.imgData) continue
			tail?.insertNext(ann.imgData)
			tail = ann.imgData
		}
		// 保存群公告
		this.anns.length = 0
		this.anns.push(...anns)
		this.annsLoaded = true
		this.annsLoadLocker = false
	}

	get annsLoaded(): boolean {
		return this._annsLoaded.value
	}

	set annsLoaded(flag: boolean) {
		this._annsLoaded.value = flag
	}

	private readonly _filesLoaded = shallowRef(false)
	readonly files = shallowReactive<(GroupFile | GroupFileFolder)[]>([])
	private filesLoadLocker = false
	/**
	 * 获取群文件
	 * @param useCache 是否使用缓存
	 */
	async loadFiles(useCache: boolean = true): Promise<void> {
		if (useCache && this.filesLoaded) return
		if (this.filesLoadLocker) return

		this.filesLoadLocker = true
		this.filesLoaded = false

		await this.activate()

		const runtimeData = useRuntimeData()
		if (!runtimeData.nowAdapter?.getGroupFile) {
			popInfo.error(
				app.config.globalProperties.$t('当前适配器不支持获取群文件'),
			)
			this.filesLoaded = true
			this.filesLoadLocker = false
			return
		}

		const data = await runtimeData.nowAdapter?.getGroupFile(this)
		if (!data) {
			popInfo.error(app.config.globalProperties.$t('获取群文件失败'))
			this.filesLoaded = true
			this.filesLoadLocker = false
			return
		}
		const { files: fileData, folders: folderData } = data

		const sort = (
			a: GroupFile | GroupFileFolder,
			b: GroupFile | GroupFileFolder,
		) => {
			if (!a.createTime) return -1
			if (!b.createTime) return 1
			return b.createTime.time - a.createTime.time
		}

		const files = fileData
			.map((item) => new GroupFile(item, this))
			.sort(sort)
		const folders = folderData
			.map((item) => new GroupFileFolder(item, this))
			.sort(sort)

		const out = [...folders, ...files]
		this.files.length = 0
		this.files.push(...out)
		this.filesLoaded = true
		this.filesLoadLocker = false
	}

	get filesLoaded(): boolean {
		return this._filesLoaded.value
	}

	set filesLoaded(flag: boolean) {
		this._filesLoaded.value = flag
	}

	private readonly _essenceMsgLoaded = shallowRef(false)
	readonly essenceMsgs = shallowReactive<EssenceMsg[]>([])
	private essenceMsgsLoadLocker = false

	/**
	 * 获取群精华消息
	 * @param useCache 是否使用缓存
	 * @returns
	 */
	async loadEssenceMsgs(useCache: boolean = true): Promise<void> {
		if (useCache && this.essenceMsgLoaded) return
		if (this.essenceMsgsLoadLocker) return

		this.essenceMsgLoaded = false
		this.essenceMsgsLoadLocker = true

		await this.activate()

		const runtimeData = useRuntimeData()
		if (!runtimeData.nowAdapter?.getGroupEssence) {
			popInfo.error(
				app.config.globalProperties.$t(
					'当前适配器不支持获取群精华消息',
				),
			)
			this.essenceMsgLoaded = true
			this.essenceMsgsLoadLocker = false
			return
		}

		const data = await runtimeData.nowAdapter.getGroupEssence(this)
		if (!data) {
			popInfo.error(app.config.globalProperties.$t('获取群精华消息失败'))
			this.essenceMsgLoaded = true
			this.essenceMsgsLoadLocker = false
			return
		}

		this.essenceMsgs.length = 0
		this.essenceMsgs.push(...data.map((item) => new EssenceMsg(item, this)))

		// 拼接图片
		let tail: Img | undefined
		for (const msg of this.essenceMsgs) {
			if (msg.imgList.length === 0) continue
			tail?.concatNext(msg.imgList.at(0)!)
			tail = msg.imgList.at(-1)
		}

		this.essenceMsgLoaded = true
		this.essenceMsgsLoadLocker = false
	}

	get essenceMsgLoaded(): boolean {
		return this._essenceMsgLoaded.value
	}

	set essenceMsgLoaded(flag: boolean) {
		this._essenceMsgLoaded.value = flag
	}
}

@autoMarkRaw
export class UserSession extends Session {
	override type = 'user' as const
	override sessionClass: SessionClass
	private _remark?: Name
	static readonly sessionList: UserSession[] = shallowReactive([])
	baseUser: BaseUser = new BaseUser(
		this.id,
		this.name.toString(),
		this._remark?.toString(),
	)
	constructor(
		id: number,
		name: string,
		class_id: number,
		class_name: string,
		remark?: string,
	) {
		super(id, name)
		UserSession.sessionList.push(this)
		this._remark = remark ? new Name(remark) : undefined
		const friendClass =
			SessionClass.getClass(class_id) ??
			new SessionClass(class_id, class_name)
		friendClass.addSession(this)
		this.sessionClass = friendClass
	}

	override async prepareActive(): Promise<void> {
		// 好友信息不做了...等查看具体信息了再说调用
		// lgr没找到好友信息api,总不能拿陌生人api拿吧?调几次封号了...
		// 加载历史记录 ============================================
		if (this.messageList.length < 20) await this.loadHistory()

		// 刷新预览消息 ============================================
		this.refreshPreMsg()
	}

	override prepareUnactive(): void {
		/**/
	}

	override match(str: string): boolean {
		str = str.trim().toLowerCase()
		if (this.name.matchStr(str)) return true
		if (this._remark?.matchStr(str)) return true
		if (String(this.id).includes(str)) return true
		return false
	}

	override _face = computed(() => {
		return ProxyUrl.proxy(
			`https://q1.qlogo.cn/g?b=qq&s=0&nk=${this.id}&d=${nowTimes}`,
		)
	})

	override get showName(): string {
		if (!this._remark) return super.showName
		return (
			this._remark
				.toString()
				.replace(/[\u202A-\u202E\u2066-\u2069]/g, '') +
			`(${super.showName})`
		)
	}

	static override getSessionById(id: number): UserSession | undefined {
		return UserSession.sessionList.find((item) => item.id === id)
	}

	get remark(): Name | undefined {
		return this._remark
	}

	set remark(name: string | Name) {
		if (name instanceof Name) this._remark = name
		else this._remark = new Name(name)
	}

	override createSendParam(): { user_id?: number; group_id?: number } {
		return { user_id: this.id }
	}

	override getSendApi(merge: boolean = false): string {
		if (merge) return 'send_private_forward'
		return 'send_msg'
	}

	override getUserById(id: number): BaseUser | User | undefined {
		const runtimeData = useRuntimeData()
		if (id === runtimeData.loginInfo?.uin)
			return new BaseUser(
				runtimeData.loginInfo?.uin,
				runtimeData.loginInfo?.nickname,
			)
		if (id !== this.id) return undefined
		if (this.userCache) return this.userCache
		return this.baseUser
	}

	private userCache?: User
	/**
	 * 获取用户信息
	 * @param useCache 使用缓存
	 * @returns
	 */
	async getUserInfo(useCache: boolean = true): Promise<User | undefined> {
		if (useCache && this.userCache) return this.userCache
		const runtimeData = useRuntimeData()
		const data = await runtimeData.nowAdapter?.getUserInfo(
			this.id,
			useCache,
		)
		if (!data) {
			popInfo.error(app.config.globalProperties.$t('获取用户信息失败'))
			return
		}
		const user = new User(data)
		this.userCache = user
		return user
	}
	/**
	 * 获取用户信息
	 * @param useCache 是否使用缓存
	 * @returns
	 */
	useUserInfo(useCache: boolean = true): ShallowRef<User | undefined> {
		const user = shallowRef<User | undefined>(undefined)
		this.getUserInfo(useCache).then((data) => {
			user.value = data
		})
		return user
	}
}

@autoMarkRaw
export class TempSession extends Session {
	override type = 'temp' as const
	override sessionClass: SessionClass
	group: GroupSession | number
	member?: Member
	baseUser: BaseUser = new BaseUser(this.id, this.name.toString())
	static readonly sessionList: TempSession[] = shallowReactive([])
	constructor(id: number, group_id: number) {
		const group = GroupSession.getSessionById(group_id)
		super(id, `临时会话-${id}`)
		this.group = group ?? group_id
		const tempClass =
			SessionClass.getClass(99998) ?? new SessionClass(99998, '临时会话')
		tempClass.addSession(this)
		this.sessionClass = tempClass
		TempSession.sessionList.push(this)
		if (group) {
			group.activate().then(() => {
				const mem = group.getUserById(id)
				if (mem) this.name = mem.name
				this.member = mem
			})
		}
	}

	override async prepareActive(): Promise<void> {
		throw new Error('未实现')
	}

	override prepareUnactive(): void {
		throw new Error('未实现')
	}

	override match(str: string): boolean {
		str = str.trim().toLowerCase()
		if (this.name.matchStr(str)) return true
		if (String(this.id).includes(str)) return true
		if (typeof this.group === 'number' && String(this.group).includes(str))
			return true
		if (this.group instanceof GroupSession && this.group.name.matchStr(str))
			return true
		return false
	}

	static override getSessionById(id: number): TempSession | undefined {
		return TempSession.sessionList.find((item) => item.id === id)
	}

	override _face = computed(() => {
		return ProxyUrl.proxy(
			`https://q1.qlogo.cn/g?b=qq&s=0&nk=${this.id}&d=${nowTimes}`,
		)
	})

	override get showName(): string {
		const { $t } = app.config.globalProperties
		return (
			super.name +
			$t('来自群聊：{group}', {
				group:
					this.group instanceof GroupSession
						? this.group.showName
						: this.group,
			})
		)
	}

	override createSendParam(): { user_id?: number; group_id?: number } {
		if (this.group instanceof GroupSession) {
			return { user_id: this.id, group_id: this.group.id }
		} else {
			return { user_id: this.id, group_id: this.group }
		}
	}

	override getSendApi(merge: boolean = false): string {
		if (merge) throw new Error('临时会话不支持合并转发')
		return 'send_temp_msg'
	}

	get group_id(): number {
		if (this.group instanceof GroupSession) return this.group.id
		return this.group as number
	}

	override getUserById(id: number): BaseUser | Member | undefined {
		const runtimeData = useRuntimeData()
		if (id === runtimeData.loginInfo?.uin) {
			return new BaseUser(
				runtimeData.loginInfo?.uin,
				runtimeData.loginInfo?.nickname,
			)
		}
		if (id !== this.id) return undefined
		if (this.member) return this.member
		return this.baseUser
	}

	/**
	 * 获取自身成员对象
	 * @returns 自身成员对象
	 */
	override getMe(): BaseUser | Member {
		const runtimeData = useRuntimeData()
		if (!runtimeData.loginInfo?.uin) throw new Error('未登录')
		const mem = this.getUserById(runtimeData.loginInfo?.uin)
		return mem as BaseUser | Member
	}
}

/**
 * 好友分组管理
 */
@autoMarkRaw
export class SessionClass {
	id: number
	name: string
	content: Session[] = shallowReactive([])
	_open = shallowRef<boolean>(false)
	private static readonly AllFriendClass: SessionClass[] = shallowReactive([])
	constructor(id: number, name: string) {
		if (SessionClass.getClass(id)) throw new Error(`分组 ID ${id} 已存在`)
		this.id = id
		this.name = name
		SessionClass.AllFriendClass.push(this)
	}

	addSession(session: Session): void {
		if (this.content.some((item) => item.id === session.id)) {
			throw new Error(`${session.name} 已经存在于分组 ${this.name} 中`)
		}
		this.content.push(session)
	}

	removeSession(session: Session): void {
		const index = this.content.findIndex((item) => item.id === session.id)
		if (index === -1) {
			throw new Error(`用户 ${session.name} 不在分组 ${this.name} 中`)
		}
		this.content.splice(index, 1)
	}

	/**
	 * 获取好友分组
	 * @param arg 分组id或者名称
	 * @returns
	 */
	static getClass(arg: number | string): SessionClass | undefined {
		if (typeof arg === 'number') {
			return SessionClass.AllFriendClass.find((item) => item.id === arg)
		} else if (typeof arg === 'string') {
			return SessionClass.AllFriendClass.find((item) => item.name === arg)
		}
		return undefined
	}

	static getClasses(): SessionClass[] {
		return SessionClass.AllFriendClass.sort((a, b) => a.id - b.id)
	}

	static clear(): void {
		SessionClass.AllFriendClass.length = 0
	}

	get open(): boolean {
		return this._open.value
	}

	set open(flag: boolean) {
		this._open.value = flag
	}
}

// 加载一堆钩子
import('@renderer/function/sessionHooks')
