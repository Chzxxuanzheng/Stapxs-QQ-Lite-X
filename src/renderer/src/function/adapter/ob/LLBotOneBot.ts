import { GroupFile, GroupFileFolder } from '@renderer/function/model/file'
import { Msg } from '@renderer/function/model/msg'
import { Resource } from '@renderer/function/model/resource'
import {
	FaceSeg,
	FileSeg,
	ForwardSeg,
	ImgSeg,
	MdSeg,
	MfaceSeg,
	SuperFaceSeg,
} from '@renderer/function/model/seg'
import {
	GroupSession,
	Session,
	UserSession,
} from '@renderer/function/model/session'
import { Member } from '@renderer/function/model/user'
import {
	EssenceData,
	EssenceSeg,
	FaceSegData,
	FilesData,
	FileSegData,
	ForwardNodeData,
	FriendData,
	GroupAnnouncementData,
	ImgSegData,
	ImplInfo,
	MdSegData,
	MessageEventData,
	MfaceSegData,
	MsgData,
	PokeEventData,
	ResponseEventData,
	SuperFaceSegData,
	UserData,
} from '@renderer/function/adapter/interface'
import { api, OneBotAdapter } from '@renderer/function/adapter/ob/adapter'
import {
	createSender,
	fileToBase64,
	getGender,
	ObConnector,
} from '@renderer/function/adapter/ob/utils'
import type {
	LlbotObCreateGroupFileFolder,
	LlbotObFaceSeg,
	LlbotObFetchCustomFace,
	LlbotObFileSeg,
	LlbotObForwardNode,
	LlbotObGetEssenceMsgList,
	LlbotObGetForwardMsg,
	LlbotObGetFriendsWithCategory,
	LlbotObGetGroupFiles,
	LlbotObGetGroupFileUrl,
	LlbotObGetGroupNotice,
	LlbotObGetMsgHistory,
	LlbotObGetStrangerInfo,
	LlbotObGroupMsgEmojiLikeEvent,
	LlbotObImageSeg,
	LlbotObMdSeg,
	LlbotObMessageSendEvent,
	LlbotObMfaceSeg,
	LlbotObMsg,
	LlbotObPokeEvent,
	LlbotObUploadGroupFile,
	LlbotObUploadPrivateFile,
	ObForwardNodeSeg,
	ObForwardSeg,
	ObGetVersionInfo,
	ObMessageEvent,
	ObMsg,
	ObSendMsg,
	RkeyType,
} from '@renderer/function/adapter/ob/type'
import Emoji from '@renderer/function/model/emoji'

export default class LLBTOneBot extends OneBotAdapter {
	override name = 'LuckyLillia OneBot'
	override version = '0.0.1'
	constructor(connector: ObConnector, botInfo?: ObGetVersionInfo) {
		super()
		this.connector = connector
		this.botInfo.value = botInfo
		connector.setOnMessageHook(this.onmessage.bind(this))
	}

	static match(implInfo: ImplInfo): boolean {
		return implInfo.name === 'LLOneBot'
	}

	protected override init(): void {
		super.init()
		this.segParsers['markdown'] = this.mdParser.bind(this)
		this.segParsers['face'] = this.llbotFaceParser.bind(this)
		this.segParsers['mface'] = this.mfaceParser.bind(this)
		this.segParsers['file'] = this.fileParser.bind(this)

		this.segSerializer['markdown'] = this.mdSerializer.bind(this)
		this.segSerializer['face'] = this.llbotFaceSerializer.bind(this)
		this.segSerializer['super-face'] =
			this.llbotSuperFaceSerializer.bind(this)
		this.segSerializer['mface'] = this.mfaceSerializer.bind(this)
		this.segSerializer['file'] = this.fileSerializer.bind(this)

		this.eventProcessers['message_sent'] = this.messageSentEvent.bind(this)
		this.noticeEventProcessers['group_msg_emoji_like'] =
			this.groupMsgEmojiLikeEvent.bind(this)
		this.remarkCache = undefined
	}

	//#region == API ===============================================
	//#region == 获取信息 ======================
	private remarkCache: undefined | Map<number, string>
	@api
	override async getFriendList(_?: boolean): Promise<FriendData[]> {
		const data: LlbotObGetFriendsWithCategory = await this.connector.send(
			'get_friends_with_category',
			{},
		)
		const out: FriendData[] = []
		this.remarkCache = new Map<number, string>()
		for (const category of data.data) {
			for (const friend of category.buddyList) {
				this.remarkCache.set(Number(friend.user_id), friend.remark)
				out.push({
					user_id: Number(friend.user_id),
					nickname: friend.nickname,
					remark: friend.remark,
					class_id: category.categoryId,
					class_name: category.categoryName,
				})
			}
		}
		return out
	}
	@api
	override async getUserInfo(userId: number, _?: boolean): Promise<UserData> {
		if (!this.remarkCache) await this.getFriendList()
		// 获取用户信息
		const data: LlbotObGetStrangerInfo = await this.connector.send(
			'get_stranger_info',
			{
				user_id: userId,
			},
		)
		const user = data.data
		if (!this.friendListCache) await this.getFriendList()
		return {
			id: userId,
			remark: this.remarkCache!.get(userId),
			nickname: user.nickname,
			longNick: user.long_nick === '' ? undefined : user.long_nick,
			qid: user.qid,
			country: user.country === '' ? undefined : user.country,
			province: undefined,
			city: user.city === '' ? undefined : user.city,
			regTime: user.reg_time,
			qqLevel: user.level,
			birthday_year:
				user.birthday_year === 0 ? undefined : user.birthday_year,
			birthday_month:
				user.birthday_month === 0 ? undefined : user.birthday_month,
			birthday_day:
				user.birthday_day === 0 ? undefined : user.birthday_day,
			age: user.age,
			sex: getGender(user.sex),
		}
	}
	/**
	 * 获取群公告信息
	 * @param group
	 */
	@api
	async getGroupAnnouncement(
		group: GroupSession,
	): Promise<GroupAnnouncementData[]> {
		// 获取群公告信息
		const data: LlbotObGetGroupNotice = await this.connector.send(
			'_get_group_notice',
			{
				group_id: group.id,
			},
		)

		const out = data.data.map((item) => ({
			content: item.message.text,
			img: item.message.images.at(0)
				? `https://p.qlogo.cn/gdynamic/${item.message.images.at(0)!.id}/0/`
				: undefined,
			time: item.publish_time,
			sender: item.sender_id,
		}))
		return out
	}
	@api
	async getGroupEssence(group: GroupSession): Promise<EssenceData[]> {
		const data: LlbotObGetEssenceMsgList = await this.connector.send(
			'get_essence_msg_list',
			{
				group_id: group.id,
			},
		)

		const out: Promise<EssenceData>[] = []
		for (const item of data.data) {
			out.push(
				(async () => {
					const msg = await this.getMsg(
						group,
						String(item.message_id),
					)
					if (!msg) throw new Error('获取精华消息内容失败')
					return {
						sender: createSender(item.sender_id, item.sender_nick),
						sender_time: item.operator_time,
						operator: createSender(
							item.operator_id,
							item.operator_nick,
						),
						operator_time: item.operator_time,
						content: msg.message as EssenceSeg[],
					}
				})(),
			)
		}

		return await Promise.all(out)
	}

	@api
	async getCustomFace(): Promise<string[] | undefined> {
		const data: LlbotObFetchCustomFace = await this.connector.send(
			'fetch_custom_face',
			{},
		)

		return data.data
	}
	//#endregion
	//#region == 消息相关 ======================
	/**
	 * 设置已读消息
	 * @param session 目标会话
	 * @param msg 目标消息
	 */
	@api
	async setMsgReaded(_: Session, msg: Msg): Promise<true | undefined> {
		await this.connector.send('mark_msg_as_read', {
			message_id: msg.message_id!,
		})

		return true
	}
	@api
	override async sendMsg(msg: Msg): Promise<string> {
		if (!this.isForward(msg)) return await super.sendMsg(msg)

		// 合并转发
		const message = await this.forwardSegSerializer(
			msg.message[0] as ForwardSeg,
			true,
		)
		let data: ObSendMsg
		if (msg.session instanceof UserSession) {
			data = await this.connector.send('send_private_forward_msg', {
				user_id: msg.session.id,
				messages: message,
			})
		} else if (msg.session instanceof GroupSession) {
			data = await this.connector.send('send_group_forward_msg', {
				group_id: msg.session.id,
				messages: message,
			})
		} else {
			throw new Error('OneBot 不支持发送临时会话消息')
		}
		if (!data.data.message_id)
			throw new Error('发送消息失败，返回值无message_id')

		return data.data.message_id.toString()
	}

	@api
	async getHistoryMsg(
		session: Session,
		count: number,
		start?: Msg,
	): Promise<MsgData[] | undefined> {
		let type: 'user' | 'group'

		if (session instanceof UserSession) type = 'user'
		else if (session instanceof GroupSession) type = 'group'
		else throw new Error('不支持临时会话')

		let data: LlbotObGetMsgHistory

		if (type === 'user') {
			data = await this.connector.send('get_friend_msg_history', {
				user_id: session.id.toString(),
				count: count + 1,
				message_seq: start ? this.getMsgSeq(start) : undefined,
			})
		} else {
			data = await this.connector.send('get_group_msg_history', {
				group_id: session.id.toString(),
				count: count + 1,
				message_seq: start ? this.getMsgSeq(start) : undefined,
			})
		}

		const messages = data.data.messages

		if (start) messages.pop() // 去掉第一条，避免重复
		const out: Promise<MsgData>[] = messages.map((msg) => {
			if (msg.user_id) msg.user_id = session.id
			return this.parseMsg(msg)
		})

		return await Promise.all(out)
	}
	@api
	async sendGroupPoke(
		session: GroupSession,
		target: Member,
	): Promise<true | undefined> {
		await this.connector.send('group_poke', {
			group_id: session.id,
			user_id: target.user_id,
		})
		return true
	}
	@api
	async sendPrivatePoke(session: UserSession): Promise<true | undefined> {
		await this.connector.send('friend_poke', {
			user_id: session.id,
		})
		return true
	}
	@api
	async setResponse(
		msg: Msg,
		emojiId: string,
		add?: boolean,
	): Promise<true | undefined> {
		add ??= true
		if (add) {
			await this.connector.send('set_msg_emoji_like', {
				message_id: msg.message_id,
				emoji_id: emojiId,
			})
		} else {
			await this.connector.send('unset_msg_emoji_like', {
				message_id: msg.message_id,
				emoji_id: emojiId,
			})
		}
		return true
	}
	@api
	override async getForwardMsg(
		forwardId: string,
		msg?: LlbotObMsg,
	): Promise<ForwardNodeData[]> {
		const { data }: LlbotObGetForwardMsg = await this.connector.send(
			'get_forward_msg',
			{
				id: forwardId,
			},
		)
		return await Promise.all(
			data.messages.map((node) => this.lltbNodeParser(node, msg)),
		)
	}
	/**
	 * 获取资源url
	 * @param id 资源id
	 */
	@api
	async getResource(id: string): Promise<string | undefined> {
		const [type, url] = id.split('|||') as [RkeyType, string]
		const rkey = await this.getRkey(type)
		if (!rkey) return url
		const sep = url.includes('?') ? '&' : '?'
		return `${url}${sep}rkey=${rkey}`
	}
	//#endregion
	//#region == 群聊相关 ======================
	@api
	async setGroupName(group: GroupSession, name: string): Promise<true> {
		await this.connector.send('set_group_name', {
			group_id: group.id,
			group_name: name,
		})
		return true
	}
	@api
	async leaveGroup(group: GroupSession): Promise<true> {
		await this.connector.send('set_group_leave', { group_id: group.id })
		return true
	}
	//#endregion
	//#region == 文件相关 ======================
	@api
	async getGroupFile(group: GroupSession): Promise<FilesData> {
		const data: LlbotObGetGroupFiles = await this.connector.send(
			'get_group_root_files',
			{
				group_id: group.id,
			},
		)
		return this.parseFileData(data)
	}

	@api
	async getGroupFolderFile(
		group: GroupSession,
		folderId: string,
	): Promise<FilesData | undefined> {
		const data: LlbotObGetGroupFiles = await this.connector.send(
			'get_group_files_by_folder',
			{
				group_id: group.id,
				folder_id: folderId,
			},
		)
		return this.parseFileData(data)
	}

	@api
	async getGroupFileUrl(file: GroupFile): Promise<string | undefined> {
		const data: LlbotObGetGroupFileUrl = await this.connector.send(
			'get_group_file_url',
			{
				group_id: file.group.id,
				file_id: file.id,
			},
		)

		return `${data.data.url}${file.name}`
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
		const data: LlbotObUploadGroupFile = await this.connector.send(
			'upload_group_file',
			{
				group_id: group.id,
				file: `base64://${await fileToBase64(file)}`,
				name: file.name,
				folder_id: fold?.id,
			},
		)
		return data.data.file_id
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
		const data: LlbotObUploadPrivateFile = await this.connector.send(
			'upload_private_file',
			{
				user_id: session.id,
				file: `base64://${await fileToBase64(file)}`,
				name: file.name,
			},
		)
		return data.data.file_id
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
		const data: LlbotObCreateGroupFileFolder = await this.connector.send(
			'create_group_file_folder',
			{
				group_id: group.id,
				name: folderName,
			},
		)
		return data.data.folder_id
	}
	/**
	 * 删除群文件
	 * @param file
	 */
	@api
	async deleteGroupFile(file: GroupFile): Promise<true | undefined> {
		await this.connector.send('delete_group_file', {
			group_id: file.group.id,
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
		await this.connector.send('delete_group_folder', {
			group_id: folder.group.id,
			folder_id: folder.id,
		})
		return true
	}
	/**
	 * 重命名群文件
	 * @param file
	 * @param newName
	 */
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
		await this.connector.send('rename_group_file_folder', {
			group_id: folder.group.id,
			folder_id: folder.id,
			new_folder_name: newName,
		})
		return true
	}
	//#endregion
	//#endregion

	//#region == 消息相关 ===========================================
	override async parseMsg(msg: LlbotObMsg): Promise<MsgData> {
		const base = await super.parseMsg(msg)
		this.setMsgSeq(base, msg.message_seq)
		return base
	}
	//#region == 反序列化 ===========================
	async mdParser(data: LlbotObMdSeg, _?: ObMsg): Promise<MdSegData> {
		return {
			type: 'md',
			content: data.data.content,
		}
	}
	override async imageParser(
		data: LlbotObImageSeg,
		msg?: ObMsg,
	): Promise<ImgSegData> {
		let type: RkeyType

		if (!msg) type = 'UNKNOWN'
		else if (msg.message_type === 'private') type = 'PRIVATE'
		else type = 'GROUP'

		return {
			type: 'image',
			url: await this.createResource(data.data.url, type),
			isFace: data.data.subType === 7 || data.data.subType === 1,
			summary: data.data.summary,
		}
	}
	async llbotFaceParser(
		data: LlbotObFaceSeg,
		msg?: ObMsg,
	): Promise<FaceSegData | SuperFaceSegData> {
		const id = Number(data.data.id)
		if (data.data.sub_type === 3 && Emoji.superList.includes(id))
			return { type: 'super-face', id }
		else if (
			data.data.sub_type === undefined &&
			msg?.message.length === 1 &&
			Emoji.superList.includes(id)
		)
			return { type: 'super-face', id }
		return { type: 'face', id }
	}
	async mfaceParser(data: LlbotObMfaceSeg, _?: ObMsg): Promise<MfaceSegData> {
		return {
			type: 'mface',
			url: data.data.url,
			summary: data.data.summary,
			packageId: data.data.emoji_package_id,
			id: data.data.emoji_id,
			key: data.data.key,
		}
	}
	async fileParser(data: LlbotObFileSeg, _?: ObMsg): Promise<FileSegData> {
		return {
			type: 'file',
			name: data.data.file,
			size: Number(data.data.file_size),
			url: `${data.data.url}${data.data.file}`,
			file_id: data.data.file_id,
		}
	}
	async lltbNodeParser(
		data: LlbotObForwardNode,
		msg?: LlbotObMsg,
	): Promise<ForwardNodeData> {
		return {
			sender: {
				nickname: data.sender.nickname,
				face: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${data.sender.user_id}`,
			},
			content: await this.parseSeg(data.content, msg),
		}
	}
	//#endregion

	//#region == 序列化 =============================
	async mdSerializer(seg: MdSeg): Promise<LlbotObMdSeg> {
		return {
			type: 'markdown',
			data: {
				content: seg.content,
			},
		}
	}
	override async imageSerializer(seg: ImgSeg): Promise<LlbotObImageSeg> {
		return {
			type: 'image',
			data: {
				file: seg.url,
				url: seg.url,
				summary: seg.summary,
				subType: seg.isFace ? 7 : 0,
				file_size: undefined as any,
				type: undefined as any,
				thumb: undefined as any,
				name: undefined as any,
			},
		}
	}
	async faceSerializer(seg: FaceSeg): Promise<LlbotObFaceSeg> {
		let type: number
		if (seg.id < 222) type = 1
		else if (seg.id < 100000) type = 2
		else type = 4

		return {
			type: 'face',
			data: {
				id: seg.id,
				sub_type: type,
			},
		}
	}
	async superFaceSerializer(seg: SuperFaceSeg): Promise<LlbotObFaceSeg> {
		return {
			type: 'face',
			data: {
				id: seg.id,
				sub_type: 3,
			},
		}
	}
	async mfaceSerializer(seg: MfaceSeg): Promise<LlbotObMfaceSeg> {
		return {
			type: 'mface',
			data: {
				url: seg.url,
				summary: seg.summary,
				key: seg.key,
				emoji_id: seg.id,
				emoji_package_id: seg.packageId,
			},
		}
	}
	async fileSerializer(seg: FileSeg): Promise<LlbotObFileSeg> {
		if (!seg.file_id) throw new Error('文件消息必须有 file_id')
		return {
			type: 'file',
			data: {
				file: seg.name,
				url: seg.url,
				file_size: String(seg.size),
				file_id: seg.file_id,
				name: seg.name,
				path: undefined as any,
				thumb: undefined as any,
			},
		}
	}
	async forwardSegSerializer(seg: ForwardSeg): Promise<ObForwardNodeSeg[]>
	async forwardSegSerializer(
		seg: ForwardSeg,
		head: true,
	): Promise<ObForwardSeg>
	async forwardSegSerializer(
		seg: ForwardSeg,
		head?: true,
	): Promise<ObForwardNodeSeg[] | ObForwardSeg> {
		if (!head) {
			if (!seg.id) throw new Error('递归转发消息必须有 id')
			return {
				type: 'forward',
				data: {
					id: seg.id,
				},
			}
		}

		const serializer = async (msg: Msg) => {
			if (!this.isForward(msg)) return await this.serializeMsg(msg)
			else return this.forwardSegSerializer(msg.message[0] as ForwardSeg)
		}
		const msgs = seg.content
		const messagesList = await Promise.all(
			msgs.map((msg) => serializer(msg)),
		)
		const out: ObForwardNodeSeg[] = []
		for (let i = 0; i < messagesList.length; i++) {
			out.push({
				type: 'node',
				data: {
					nickname: msgs[i].sender.name,
					user_id: msgs[i].sender.user_id.toString(),
					content: messagesList[i],
				},
			})
		}
		return out
	}
	//#endregion
	//#endregion

	//#region == 事件处理 ===========================================
	override async pokeEvent(event: LlbotObPokeEvent): Promise<PokeEventData> {
		const re = await super.pokeEvent(event)
		re.action = event.raw_info[2].txt
		re.suffix = event.raw_info[4].txt
		re.ico = event.raw_info[1].src
		re.time = event.time
		return re
	}
	async groupMsgEmojiLikeEvent(
		event: LlbotObGroupMsgEmojiLikeEvent,
	): Promise<ResponseEventData> {
		return {
			type: 'response',
			session: {
				id: event.group_id,
				type: 'group',
			},
			operator: createSender(event.user_id),
			message_id: event.message_id.toString(),
			emojiId: event.likes[0].emoji_id,
			add: true,
			time: event.time,
		}
	}
	async messageSentEvent(
		event: LlbotObMessageSendEvent,
	): Promise<MessageEventData> {
		let data: ObMessageEvent
		if (event.message_type === 'private') {
			data = {
				time: event.time,
				self_id: event.self_id,
				post_type: 'message',
				message_type: 'private',
				sub_type: 'friend',
				message_id: event.message_id,
				user_id: event.target_id,
				message: event.message,
				raw_message: event.raw_message,
				sender: {
					user_id: event.sender.user_id,
					nickname: event.sender.nickname,
					sex: 'female',
					age: 0,
				},
			}
		} else {
			data = {
				time: event.time,
				self_id: event.self_id,
				post_type: 'message',
				message_type: 'group',
				sub_type: 'normal',
				message_id: event.message_id,
				user_id: event.sender.user_id,
				group_id: event.target_id,
				message: event.message,
				raw_message: event.raw_message,
				sender: {
					user_id: event.sender.user_id,
					nickname: event.sender.nickname,
					card: event.sender.card,
					sex: 'unknown',
					age: 0,
					area: '',
					level: '',
					role: event.sender.role,
					title: '',
				},
			}
		}
		;(data as any).message_seq = event.message_seq
		return await this.messageEvent(data)
	}
	//#endregion

	override isDelete(msg: ObMsg): boolean {
		// 判断消息是否为[已删除]消息
		return msg.message.length === 0
	}

	/**
	 * 判断一个消息是否为构建转发
	 * @param msg
	 * @returns
	 */
	private isForward(msg: Msg): boolean {
		const firstSeg = msg.message.at(0)
		if (firstSeg instanceof ForwardSeg) return true
		return false
	}

	private parseFileData(data: LlbotObGetGroupFiles): FilesData {
		return {
			files: data.data.files.map((file) => ({
				file_id: file.file_id,
				file_name: file.file_name,
				size: file.file_size,
				download_times: file.download_times,
				dead_time: file.dead_time,
				upload_time: file.upload_time,
				uploader_name: file.uploader_name,
				uploader_id: file.uploader,
			})),
			folders: data.data.folders.map((folder) => ({
				folder_id: folder.folder_id,
				folder_name: folder.folder_name,
				count: folder.total_file_count,
				create_time: folder.create_time,
				creator_name: folder.creator_name,
				creator_id: folder.creator,
			})),
		}
	}

	private readonly msgSeqCache: Map<string, number> = new Map()
	private setMsgSeq(msg: MsgData | Msg, msgSeq: number): void {
		const key = `${msg.session?.type}-${msg.session?.id}-${msg.message_id}`
		this.msgSeqCache.set(key, msgSeq)
	}
	private getMsgSeq(msg: MsgData | Msg): number | undefined {
		const key = `${msg.session?.type}-${msg.session?.id}-${msg.message_id}`
		return this.msgSeqCache.get(key)
	}

	private rkeyCache: {
		[key in RkeyType]: { value: string; time: number } | null
	} = {
		PRIVATE: null,
		GROUP: null,
		UNKNOWN: null,
	}
	@api
	/**
	 * 获取图片rkey
	 */
	private async getRkey(type: RkeyType): Promise<string | undefined> {
		if (type === 'UNKNOWN') return undefined
		const cache = this.rkeyCache[type]
		if (cache && Date.now() - cache.time < 5 * 60 * 1000) return cache.value
		const data = await this.connector.send('get_rkey', {})
		const rkey =
			type === 'GROUP' ? data.data.group_key : data.data.private_key
		this.rkeyCache[type] = { value: rkey, time: Date.now() }
		return rkey
	}

	private async createResource(
		url: string,
		type: RkeyType,
	): Promise<Resource> {
		let baseUrl: string
		try {
			const u = new URL(url)
			u.searchParams.delete('rkey')
			baseUrl = u.toString()
		} catch {
			// 回退方案：使用正则在不能用 URL 的情况下处理
			baseUrl = url.replace(/([?&])rkey=[^&]*(&?)/, (_, sep, tail) =>
				tail ? sep : '',
			)
		}
		const id = `${type}|||${baseUrl}`
		let resUrl: string
		const rkey = await this.getRkey(type)
		if (rkey) {
			const sep = baseUrl.includes('?') ? '&' : '?'
			resUrl = `${baseUrl}${sep}rkey=${rkey}`
		} else {
			resUrl = url // 无法获取 rkey，使用原始 url
		}
		return Resource.fromUrl(resUrl, id)
	}
}
