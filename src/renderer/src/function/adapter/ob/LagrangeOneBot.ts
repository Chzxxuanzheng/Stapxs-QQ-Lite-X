import { GroupFile } from '@renderer/function/model/file'
import { Msg } from '@renderer/function/model/msg'
import { Resource } from '@renderer/function/model/resource'
import {
	ForwardSeg,
	MdSeg,
	ImgSeg,
	MfaceSeg,
	FileSeg,
} from '@renderer/function/model/seg'
import {
	GroupSession,
	Session,
	UserSession,
} from '@renderer/function/model/session'
import { Member } from '@renderer/function/model/user'
import useRuntimeData from '@renderer/state/runtimeData'
import { ShallowRef } from 'vue'
import type {
	AdapterInterface,
	FriendData,
	UserData,
	GroupAnnouncementData,
	EssenceData,
	EssenceSeg,
	MsgData,
	FilesData,
	SegData,
	MdSegData,
	ImgSegData,
	MfaceSegData,
	FileSegData,
	PokeEventData,
	LeaveEventData,
	ImplInfo,
} from '../interface'
import { OneBotAdapter, api } from './adapter'
import type {
	LgrObGetVersionInfo,
	ObGetVersionInfo,
	LgrObGetFriendList,
	LgrObGetStongerInfo as LgrObGetStrangerInfo,
	LgrObGetGroupNotices,
	LgrObGetEssenceMsg,
	LgrObGetCustomFace,
	LgrObGetMsg,
	ObMsg,
	ObSendMsg,
	LgrObGetHistoryMsg,
	LgrObGetGroupFileRoot as LgrObGetGroupFile,
	LgrObGetFileUrl,
	ObForwardNodeSeg,
	LgrObMdSeg,
	LgrObImgSeg,
	LgrObMfaceSeg,
	LgrObFileSeg,
	LgrObPokeEvent,
	ObGroupDecreaseEvent,
	ObPrivateSender,
	ObGroupSender,
	ObTextSeg,
} from './type'
import { ObConnector, getGender, createSender } from './utils'

export default class LagrangeOneBot
	extends OneBotAdapter
	implements AdapterInterface
{
	override name = 'Lagrange OneBot'
	override version = '0.0.1'
	declare botInfo: ShallowRef<LgrObGetVersionInfo | undefined>
	constructor(connector: ObConnector, botInfo?: ObGetVersionInfo) {
		super()
		this.connector = connector
		this.botInfo.value = botInfo as LgrObGetVersionInfo
		connector.setOnMessageHook(this.onmessage.bind(this))
	}

	protected override init(): void {
		super.init()
		this.segParsers['markdown'] = this.mdParser.bind(this)
		this.segParsers['mface'] = this.mfaceParser.bind(this)
		this.segParsers['file'] = this.fileParser.bind(this)

		this.segSerializer['markdown'] = this.mdSerializer.bind(this)
		this.segSerializer['mface'] = this.mfaceSerializer.bind(this)
		this.segSerializer['file'] = this.fileSerializer.bind(this)
	}

	//#region == API ===============================================
	//#region == 获取信息 ======================
	@api
	override async getFriendList(
		useCache: boolean = true,
	): Promise<FriendData[]> {
		if (useCache && this.friendListCache) return this.friendListCache

		const friendData = new Map<number, FriendData>()
		// 加载好友列表
		const data: LgrObGetFriendList = await this.connector.send(
			'get_friend_list',
			{},
		)

		for (const item of data.data) {
			if (friendData.has(item.user_id)) continue
			friendData.set(item.user_id, {
				user_id: item.user_id,
				nickname: item.nickname,
				remark: item.remark === '' ? undefined : item.remark,
				class_id: item.group.group_id,
				class_name: item.group.group_name,
			})
		}

		this.friendListCache = Array.from(friendData.values())

		return this.friendListCache
	}

	@api
	override async getUserInfo(
		userId: number,
		useCache: boolean = true,
	): Promise<UserData> {
		// 获取用户信息
		const data: LgrObGetStrangerInfo = await this.connector.send(
			'get_stranger_info',
			{
				user_id: userId,
				no_cache: !useCache,
			},
		)
		const user = data.data
		if (!this.friendListCache) await this.getFriendList()
		const baseInfo = this.friendListCache?.find((f) => f.user_id === userId)
		return {
			id: user.user_id,
			remark: baseInfo?.remark,
			nickname: user.nickname,
			longNick: user.sign,
			qid: user.q_id,
			regTime: user.RegisterTime,
			qqLevel: user.level,
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
		const data: LgrObGetGroupNotices = await this.connector.send(
			'_get_group_notice',
			{ group_id: group.id },
		)

		const out = data.data.map((item) => ({
			content: item.message.text,
			img: `https://p.qlogo.cn/gdynamic/${item.message.images.at(0)?.id}/0/`,
			time: item.publish_time,
			sender: item.sender_id,
		}))
		return out
	}

	/**
	 * 获取群精华消息
	 * @param group
	 */
	@api
	async getGroupEssence(group: GroupSession): Promise<EssenceData[]> {
		const data: LgrObGetEssenceMsg = await this.connector.send(
			'get_essence_msg_list',
			{ group_id: group.id },
		)

		const out: Promise<EssenceData>[] = []
		for (const item of data.data) {
			out.push(
				(async () => ({
					sender: createSender(item.sender_id, item.sender_nick),
					sender_time: item.sender_time,
					operator: createSender(
						item.operator_id,
						item.operator_nick,
					),
					operator_time: item.operator_time,
					content: (await this.parseSeg(
						item.content,
					)) as EssenceSeg[],
				}))(),
			)
		}

		return await Promise.all(out)
	}
	@api
	async getCustomFace(): Promise<string[] | undefined> {
		const data: LgrObGetCustomFace = await this.connector.send(
			'fetch_custom_face',
			{},
		)

		return data.data
	}
	//#endregion
	//#region == 消息相关 ======================
	@api
	override async getMsg(
		session: Session,
		msgId: string,
	): Promise<MsgData | undefined> {
		const data: LgrObGetMsg = await this.connector.send('get_msg', {
			message_id: msgId,
		})
		if (!data.data) return undefined

		let msgData: ObMsg

		if (session.type === 'group') {
			msgData = {
				group_id: session.id,
				...data.data,
			}
		} else {
			msgData = {
				user_id: session.id,
				...data.data,
			}
		}

		// 解析消息
		return await this.parseMsg(msgData)
	}
	@api
	override async sendMsg(msg: Msg): Promise<string> {
		if (!this.isCustomForward(msg)) return await super.sendMsg(msg)

		// 自定义合并转发
		const message = await this.customForwardSerializer(
			msg.message[0] as ForwardSeg,
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
		const id = session.id.toString()

		if (session instanceof UserSession) type = 'user'
		else if (session instanceof GroupSession) type = 'group'
		else throw new Error('LgrV1不支持临时会话')

		let data: LgrObGetHistoryMsg

		if (type === 'user') {
			data = await this.connector.send('get_friend_msg_history', {
				user_id: id,
				count: count + 1,
				message_id: start?.message_id,
			})
		} else {
			data = await this.connector.send('get_group_msg_history', {
				group_id: id,
				count: count + 1,
				message_id: start?.message_id,
			})
		}

		if (start) data.data.messages.pop() // 去掉第一条，避免重复

		const out: Promise<MsgData>[] = data.data.messages.map((msg) =>
			this.parseMsg(msg),
		)

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
		await this.connector.send('set_group_reaction', {
			group_id: msg.session!.id,
			message_id: msg.message_id,
			code: emojiId,
			is_add: add, // 默认为添加表情
		})
		return true
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
	async getGroupFile?(group: GroupSession): Promise<FilesData> {
		const data: LgrObGetGroupFile = await this.connector.send(
			'get_group_root_files',
			{ group_id: group.id },
		)
		return this.parseFileData(data)
	}

	@api
	async getGroupFolderFile(
		group: GroupSession,
		folderId: string,
	): Promise<FilesData | undefined> {
		const data: LgrObGetGroupFile = await this.connector.send(
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
		const data: LgrObGetFileUrl = await this.connector.send(
			'get_group_file_url',
			{
				group_id: file.group.id,
				file_id: file.id,
			},
		)

		return data.data.url
	}
	//#endregion
	//#endregion
	//#region == 消息相关 ===========================================
	override async parseMsg(data: ObMsg): Promise<MsgData> {
		const msg = await super.parseMsg(data)
		// 过滤掉mface后面尾随的字符串
		const filter: SegData[] = []
		for (let id = 0; id < msg.message.length; id++) {
			const seg = msg.message[id]
			filter.push(seg)
			if (seg.type === 'mface') id++
		}
		msg.message = filter
		return msg
	}
	async customForwardSerializer(
		seg: ForwardSeg,
	): Promise<ObForwardNodeSeg[]> {
		const msgs = seg.content
		const messagesList = await Promise.all(
			msgs.map((msg) => this.serializeMsg(msg)),
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
	//#region == 反序列化 ===========================
	async mdParser(data: LgrObMdSeg): Promise<MdSegData> {
		return {
			type: 'md',
			content: data.data.content,
		}
	}
	override async imageParser(data: LgrObImgSeg): Promise<ImgSegData> {
		return {
			type: 'image',
			url: Resource.fromUrl(data.data.url),
			isFace: data.data.subType === 7 || data.data.subType === 1,
			summary: data.data.summary,
		}
	}
	async mfaceParser(data: LgrObMfaceSeg): Promise<MfaceSegData> {
		return {
			type: 'mface',
			url: data.data.url,
			summary: data.data.summary,
			packageId: data.data.emoji_package_id,
			id: data.data.emoji_id,
			key: data.data.key,
		}
	}
	async fileParser(data: LgrObFileSeg): Promise<FileSegData> {
		return {
			type: 'file',
			name: data.data.file_name,
			size: 0,
			url: data.data.url,
			file_id: data.data.file_id,
		}
	}
	//#endregion
	//#region == 序列化 =============================
	async mdSerializer(seg: MdSeg): Promise<LgrObMdSeg> {
		return {
			type: 'markdown',
			data: {
				content: seg.content,
			},
		}
	}
	override async imageSerializer(seg: ImgSeg): Promise<LgrObImgSeg> {
		return {
			type: 'image',
			data: {
				url: seg.url,
				file: seg.url,
				subType: seg.isFace ? 7 : undefined, // 0表示普通图片，7表示表情
				summary: seg.summary,
			},
		}
	}
	async mfaceSerializer(seg: MfaceSeg): Promise<LgrObMfaceSeg> {
		return {
			type: 'mface',
			data: {
				url: seg.url,
				summary: seg.summary,
				emoji_package_id: seg.packageId,
				emoji_id: seg.id,
				key: seg.key,
			},
		}
	}
	async fileSerializer(seg: FileSeg): Promise<LgrObFileSeg> {
		// 反正lgrv1我发不出去文件，就胡乱写吧...
		if (!seg.file_id) throw new Error('文件消息必须有 file_id')
		return {
			type: 'file',
			data: {
				file_name: seg.name,
				url: seg.url,
				file_id: seg.file_id,
				file_hash: undefined as any,
			},
		}
	}
	//#endregion
	//#endregion
	//#region == 事件处理 ===========================================
	override async pokeEvent(event: LgrObPokeEvent): Promise<PokeEventData> {
		const re = await super.pokeEvent(event)
		re.action = event.action
		re.suffix = event.suffix
		re.ico = event.action_img_url
		return re
	}
	override async groupDecreaseEvent(
		event: ObGroupDecreaseEvent,
	): Promise<LeaveEventData> {
		if (event.operator_id === 0) event.operator_id = event.user_id
		return super.groupDecreaseEvent(event)
	}
	//#endregion
	static match(implInfo: ImplInfo): boolean {
		return implInfo.name === 'Lagrange.OneBot'
	}

	private parseFileData(data: LgrObGetGroupFile): FilesData {
		return {
			files: data.data.files.map((file) => ({
				file_id: file.file_id,
				file_name: file.file_name,
				size: file.file_size,
				download_times: file.download_times,
				dead_time: file.dead_time,
				upload_time: file.upload_time,
				uploader_name: file.uploader_name,
			})),
			folders: data.data.folders.map((folder) => ({
				folder_id: folder.folder_id,
				folder_name: folder.folder_name,
				count: folder.total_file_count,
				create_time: folder.create_time,
				creator_name: folder.create_name,
			})),
		}
	}

	/**
	 * 判断一个消息是否为构建转发
	 * @param msg
	 * @returns
	 */
	private isCustomForward(msg: Msg): boolean {
		const firstSeg = msg.message.at(0)
		if (!(firstSeg instanceof ForwardSeg)) return false
		if (!firstSeg.id) return true
		return false
	}

	override get selfInfo(): { [key: string]: string } {
		if (!this.botInfo.value) return {}
		return {
			...super.selfInfo,
			ntqq协议: this.botInfo.value.data.nt_protocol,
		}
	}

	override isDelete(msg: ObMsg): boolean {
		// 判断消息是否为[已删除]消息
		const runtimeData = useRuntimeData()
		if (msg.message.length !== 1) return false
		if (
			(msg.sender as ObPrivateSender | ObGroupSender).user_id !==
			runtimeData.loginInfo?.uin
		)
			return false
		if (msg.message[0].type !== 'text') return false
		if ((msg.message[0] as ObTextSeg).data.text !== '[已删除]') return false
		return true
	}
}
