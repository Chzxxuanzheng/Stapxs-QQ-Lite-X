import { MilkyConnection } from '@renderer/function/adapter/mk/connection'
import { GroupFile, GroupFileFolder } from '@renderer/function/model/file'
import { Msg } from '@renderer/function/model/msg'
import {
	GroupSession,
	Session,
	UserSession,
} from '@renderer/function/model/session'
import { Member } from '@renderer/function/model/user'
import {
	AdapterInterface,
	AtAllSegData,
	AtSegData,
	BanEventData,
	BanLiftEventData,
	EssenceData,
	EssenceSeg,
	EventData,
	FaceSegData,
	FilesData,
	FileSegData,
	ForwardNodeData,
	ForwardSegData,
	GroupAnnouncementData,
	GroupData,
	ImgSegData,
	ImplInfo,
	JoinEventData,
	JsonSegData,
	LeaveEventData,
	LoginInfo,
	MemberData,
	MfaceSegData,
	MsgData,
	MsgEventData,
	PokeEventData,
	RecallEventData,
	ReplySegData,
	ResponseEventData,
	SegData,
	SessionData,
	TextSegData,
	UnknownSegData,
	UserData,
	VideoSegData,
	XmlSegData,
	SuperFaceSegData,
	FriendData,
	BreakSegData,
	LinkSegData,
	ButtonSegData,
} from '@renderer/function/adapter/interface'

import { handleEvent } from '@renderer/function/event'
import { Resource } from '@renderer/function/model/resource'
import {
	AtAllSeg,
	AtSeg,
	BlockquoteSeg,
	BreakSeg,
	DeleteSeg,
	EmphasisSeg,
	FaceSeg,
	ForwardSeg,
	HeadingSeg,
	ImgSeg,
	InlineCodeSeg,
	JsonSeg,
	LinkSeg,
	ListSeg,
	MfaceSeg,
	ReplySeg,
	Seg,
	StrongSeg,
	SuperFaceSeg,
	TableSeg,
	TextSeg,
	ThematicBreakSeg,
	UnknownSeg,
	VideoSeg,
	XmlSeg,
} from '@renderer/function/model/segs'
import { parseUrlFromMsg, queueWait } from '@renderer/function/utils/baseUtil'
import useRuntimeData from '@renderer/state/runtimeData'
import type {
	ApiInput,
	ApiOutput,
	BotOfflineEventData,
	FriendEntity,
	FriendNudgeEventData,
	GetGroupFilesOutput,
	GetHistoryMessagesOutput,
	GroupDisbandEventData,
	GroupEssenceMessage,
	GroupMemberDecreaseEventData,
	GroupMemberEntity,
	GroupMemberIncreaseEventData,
	GroupMessageReactionEventData,
	GroupMuteEventData,
	GroupNudgeEventData,
	IncomingForwardedMessage,
	IncomingMessage,
	IncomingSegment,
	MessageRecallEventData,
	MilkyApiName,
	MilkyEvent,
	MilkyEventType,
	MilkyReactionType,
	OutgoingForwardedMessage,
	OutgoingSegment,
	SendGroupMessageOutput,
	SendPrivateMessageOutput,
} from '@renderer/function/adapter/mk/types'
import {
	parseApiInput,
	parseApiOutput,
	safeParseEvent,
} from '@renderer/function/adapter/mk/types'
import { type Component } from 'vue'
import * as ISeg from '@renderer/function/adapter/mk/incomeSeg'
import MkInfo from '@renderer/function/adapter/mk/MkInfo.vue'
import * as OSeg from '@renderer/function/adapter/mk/outgoingSeg'
import {
	$t,
	camelCaseToUnderline,
	checkMilkyVersion,
	fileToBase64,
	getGender,
	getRole,
	isSingleSeg,
	versionCompare,
} from '@renderer/function/adapter/mk/utils'
import type { MilkyVersion } from '@renderer/function/adapter/mk/utils'
import { logger, popInfo } from '@renderer/function/base'
import { emitConnectionLost } from '@renderer/function/utils/connectionEvent'
import Emoji from '@renderer/function/model/emoji'
import { parseMarkdown } from '@root/src/renderer/src/function/utils/markdown'
import { ButtonSeg } from '@root/src/renderer/src/function/model/segs/buttonSeg'

// 定义 API 装饰器：在方法外层包裹 try/catch，失败时返回 undefined
function api(_: any, propertyKey: string, descriptor: PropertyDescriptor) {
	const original = descriptor.value
	descriptor.value = async function (...args: any[]) {
		try {
			return await original.apply(this, args)
		} catch (err) {
			logger.error(err as Error, `[API ${propertyKey} 调用失败]:`)
			return undefined
		}
	}
}

export class MilkyAdapter implements AdapterInterface {
	readonly name = 'Milky'
	readonly version = '0.0.2'
	readonly protocol = 'mk'
	readonly sendMsgTextType = 'text'
	/**
	 * 协议端 Milky 版本，连接时判定一次
	 */
	protected milkyVersion: MilkyVersion = '1.0'

	/**
	 * 连接层：WS 收事件 + HTTP 发 API
	 * 对外的连接状态统一写在 runtimeData，由连接层回调驱动
	 */
	protected readonly connection = new MilkyConnection({
		onEvent: (json) => this.handleEvent(json),
		onReconnecting: () => popInfo.info('连接不稳定'),
		onReconnectFailed: () => emitConnectionLost(),
	})

	constructor() {
		this.init()
	}

	protected init() {
		this.segParsers['text'] = this.textParser.bind(this)
		this.segParsers['image'] = this.imageParser.bind(this)
		this.segParsers['face'] = this.faceParser.bind(this)
		this.segParsers['market_face'] = this.marketFaceParser.bind(this)
		this.segParsers['mention'] = this.mentionParser.bind(this)
		this.segParsers['mention_all'] = this.mentionAllParser.bind(this)
		this.segParsers['video'] = this.videoParser.bind(this)
		this.segParsers['forward'] = this.forwardParser.bind(this)
		this.segParsers['reply'] = this.replyParser.bind(this)
		this.segParsers['file'] = this.fileParser.bind(this)
		// this.segParsers['poke'] = this.pokeParser.bind(this)
		this.segParsers['xml'] = this.xmlParser.bind(this)
		this.segParsers['light_app'] = this.lightAppParser.bind(this)
		this.segParsers['markdown'] = this.markdownParser.bind(this)

		for (const seg of this.mdSegs) {
			this.segSerializer[seg.type] = this.mdSegSerializer.bind(this)
		}
		this.segSerializer['image'] = this.imageSerializer.bind(this)
		this.segSerializer['face'] = this.faceSerializer.bind(this)
		this.segSerializer['super-face'] = this.superFaceSerializer.bind(this)
		this.segSerializer['mface'] = this.mfaceSerializer.bind(this)
		this.segSerializer['at'] = this.atSerializer.bind(this)
		this.segSerializer['atall'] = this.atallSerializer.bind(this)
		this.segSerializer['video'] = this.videoSerializer.bind(this)
		this.segSerializer['forward'] = this.forwardSerializer.bind(this)
		this.segSerializer['reply'] = this.replySerializer.bind(this)
		this.segSerializer['button'] = this.buttonSerialize.bind(this)
		// this.segSerializer['poke'] = this.pokeSerializer.bind(this)
		this.segSerializer['xml'] = this.xmlSerializer.bind(this)
		this.segSerializer['json'] = this.jsonSerializer.bind(this)

		this.eventProcessers['message_receive'] =
			this.messageReceiveEvent.bind(this)
		this.eventProcessers['group_member_increase'] =
			this.groupMemberIncreaseEvent.bind(this)
		this.eventProcessers['group_member_decrease'] =
			this.groupMemberDecreaseEvent.bind(this)
		this.eventProcessers['group_mute'] = this.groupBanEvent.bind(this)
		this.eventProcessers['message_recall'] = this.recallEvent.bind(this)
		this.eventProcessers['group_nudge'] = this.pokeEvent.bind(this)
		this.eventProcessers['friend_nudge'] = this.friendPokeEvent.bind(this)
		this.eventProcessers['group_disband'] =
			this.groupDisbandEvent.bind(this)
		this.eventProcessers['group_message_reaction'] =
			this.groupMessageReaction.bind(this)
		this.eventProcessers['bot_offline'] = this.botOfflineEvent.bind(this)
	}

	optInfo(): Component {
		return MkInfo
	}

	getHost(url: string): string {
		return url
	}

	splitMsg(segs: Seg[]): Seg[][] {
		const result: Seg[][] = []
		let currentSegs: Seg[] = []
		for (const seg of segs) {
			if (isSingleSeg(seg)) {
				if (currentSegs.length) result.push(currentSegs)
				currentSegs = []
				result.push([seg])
			} else {
				currentSegs.push(seg)
			}
		}
		result.push(currentSegs)
		return result
	}

	/**
	 * 连接到协议段
	 * @param url 协议层路径
	 * @param ssl 是否使用 SSL
	 * @param token 访问令牌
	 * @returns 是否连接成功
	 */
	async connect(url: string, ssl: boolean, token: string): Promise<boolean> {
		// 先注册事件钩子再建立 WS，避免首帧落在空钩子上（顺序对齐 ob/utils.ts:168）
		this.connection.onMessage((json) => this.handleEvent(json))
		const re = await this.connection.connect(url, ssl, token)

		const implInfo = await this.getImplInfoRaw()
		if (!implInfo) {
			// 版本探测失败：回收已建立的 WS，避免留下无人使用的连接
			await this.connection.close()
			return false
		}

		let version = checkMilkyVersion(implInfo.milky_version)
		if (!version) {
			version = '1.0'
			popInfo.error(
				$t('版本号{version}格式异常，某些功能可能无法使用', {
					version: implInfo.milky_version,
				}),
			)
		}
		this.milkyVersion = version

		// 根据协议段版本禁用不支持的API
		if (versionCompare(version, '1.1') === -1) {
			this.getCustomFace = undefined as any
			this.setNickname = undefined as any
			this.setSign = undefined as any
			this.segParsers['market_face'] = this.v1MarketFaceParser.bind(this)
			this.segParsers['face'] = this.v1FaceParser.bind(this)
		}

		return re
	}
	async close(): Promise<true | undefined> {
		await this.connection.close()
		return true
	}
	/**
	 * 重定向到其他适配器
	 */
	async redirect?(): Promise<AdapterInterface | undefined>

	/**
	 * 获取当前适配器信息
	 */
	async getAdapterInfo(): Promise<{ [key: string]: string } | undefined> {
		return await this.getImplInfoRaw()
	}
	//#region == API ===============================================
	//#region  == 基础信息 =====================
	/**
	 * 获取登陆基本信息
	 * @return 返回登录信息(uin, 昵称)
	 */
	@api
	async getLoginInfo(): Promise<LoginInfo | undefined> {
		const data = await this.callApi('GetLoginInfo', {})
		return {
			uin: data.uin.toString(),
			nickname: data.nickname,
		}
	}
	/**
	 * 获取协议段信息
	 */
	@api
	async getImplInfo(): Promise<ImplInfo> {
		const data = await this.getImplInfoRaw()
		return {
			name: data.impl_name,
			version: data.impl_version,
		}
	}
	@api
	async getImplInfoRaw(): Promise<ApiOutput<'GetImplInfo'>> {
		const data = await this.callApi('GetImplInfo', {})
		return data
	}
	//#endregion

	//#region == 获取信息 ======================
	/**
	 * 获取好友列表
	 * @param useCache 是否使用缓存
	 */
	@api
	async getFriendList(
		useCache: boolean = true,
	): Promise<FriendData[] | undefined> {
		const data = await this.callApi('GetFriendList', {
			no_cache: !useCache,
		})
		return data.friends.map(this.parseFriend.bind(this)) as FriendData[]
	}
	/**
	 * 获取群组列表
	 * @param useCache 是否使用缓存
	 */
	@api
	async getGroupList(
		useCache: boolean = true,
	): Promise<GroupData[] | undefined> {
		const data = await this.callApi('GetGroupList', { no_cache: !useCache })
		return data.groups.map((group) => ({
			id: group.group_id.toString(),
			name: group.group_name,
			avatar: this.getGroupAvatar(group.group_id),
			desc: group.description,
			remark: group.remark,
			memberCount: group.member_count,
			maxMemberCount: group.max_member_count,
		}))
	}
	/**
	 * 获取用户信息
	 * @param userId 用户id
	 * @param useCache 是否使用缓存
	 */
	@api
	async getUserInfo(
		userId: string,
		_?: boolean,
	): Promise<UserData | undefined> {
		const data = await this.callApi('GetUserProfile', { user_id: +userId })
		return {
			id: userId.toString(),
			avatar: this.getUserAvatar(userId),
			remark: data.remark,
			nickname: data.nickname,
			longNick: data.bio,
			regTime: Date.now(),
			bot: this.isRobot(userId),
			age: data.age,
			sex: getGender(data.sex),
		}
	}
	/**
	 * 获取群成员信息
	 * @param group 群组会话
	 * @param useCache 是否使用缓存
	 */
	@api
	async getMemberList(
		group: GroupSession,
		useCache: boolean = true,
	): Promise<MemberData[] | undefined> {
		const data = await this.callApi('GetGroupMemberList', {
			group_id: +group.id,
			no_cache: !useCache,
		})
		return data.members.map((member) => this.parseMember(member, group.id))
	}
	/**
	 * 获取群公告信息
	 * @param group
	 */
	@api
	async getGroupAnnouncement(
		group: GroupSession,
	): Promise<GroupAnnouncementData[]> {
		const data = await this.callApi('GetGroupAnnouncements', {
			group_id: Number(group.id),
		})
		return await Promise.all(
			data.announcements.map(async (item) => ({
				content: item.content ?? undefined,
				img: item.image_url ?? undefined,
				time: item.time,
				sender: await this.getMemberFromGroup(
					item.user_id,
					Number(group.id),
				),
			})),
		)
	}
	/**
	 * 获取群精华消息
	 * @param group
	 * @todo TODO:加分页
	 */
	@api
	async getGroupEssence(group: GroupSession): Promise<EssenceData[]> {
		const messages: GroupEssenceMessage[] = []
		for (let id = 0; true; id++) {
			const data = await this.callApi('GetGroupEssenceMessages', {
				group_id: Number(group.id),
				page_index: id,
				page_size: 50,
			})
			messages.push(...data.messages)
			if (data.is_end) break
		}

		const buildEssenceSeg = async (item: GroupEssenceMessage) => ({
			sender: this.buildUnknownUser(item.sender_id, item.sender_name),
			sender_time: item.message_time,
			operator: this.buildUnknownUser(
				item.operator_id,
				item.operator_name,
			),
			operator_time: item.operation_time,
			content: (await this.parseSeg(item.segments)) as EssenceSeg[],
		})

		const out: Promise<EssenceData>[] = []
		for (const item of messages) {
			out.push(buildEssenceSeg(item))
		}

		return await Promise.all(out)
	}
	/**
	 * 获取用户自定义表情
	 * @param userId
	 */
	@api
	async getCustomFace(): Promise<string[] | undefined> {
		const data = await this.callApi('GetCustomFaceUrlList', {})
		return data?.urls ?? undefined
	}
	/**
	 * 获取资源url
	 * @param id 资源id
	 */
	@api
	async getResource(id: string): Promise<string | undefined> {
		const data = await this.callApi('GetResourceTempUrl', {
			resource_id: id,
		})
		return data.url
	}
	//#endregion

	//#region == 群聊相关 ======================
	/**
	 * 设置群名称
	 * @param group 群组
	 * @param name 新名称
	 */
	@api
	async setGroupName(group: GroupSession, name: string): Promise<true> {
		await this.callApi('SetGroupName', {
			group_id: Number(group.id),
			new_group_name: name,
		})
		return true
	}
	/**
	 * 为群成员设置新的群内名称
	 * @param group 群组
	 * @param mem 群成员
	 * @param card 新名称
	 */
	@api
	async setMemberCard(
		group: GroupSession,
		mem: Member,
		card: string,
	): Promise<true> {
		await this.callApi('SetGroupMemberCard', {
			group_id: Number(group.id),
			user_id: Number(mem.user_id),
			card: card,
		})
		return true
	}
	/**
	 * 为群成员设置头衔,头衔为''或者没有时表示清除头衔
	 * @param group
	 * @param mem
	 * @param title
	 */
	@api
	async setMemberTitle(
		group: GroupSession,
		mem: Member,
		title: string,
	): Promise<true> {
		await this.callApi('SetGroupMemberSpecialTitle', {
			group_id: Number(group.id),
			user_id: Number(mem.user_id),
			special_title: title,
		})
		return true
	}
	/**
	 * 群禁言
	 * @param group 群组
	 * @param mem 被禁言的成员
	 * @param time 禁言时间
	 */
	@api
	async banMember(
		group: GroupSession,
		mem: Member,
		time: number,
	): Promise<true> {
		await this.callApi('SetGroupMemberMute', {
			group_id: Number(group.id),
			user_id: Number(mem.user_id),
			duration: time,
		})
		return true
	}
	/**
	 * 踢出群成员
	 * @param group 群组
	 * @param mem 群成员
	 */
	@api
	async kickMember(group: GroupSession, mem: Member): Promise<true> {
		await this.callApi('KickGroupMember', {
			group_id: Number(group.id),
			user_id: Number(mem.user_id),
			reject_add_request: false,
		})
		return true
	}
	/**
	 * 退出群组
	 * @param group 群组
	 */
	@api
	async leaveGroup(group: GroupSession): Promise<true> {
		await this.callApi('QuitGroup', { group_id: Number(group.id) })
		return true
	}
	//#endregion

	//#region == 消息相关 ======================
	/**
	 * 设置已读消息
	 * @param session 目标会话
	 * @param msg 目标消息
	 */
	@api
	async setMsgReaded(session: Session, msg: Msg): Promise<true> {
		await this.callApi('MarkMessageAsRead', {
			message_scene: this.getScene(session.type),
			peer_id: Number(session.id),
			message_seq: Number(msg.message_id),
		})

		return true
	}
	/**
	 * 获取消息
	 * @param session 会话
	 * @param msgId 消息id
	 */
	@api
	async getMsg(
		session: Session,
		msgId: string,
	): Promise<MsgData | undefined> {
		const data = await this.callApi('GetMessage', {
			message_scene: this.getScene(session.type),
			peer_id: Number(session.id),
			message_seq: Number(msgId),
		})
		return this.parseMsg(data.message)
	}
	/**
	 * 获取消息历史
	 * @param session 会话
	 * @param count 获取消息数量
	 * @param start 起始消息
	 */
	@api
	async getHistoryMsg(
		session: Session,
		count: number,
		start?: Msg,
	): Promise<MsgData[]> {
		let out: IncomingMessage[] = []
		let startId: number | undefined = start?.message_id
			? Number(start.message_id)
			: undefined

		if (startId === 0) return []

		while (out.length < count) {
			// 拉消息
			const data = await this._getHistoryMsg(
				session,
				startId,
				count - out.length,
			)
			if (!data || data.messages.length === 0) break

			out = [...data.messages, ...out]

			// 保存头部消息
			startId = data.next_message_seq ?? data.messages.at(0)?.message_seq
			if (!startId) break
		}
		return await Promise.all(out.map((item) => this.parseMsg(item)))
	}
	/**
	 * 发送消息
	 * @param session 目标会话
	 * @param msg 消息内容
	 */
	@api
	async sendMsg(msg: Msg): Promise<string> {
		let data: SendGroupMessageOutput | SendPrivateMessageOutput
		if (msg.session?.type === 'group') {
			data = await this.callApi('SendGroupMessage', {
				group_id: Number(msg.session.id),
				message: await this.serializeMsg(msg),
			})
		} else if (msg.session?.type === 'user') {
			data = await this.callApi('SendPrivateMessage', {
				user_id: Number(msg.session.id),
				message: await this.serializeMsg(msg),
			})
		} else {
			throw new Error('milky 不支持发送临时会话消息')
		}

		if (data.message_seq <= 0) throw new Error('发送消息失败')

		return data.message_seq.toString()
	}
	/**
	 * 撤回消息
	 * @param msg 要撤回的消息
	 */
	@api
	async recallMsg(msg: Msg): Promise<true> {
		if (msg.session?.type === 'group') {
			await this.callApi('RecallGroupMessage', {
				group_id: Number(msg.session.id),
				message_seq: Number(msg.message_id),
			})
		} else if (msg.session?.type === 'user') {
			await this.callApi('RecallPrivateMessage', {
				user_id: Number(msg.session.id),
				message_seq: Number(msg.message_id),
			})
		} else {
			throw new Error('milky 不支持撤回临时会话消息')
		}
		return true
	}
	/**
	 * 群聊发送戳一戳
	 * @param session 当前会话
	 * @param target 目标成员
	 */
	@api
	async sendGroupPoke(session: GroupSession, target: Member): Promise<true> {
		await this.callApi('SendGroupNudge', {
			group_id: Number(session.id),
			user_id: Number(target.user_id),
		})
		return true
	}
	/**
	 * 私聊发送戳一戳
	 * @param session
	 */
	@api
	async sendPrivatePoke(session: UserSession): Promise<true> {
		await this.callApi('SendFriendNudge', {
			user_id: Number(session.id),
		})
		return true
	}
	/**
	 * 设置消息表情响应
	 * @param msg 要设置表情的消息
	 * @param emojiId 表情ID
	 * @param add 是否添加表情,如果为false则表示删除表情
	 * @returns 返回是否成功
	 */
	@api
	async setResponse(msg: Msg, emojiId: string, add?: boolean): Promise<true> {
		const reactionType: MilkyReactionType =
			+emojiId < 1000 ? 'face' : 'emoji'
		await this.callApi('SendGroupMessageReaction', {
			group_id: Number(msg.session!.id),
			message_seq: Number(msg.message_id),
			reaction: emojiId,
			// 1.2 起才支持，低版本省略以走协议端默认值
			reaction_type:
				reactionType && versionCompare(this.milkyVersion, '1.2') !== -1
					? reactionType
					: undefined,
			is_add: add,
		})

		return true
	}
	/**
	 * 获取合并转发内容
	 * @param id
	 * @returns
	 */
	@api
	async getForwardMsg(id: string): Promise<ForwardNodeData[] | undefined> {
		const data = await this.callApi('GetForwardedMessages', {
			forward_id: id,
		})
		return Promise.all(data.messages.map((node) => this.nodeParser(node)))
	}
	//#endregion

	//#region == 文件相关 ======================
	/**
	 * 获取群文件根目录
	 * @param group 群组会话
	 */
	@api
	async getGroupFile(group: GroupSession): Promise<FilesData> {
		const data = await this.callApi('GetGroupFiles', {
			group_id: Number(group.id),
		})
		return await this.parseFiles(data, Number(group.id))
	}
	/**
	 * 获取群文件夹内容
	 * PS: 文件夹对象塞GroupSession不知道为啥会报循环错误,所以用的是groupId
	 * @param groupId 群组id
	 * @param folderId 文件夹id
	 */
	@api
	async getGroupFolderFile(
		group: GroupSession,
		folderId: string,
	): Promise<FilesData> {
		const data = await this.callApi('GetGroupFiles', {
			group_id: Number(group.id),
			parent_folder_id: folderId,
		})
		return await this.parseFiles(data, Number(group.id))
	}
	/**
	 * 获取文件下载连接
	 * @param file 要下载的文件
	 */
	@api
	async getGroupFileUrl(file: GroupFile): Promise<string> {
		const data = await this.callApi('GetGroupFileDownloadUrl', {
			group_id: Number(file.group.id),
			file_id: file.id,
		})

		return `${data.download_url}${file.name}`
	}
	/**
	 * 发送文件到群里
	 * @param group
	 * @param file
	 * @param fold
	 */
	@api
	async sendGroupFile(
		group: GroupSession,
		file: File,
		fold?: GroupFileFolder,
	): Promise<string | undefined> {
		const data = await this.callApi('UploadGroupFile', {
			group_id: Number(group.id),
			parent_folder_id: fold?.id ?? '/',
			file_uri: `base64://${await fileToBase64(file)}`,
			file_name: file.name,
		})
		return data.file_id
	}
	/**
	 * 发送文件到私聊
	 * @param session
	 * @param file
	 */
	@api
	async sendPrivateFile(
		session: UserSession,
		file: File,
	): Promise<string | undefined> {
		const data = await this.callApi('UploadPrivateFile', {
			user_id: Number(session.id),
			file_uri: `base64://${await fileToBase64(file)}`,
			file_name: file.name,
		})
		return data.file_id
	}
	/**
	 * 创建群文件夹
	 * @param group
	 * @param folderName
	 */
	@api
	async createFileFolder(
		group: GroupSession,
		folderName: string,
	): Promise<string | undefined> {
		const data = await this.callApi('CreateGroupFolder', {
			group_id: Number(group.id),
			folder_name: folderName,
		})
		return data.folder_id
	}
	/**
	 * 删除群文件
	 * @param file
	 */
	@api
	async deleteGroupFile(file: GroupFile): Promise<true | undefined> {
		await this.callApi('DeleteGroupFile', {
			group_id: Number(file.group.id),
			file_id: file.id,
		})
		return true
	}
	/**
	 * 删除群文件夹
	 * @param folder
	 */
	@api
	async deleteGroupFileFolder(
		folder: GroupFileFolder,
	): Promise<true | undefined> {
		await this.callApi('DeleteGroupFolder', {
			group_id: Number(folder.group.id),
			folder_id: folder.id,
		})
		return true
	}
	/**
	 * 重命名群文件
	 * @param file
	 * @param newName
	 */
	@api
	async renameGroupFile(
		file: GroupFile,
		newName: string,
	): Promise<true | undefined> {
		await this.callApi('RenameGroupFile', {
			group_id: Number(file.group.id),
			file_id: file.id,
			parent_folder_id: file.folder?.id ?? '/',
			new_file_name: newName,
		})

		return true
	}
	/**
	 * 重命名群文件夹
	 * @param folder
	 * @param newName
	 */
	@api
	async renameGroupFileFolder(
		folder: GroupFileFolder,
		newName: string,
	): Promise<true | undefined> {
		await this.callApi('RenameGroupFolder', {
			group_id: Number(folder.group.id),
			folder_id: folder.id,
			new_folder_name: newName,
		})

		return true
	}
	//#endregion
	//#region == 个人信息 ======================
	/**
	 * 设置昵称
	 * @param nickname 新昵称
	 */
	@api
	async setNickname(nickname: string): Promise<true | undefined> {
		await this.callApi('SetNickname', { new_nickname: nickname })
		return true
	}
	/**
	 * 设置个性签名
	 * @param sign 新签名
	 */
	@api
	async setSign(sign: string): Promise<true | undefined> {
		await this.callApi('SetBio', { new_bio: sign })
		return true
	}
	/**
	 * 删除好友
	 * @param userId 好友id
	 */
	@api
	async deleteFriend(userId: number): Promise<true | false> {
		// 1.1 起才支持
		if (versionCompare(this.milkyVersion, '1.1') === -1) return false
		await this.callApi('DeleteFriend', { user_id: userId })
		return true
	}
	//#endregion
	//#endregion

	//#region == 消息相关 ===========================================
	/**
	 * 解析消息
	 * @param data 收到的消息
	 * @returns 标准消息数据
	 */
	async parseMsg(data: IncomingMessage): Promise<MsgData> {
		const message = await this.parseSeg(data.segments, data)

		// 组装发送者信息
		let sender: UserData
		switch (data.message_scene) {
			case 'friend':
				sender = this.parseFriend(data.friend)
				break
			case 'group':
				sender = this.parseMember(
					data.group_member,
					data.group.group_id,
				)
				break
			case 'temp':
				sender = this.buildUnknownUser(data.sender_id)
				break
		}

		return {
			message_id: data.message_seq.toString(),
			session: this.parseSession(data),
			sender: sender,
			time: data.time,
			message: message,
			isDelete: this.isDelete(data),
		}
	}
	/**
	 * 分析收到消息的会话
	 * @param data 收到的消息
	 * @returns 会话数据
	 */
	parseSession(data: IncomingMessage): SessionData {
		// 组装会话信息
		switch (data.message_scene) {
			case 'friend':
				return {
					id: data.peer_id.toString(),
					type: 'user',
				}
			case 'group':
				return {
					id: data.peer_id.toString(),
					type: 'group',
				}
			case 'temp':
				return {
					id: data.peer_id.toString(),
					group_id: data.group?.group_id.toString(),
					type: 'temp',
				}
		}
	}
	/**
	 * 序列化消息
	 * @param msg 消息
	 * @returns 发送消息数据
	 */
	async serializeMsg(msg: Msg): Promise<OutgoingSegment[]> {
		return await Promise.all(
			msg.message.map((seg) => this.serializeSeg(seg)),
		)
	}
	//#region == 反序列化 ===========================
	segParsers: Record<
		string,
		(data: any, msg?: IncomingMessage) => Promise<SegData[]>
	> = {}
	async parseSeg(
		data: IncomingSegment,
		msg?: IncomingMessage,
	): Promise<SegData[]>
	async parseSeg(
		data: IncomingSegment[],
		msg?: IncomingMessage,
	): Promise<SegData[]>
	async parseSeg(
		data: IncomingSegment | IncomingSegment[],
		msg?: IncomingMessage,
	): Promise<SegData[]> {
		if (Array.isArray(data)) {
			const segsList = await Promise.all(
				data.map((d) => this.parseSeg(d, msg)),
			)
			const result: SegData[] = []
			for (const segs of segsList) {
				result.push(...segs)
			}
			return result
		} else {
			try {
				const parser = this.segParsers[data.type]
				if (parser) return await parser(data, msg)
				return [this.unknownParser(data, msg)]
			} catch (err) {
				logger.error(
					err as Error,
					'消息段解析失败:' + JSON.stringify(data),
				)
				return [{ type: 'error' }]
			}
		}
	}
	async textParser(
		data: ISeg.TextSeg,
		_?: IncomingMessage,
	): Promise<(TextSegData | LinkSegData | BreakSegData)[]> {
		const result: (TextSegData | LinkSegData | BreakSegData)[] = []
		for (const seg of data.data.text.split('\n')) {
			const textAndLinkList = parseUrlFromMsg(seg)
			for (const textOrLink of textAndLinkList) {
				if (textOrLink.type === 'txt') {
					result.push({
						type: 'text',
						text: textOrLink.content,
					})
				} else {
					const name = textOrLink.content
					const url = name.startsWith('http')
						? name
						: `https://${name}`
					result.push({
						type: 'link',
						name,
						url,
					})
				}
			}
			result.push({ type: 'break' })
		}

		result.pop()

		return result
	}
	async imageParser(
		data: ISeg.ImageSeg,
		_?: IncomingMessage,
	): Promise<ImgSegData[]> {
		return [
			{
				type: 'image',
				url: Resource.fromUrl(
					data.data.temp_url,
					data.data.resource_id,
				),
				isFace: data.data.sub_type === 'sticker',
				width: data.data.width,
				height: data.data.height,
			},
		]
	}
	async marketFaceParser(
		data: ISeg.MarketFaceSeg,
		_?: IncomingMessage,
	): Promise<MfaceSegData[]> {
		return [
			{
				type: 'mface',
				url: data.data.url,
				summary: data.data.summary,
				packageId: data.data.emoji_package_id,
				id: data.data.emoji_id,
				key: data.data.key,
			},
		]
	}
	async v1MarketFaceParser(
		data: ISeg.MarketFaceSeg,
		_?: IncomingMessage,
	): Promise<MfaceSegData[]> {
		return [
			{
				type: 'mface',
				url: data.data.url,
				summary: '[动画表情]',
				packageId: 0,
				id: '',
				key: '',
			},
		]
	}
	async faceParser(
		data: ISeg.FaceSeg,
		_?: IncomingMessage,
	): Promise<FaceSegData[] | SuperFaceSegData[]> {
		if (data.data.is_large)
			return [
				{
					type: 'super-face',
					id: data.data.face_id,
				},
			]
		else
			return [
				{
					type: 'face',
					id: data.data.face_id,
				},
			]
	}
	async v1FaceParser(
		data: ISeg.FaceSeg,
		msg?: IncomingMessage,
	): Promise<FaceSegData[] | SuperFaceSegData[]> {
		const id = Number(data.data.face_id)
		if (msg?.segments.length === 1 && Emoji.superList.includes(id))
			return [{ type: 'super-face', id: data.data.face_id }]
		else return [{ type: 'face', id: data.data.face_id }]
	}
	async mentionParser(
		data: ISeg.MentionSeg,
		_?: IncomingMessage,
	): Promise<AtSegData[]> {
		return [
			{
				type: 'at',
				user_id: data.data.user_id.toString(),
			},
		]
	}
	async mentionAllParser(
		_data: ISeg.MentionAllSeg,
		_?: IncomingMessage,
	): Promise<AtAllSegData[]> {
		return [
			{
				type: 'atall',
			},
		]
	}
	async videoParser(
		data: ISeg.VideoSeg,
		_?: IncomingMessage,
	): Promise<VideoSegData[]> {
		return [
			{
				type: 'video',
				file: $t('[视频]'),
				url: Resource.fromUrl(
					data.data.temp_url,
					data.data.resource_id,
				),
			},
		]
	}
	async forwardParser(
		data: ISeg.ForwardSeg,
		_?: IncomingMessage,
	): Promise<ForwardSegData[]> {
		const id: string = data.data.forward_id
		const nodes = await this.getForwardMsg(id)
		if (!nodes) throw new Error('获取合并转发消息失败')
		return [
			{
				type: 'forward',
				id,
				content: nodes,
			},
		]
	}
	async replyParser(
		data: ISeg.ReplySeg,
		_?: IncomingMessage,
	): Promise<ReplySegData[]> {
		return [
			{
				type: 'reply',
				id: data.data.message_seq.toString(),
			},
		]
	}
	async fileParser(
		data: ISeg.FileSeg,
		msg?: IncomingMessage,
	): Promise<FileSegData[]> {
		let url: string
		try {
			if (msg?.message_scene === 'group') {
				const re = await this.callApi('GetGroupFileDownloadUrl', {
					group_id: msg.peer_id,
					file_id: data.data.file_id,
				})
				url = re.download_url
			} else if (msg?.message_scene === 'friend') {
				const runtimeData = useRuntimeData()
				const re = await this.callApi('GetPrivateFileDownloadUrl', {
					user_id: msg.peer_id,
					file_id: data.data.file_id,
					file_hash: data.data.file_hash!,
					// 1.3 起才支持，低版本省略以走协议端默认值
					is_self_send:
						versionCompare(this.milkyVersion, '1.3') === -1
							? undefined
							: msg.sender_id ===
								Number(runtimeData.loginInfo?.uin),
				})
				url = re.download_url
			} else {
				url = ''
			}
		} catch {
			url = ''
		}
		return [
			{
				type: 'file',
				name: data.data.file_name,
				size: data.data.file_size,
				url: `${url}${data.data.file_name}`,
				file_id: data.data.file_id,
			},
		]
	}
	// async pokeParser(_: ObPokeSeg): Promise<PokeSegData> {
	//     return { type: 'poke' }
	// }
	async xmlParser(
		data: ISeg.XmlSeg,
		_?: IncomingMessage,
	): Promise<XmlSegData[]> {
		return [
			{
				type: 'xml',
				data: data.data.xml_payload,
				id: data.data.service_id.toString(),
			},
		]
	}
	async markdownParser(
		data: ISeg.MarkdownSeg,
		_?: IncomingMessage,
	): Promise<SegData[]> {
		return await parseMarkdown(data.data.content, {
			image: async (node) => {
				const url = node.url ?? ''
				// alt 形如 "图片 #1050px #3109px"
				const imageSizeRe =
					/^(.*?)\s*#\s*(\d+(?:\.\d+)?)px\s*#\s*(\d+(?:\.\d+)?)px\s*$/
				const size = imageSizeRe.exec(node.alt ?? '')
				const seg: ImgSegData = {
					type: 'image',
					url: Resource.fromUrl(url),
					isFace: false,
				}
				if (size) {
					seg.summary = size[1].trim() || undefined
					seg.width = Math.round(Number(size[2]))
					seg.height = Math.round(Number(size[3]))
				} else if (node.alt) {
					seg.summary = node.alt
				}
				return [seg as ImgSegData]
			},
			link: async (node, parser) => {
				const url = node.url ?? ''
				const name = parser.getPlaintext(node.children ?? []).trim()

				if (url.startsWith('%7B%22version%22%3A')) return []

				// 回复人
				if (url.startsWith('mqqapi://markdown/mention?')) {
					const arg = new URL(url).searchParams
					return [
						{
							type: 'at',
							user_id: arg.get('at_tinyid') ?? '0',
						} as AtSegData,
					]
				}

				// 按钮消息
				// "mqqapi://aio/inlinecmd?command=%E7%AD%BE%E5%88%B0%E8%AE%BE%E7%BD%AE&enter=false&reply=false"
				if (url.startsWith('mqqapi://')) {
					return [
						{
							type: 'button',
							cmd: 'todo',
							name: name,
						} as ButtonSegData,
					]
				}

				return [{ type: 'link', url, name: name || url } as LinkSegData]
			},
		})
	}
	async lightAppParser(
		data: ISeg.LightAppSeg,
		_?: IncomingMessage,
	): Promise<JsonSegData[] | ForwardSegData[]> {
		if (data.data.app_name === 'com.tencent.multimsg') {
			const jsonData = JSON.parse(data.data.json_payload)
			const forwardId = jsonData['meta']['detail']['resid']
			if (!forwardId) throw new Error('获取合并转发消息ID失败')
			const nodes = await this.getForwardMsg(forwardId)
			if (!nodes) throw new Error('获取合并转发消息失败')
			return [
				{
					type: 'forward',
					id: forwardId,
					content: nodes,
				},
			]
		}

		return [
			{
				type: 'json',
				data: data.data.json_payload,
				id: data.data.app_name,
			},
		]
	}

	unknownParser(data: IncomingSegment, _?: IncomingMessage): UnknownSegData {
		return {
			type: 'unknown',
			segType: data.type,
			data: data,
		}
	}
	async nodeParser(
		data: IncomingForwardedMessage,
		_?: IncomingMessage,
	): Promise<ForwardNodeData> {
		const sender = this.buildUnknownUser(0)
		sender.id = undefined
		sender.avatar = data.avatar_url
		sender.nickname = data.sender_name
		return {
			sender,
			content: await this.parseSeg(data.segments),
		}
	}
	//#endregion

	//#region == 序列化 =============================
	segSerializer: Record<string, (data: any) => Promise<OutgoingSegment>> = {}
	async serializeSeg(seg: Seg): Promise<OutgoingSegment>
	async serializeSeg(seg: Seg[]): Promise<OutgoingSegment[]>
	async serializeSeg(
		seg: Seg | Seg[],
	): Promise<OutgoingSegment | OutgoingSegment[]> {
		if (Array.isArray(seg)) {
			const originSegs = await Promise.all(
				seg.map((d) => this.serializeSeg(d)),
			)
			let result: OutgoingSegment[] = []
			let cacheText = ''
			for (const originSeg of originSegs) {
				if (originSeg.type === 'text') {
					cacheText += originSeg.data.text
				} else {
					if (cacheText) {
						result.push({
							type: 'text',
							data: {
								text: cacheText,
							},
						})
						cacheText = ''
					}
					result.push(originSeg)
				}
			}
			if (cacheText) {
				result.push({
					type: 'text',
					data: {
						text: cacheText,
					},
				})
				cacheText = ''
			}
			return result
		} else {
			const serializer = this.segSerializer[seg.type]
			if (serializer) return await serializer(seg)
			return this.unmatchSerializer(seg)
		}
	}
	protected readonly mdSegs = [
		BlockquoteSeg,
		BreakSeg,
		DeleteSeg,
		EmphasisSeg,
		HeadingSeg,
		InlineCodeSeg,
		LinkSeg,
		ListSeg,
		StrongSeg,
		TableSeg,
		TextSeg,
		ThematicBreakSeg,
	]
	async mdSegSerializer(seg: Seg): Promise<OSeg.TextSeg> {
		return {
			type: 'text',
			data: {
				text: seg.plaintext(),
			},
		}
	}
	async buttonSerialize(seg: ButtonSeg): Promise<OSeg.TextSeg> {
		return {
			type: 'text',
			data: {
				text: `[按钮:${seg.name}]`,
			},
		}
	}
	async textSerializer(seg: TextSeg): Promise<OSeg.TextSeg> {
		return {
			type: 'text',
			data: {
				text: seg.text,
			},
		}
	}
	async imageSerializer(seg: ImgSeg): Promise<OSeg.ImageSeg> {
		return {
			type: 'image',
			data: {
				uri: seg.rawUrl,
				sub_type: seg.isFace ? 'sticker' : 'normal',
			},
		}
	}
	async faceSerializer(seg: FaceSeg): Promise<OSeg.FaceSeg> {
		return {
			type: 'face',
			data: {
				face_id: seg.id.toString(),
				is_large: false,
			},
		}
	}
	async superFaceSerializer(seg: SuperFaceSeg): Promise<OSeg.FaceSeg> {
		return {
			type: 'face',
			data: {
				face_id: seg.id.toString(),
				is_large: true,
			},
		}
	}
	async atSerializer(seg: AtSeg): Promise<OSeg.MentionSeg> {
		return {
			type: 'mention',
			data: {
				user_id: Number(seg.user_id),
			},
		}
	}
	async atallSerializer(_: AtAllSeg): Promise<OSeg.MentionAllSeg> {
		return {
			type: 'mention_all',
			data: {},
		}
	}
	async videoSerializer(seg: VideoSeg): Promise<OSeg.VideoSeg> {
		return {
			type: 'video',
			data: {
				uri: seg.rawUrl,
			},
		}
	}
	async forwardSerializer(seg: ForwardSeg): Promise<OSeg.ForwardSeg> {
		const msgs = seg.content
		const messagesList = await Promise.all(
			msgs.map((msg) => this.serializeMsg(msg)),
		)
		const out: OSeg.ForwardSeg = {
			type: 'forward',
			data: {
				messages: [],
			},
		}
		for (let i = 0; i < messagesList.length; i++) {
			const senderId = Number(msgs[i].sender.user_id)
			out.data.messages.push({
				user_id: senderId === 0 ? 1094950020 : senderId,
				sender_name: msgs[i].sender.name,
				segments: messagesList[i],
			})
		}

		return out
	}
	async replySerializer(seg: ReplySeg): Promise<OSeg.ReplySeg> {
		return {
			type: 'reply',
			data: {
				message_seq: Number(seg.id),
			},
		}
	}
	async mfaceSerializer(data: MfaceSeg): Promise<OSeg.ImageSeg> {
		return {
			type: 'image',
			data: {
				uri: data.rawUrl,
				sub_type: 'sticker',
				summary: data.summary,
			},
		}
	}
	// async pokeSerializer(_: PokeSeg): Promise<ObPokeSeg> {
	//     return {
	//         type: 'poke',
	//         data: {
	//             type: '1',
	//             id: '-1',
	//         }
	//     }
	// }
	async xmlSerializer(_: XmlSeg): Promise<OSeg.XmlSeg> {
		throw new Error('不支持发送xml消息')
	}
	async jsonSerializer(_: JsonSeg): Promise<OSeg.LightAppSeg> {
		throw new Error('不支持发送json消息')
	}
	async unknownSerializer(seg: UnknownSeg): Promise<OutgoingSegment> {
		return seg.data as OutgoingSegment
	}

	async nodeSerializer(msg: Msg): Promise<OutgoingForwardedMessage> {
		return {
			sender_name: msg.sender.name,
			user_id: Number(msg.sender.user_id),
			segments: await this.serializeSeg(msg.message),
		}
	}
	unmatchSerializer(seg: Seg): OutgoingSegment {
		const data = {}
		for (const key in seg) {
			if (key === 'type') continue
			data[key] = seg[key]
		}
		return {
			type: seg.type as any,
			data: data,
		}
	}

	/**
	 * 序列化构造合并转发
	 * @param seg
	 * @returns
	 */
	async customForwardSerializer(seg: ForwardSeg): Promise<OSeg.ForwardSeg[]> {
		const msgs = seg.content
		const messagesList = await Promise.all(
			msgs.map((msg) => this.serializeMsg(msg)),
		)
		const out: OSeg.ForwardSeg = {
			type: 'forward',
			data: {
				messages: [],
			},
		}
		for (let i = 0; i < messagesList.length; i++) {
			out.data.messages.push({
				user_id: Number(msgs[i].sender.user_id),
				sender_name: msgs[i].sender.name,
				segments: messagesList[i],
			})
		}
		return [out]
	}
	//#endregion
	//#endregion

	//#region == 事件处理 ===========================================
	eventProcessers: Record<
		MilkyEventType,
		(event: MilkyEvent, data: any) => Promise<EventData | undefined>
	> = {} as any
	async messageReceiveEvent(
		event: MilkyEvent,
		data: IncomingMessage,
	): Promise<MsgEventData> {
		// oxlint-disable-next-line no-shadow
		const process = async (data: IncomingMessage) => {
			const msgData = await this.parseMsg(data)
			const out: MsgEventData = {
				type: 'msg',
				message: msgData,
				message_id: msgData.message_id!,
				session: msgData.session,
				time: event.time,
			}
			return out
		}
		return await queueWait(
			process(data),
			`${data.message_scene}-${data.peer_id}`,
		)
	}
	async groupMemberIncreaseEvent(
		event: MilkyEvent,
		data: GroupMemberIncreaseEventData,
	): Promise<JoinEventData> {
		return {
			type: 'join',
			session: {
				id: data.group_id.toString(),
				type: 'group',
			},
			user: await this.getMemberFromGroup(data.user_id, data.group_id),
			operator: data.operator_id
				? await this.getMemberFromGroup(data.user_id, data.group_id)
				: undefined,
			inviter: data.invitor_id
				? await this.getMemberFromGroup(data.invitor_id, data.group_id)
				: undefined,
			time: event.time,
		}
	}
	async groupMemberDecreaseEvent(
		event: MilkyEvent,
		data: GroupMemberDecreaseEventData,
	): Promise<LeaveEventData> {
		const user = await this.getMemberFromGroup(data.user_id, data.group_id)
		let operator: UserData = user
		if (data.operator_id)
			operator = await this.getMemberFromGroup(
				data.operator_id,
				data.group_id,
			)
		else {
			const operatorData = data.operator_id
				? await this.callApi('GetGroupMemberInfo', {
						group_id: data.group_id,
						user_id: data.operator_id,
					})
				: undefined
			operator = operatorData
				? this.parseMember(operatorData.member, data.group_id)
				: this.buildUnknownUser(data.user_id)
		}

		return {
			type: 'leave',
			session: {
				id: data.group_id.toString(),
				type: 'group',
			},
			user,
			operator,
			time: event.time,
		}
	}
	async groupBanEvent(
		event: MilkyEvent,
		data: GroupMuteEventData,
	): Promise<BanEventData | BanLiftEventData> {
		if (data.duration > 0) {
			return {
				type: 'ban',
				session: {
					id: data.group_id.toString(),
					type: 'group',
				},
				user: await this.getMemberFromGroup(
					data.user_id,
					data.group_id,
				),
				operator: await this.getMemberFromGroup(
					data.operator_id,
					data.group_id,
				),
				duration: data.duration,
				time: event.time,
			}
		} else {
			return {
				type: 'banLift',
				session: {
					id: data.group_id.toString(),
					type: 'group',
				},
				user: await this.getMemberFromGroup(
					data.user_id,
					data.group_id,
				),
				operator: await this.getMemberFromGroup(
					data.operator_id,
					data.group_id,
				),
				time: event.time,
			}
		}
	}
	async recallEvent(
		event: MilkyEvent,
		data: MessageRecallEventData,
	): Promise<RecallEventData> {
		return {
			type: 'recall',
			session: {
				id: data.peer_id.toString(),
				type: this.parseScene(data.message_scene),
			},
			user: this.buildUnknownUser(data.sender_id),
			operator: this.buildUnknownUser(data.operator_id),
			recallId: data.message_seq.toString(),
			time: event.time,
			suffix: data.display_suffix ?? '',
		}
	}
	async pokeEvent(
		event: MilkyEvent,
		data: GroupNudgeEventData,
	): Promise<PokeEventData> {
		return {
			type: 'poke',
			session: {
				id: data.group_id.toString(),
				type: 'group',
			},
			sender: this.buildUnknownUser(data.sender_id),
			target: this.buildUnknownUser(data.receiver_id),
			action: data.display_action ?? '戳了戳',
			suffix: data.display_suffix ?? '',
			ico:
				data.display_action_img_url ??
				'https://tianquan.gtimg.cn/nudgeaction/item/0/expression.jpg',
			time: event.time,
		}
	}
	async groupMessageReaction(
		event: MilkyEvent,
		data: GroupMessageReactionEventData,
	): Promise<ResponseEventData> {
		return {
			type: 'response',
			session: {
				id: data.group_id.toString(),
				type: 'group',
			},
			operator: await this.getMemberFromGroup(
				data.user_id,
				data.group_id,
			),
			message_id: data.message_seq.toString(),
			emojiId: data.face_id,
			add: data.is_add,
			time: event.time,
		}
	}
	async friendPokeEvent(
		event: MilkyEvent,
		data: FriendNudgeEventData,
	): Promise<PokeEventData> {
		const runtimeData = useRuntimeData()
		const selfId = runtimeData.loginInfo?.uin ?? 0
		return {
			type: 'poke',
			session: {
				id: data.user_id.toString(),
				type: 'user',
			},
			sender: this.buildUnknownUser(
				data.is_self_send ? selfId : data.user_id,
			),
			target: this.buildUnknownUser(
				data.is_self_receive ? selfId : data.user_id,
			),
			action: data.display_action ?? '戳了戳',
			suffix: data.display_suffix ?? '',
			ico:
				data.display_action_img_url ??
				'https://tianquan.gtimg.cn/nudgeaction/item/0/expression.jpg',
			time: event.time,
		}
	}
	async groupDisbandEvent(
		event: MilkyEvent,
		data: GroupDisbandEventData,
	): Promise<LeaveEventData> {
		const runtimeData = useRuntimeData()
		const selfId = runtimeData.loginInfo?.uin ?? data.operator_id
		return {
			type: 'leave',
			session: {
				id: data.group_id.toString(),
				type: 'group',
			},
			// 群解散视同自身被移出群聊
			user: await this.getMemberFromGroup(Number(selfId), data.group_id),
			operator: await this.getMemberFromGroup(
				data.operator_id,
				data.group_id,
			),
			time: event.time,
		}
	}

	/**
	 * 机器人离线：QQ 账号掉线但协议端仍然在线，走与重连失败相同的失联路径
	 * （login 层负责清理 nowAdapter 并弹出登录窗）
	 */
	async botOfflineEvent(
		_: MilkyEvent,
		data: BotOfflineEventData,
	): Promise<undefined> {
		logger.error(null, `Milky 机器人离线: ${data.reason}`)
		emitConnectionLost()
		return undefined
	}

	async handleEvent(json: string): Promise<void> {
		let raw: unknown
		try {
			raw = JSON.parse(json)
		} catch {
			logger.error(new Error('事件解析失败'), json)
			return
		}
		const data = safeParseEvent(raw)
		if (!data) return
		const processor = this.eventProcessers[data.event_type]
		if (!processor) return
		const eventData = await processor(data, data.data)
		if (!eventData) return
		handleEvent(eventData)
	}
	//#endregion

	//#region == 私有工具 ===========================================
	protected async callApi<K extends MilkyApiName>(
		apiName: K,
		args: ApiInput<K>,
	): Promise<ApiOutput<K>> {
		const sendArg = parseApiInput(apiName, args)
		const apiPath = camelCaseToUnderline(apiName)
		// HTTP 通道受 WS 连接状态门禁，断线时不能静默发出请求
		if (!this.connection.isConnected()) throw new Error('未与协议段连接')
		const json = await this.connection.http.post(
			`api/${apiPath}`,
			sendArg as Record<string, any>,
		)
		if (!json) throw new Error('未与协议段连接')
		const data = JSON.parse(json) as
			| { status: 'ok'; retcode: 0; data: unknown }
			| { status: 'failed'; retcode: number; message: string }

		if (data.status === 'ok') return parseApiOutput(apiName, data.data)
		throw new Error(
			`API调用失败: ${data.message} (retcode: ${data.retcode})`,
		)
	}

	@api
	protected async _getHistoryMsg(
		session: Session,
		startId: number | undefined,
		limit: number,
	): Promise<GetHistoryMessagesOutput> {
		const data = await this.callApi('GetHistoryMessages', {
			message_scene: this.getScene(session.type),
			peer_id: Number(session.id),
			start_message_seq: startId,
			limit: limit,
		})
		if (data.messages.at(-1)?.message_seq === startId) data.messages.pop() // 移除起始消息
		return data
	}
	protected getScene(
		type: 'user' | 'group' | 'temp',
	): 'friend' | 'group' | 'temp' {
		switch (type) {
			case 'user':
				return 'friend'
			case 'group':
				return 'group'
			case 'temp':
				return 'temp'
		}
	}
	protected parseScene(
		type: 'group' | 'temp' | 'friend',
	): 'user' | 'group' | 'temp' {
		switch (type) {
			case 'friend':
				return 'user'
			case 'group':
				return 'group'
			case 'temp':
				return 'temp'
		}
	}
	protected async parseFiles(
		data: GetGroupFilesOutput,
		groupId: number,
	): Promise<FilesData> {
		return {
			files: await Promise.all(
				data.files.map(async (file) => ({
					file_id: file.file_id,
					file_name: file.file_name,
					size: file.file_size,
					download_times: file.downloaded_times,
					dead_time: file.expire_time ?? undefined,
					upload_time: file.uploaded_time,
					uploader: await this.getMemberFromGroup(
						file.uploader_id,
						groupId,
					),
				})),
			),
			folders: await Promise.all(
				data.folders.map(async (folder) => ({
					folder_id: folder.folder_id,
					folder_name: folder.folder_name,
					count: folder.file_count,
					create_time: folder.created_time,
					creator: await this.getMemberFromGroup(
						folder.creator_id,
						groupId,
					),
				})),
			),
		}
	}
	protected isDelete(msg: IncomingMessage): boolean {
		return msg.sender_id === 0
	}
	protected async getMemberFromGroup(
		memberId: number,
		groupId: number,
	): Promise<UserData> {
		const member = await this.callApi('GetGroupMemberInfo', {
			group_id: groupId,
			user_id: memberId,
		})

		return member
			? this.parseMember(member.member, groupId)
			: this.buildUnknownUser(memberId)
	}
	//#region == 用户相关 =======================
	protected buildUnknownUser(
		id: number | string,
		nickname?: string,
	): UserData {
		return {
			id: id.toString(),
			regTime: 0,
			avatar: this.getUserAvatar(id),
			nickname: nickname ?? id.toString(),
			bot: this.isRobot(id),
			age: 0,
			sex: getGender('unknown'),
		}
	}
	protected parseFriend(friend: FriendEntity): UserData {
		const data = this.buildUnknownUser(friend.user_id)
		data.nickname = friend.nickname
		data.remark =
			friend.remark === friend.nickname ? undefined : friend.remark
		data.class = {
			id: (friend.category?.category_id ?? 495).toString(),
			name: friend.category?.category_name ?? '未分组的好友',
		}
		return data
	}
	protected parseMember(
		member: GroupMemberEntity,
		groupId: string | number,
	): MemberData {
		const data = this.buildUnknownUser(member.user_id) as MemberData

		data.card = member.card === '' ? undefined : member.card
		data.group_id = groupId.toString()
		data.join_time = member.join_time
		data.last_sent_time = member.last_sent_time
		data.nickname = member.nickname
		data.role = getRole(member.role)
		data.sex = getGender(member.sex)
		data.title = member.title
		data.unfriendly = false
		data.banTime = member.shut_up_end_time ?? undefined

		const titleInfo: string[] = [`Lv.${member.level ?? 1}`]
		if (member.title) titleInfo.push(member.title)

		data.title = titleInfo.join(' ')

		return data
	}
	//#endregion
	//#region == 头像相关 =======================
	protected getUserAvatar(id: number | string): string {
		return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${id}`
	}
	protected getGroupAvatar(id: number | string): string {
		return `https://p.qlogo.cn/gh/${id}/${id}/0`
	}
	//#endregion
	protected isRobot(id: string | number): boolean {
		id = +id
		if (id >= 4010000000 && id <= 4019999999) return true
		if (id >= 2854196301 && id <= 2854216399) return true
		if (id >= 3889000000 && id <= 3889999999) return true
		if (id === 66600000) return true
		return false
	}
	//#endregion
}

export default new MilkyAdapter()
