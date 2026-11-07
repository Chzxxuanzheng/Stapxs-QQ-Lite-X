/*
 * @FileDescription: 适配器接口定义
 * @Author: Mr.Lee
 * @Date: 2025/08/06
 * @Version: 1.0
 * @Description: 定义适配器的基本接口，所有适配器应当实现这个的接口。
 */
import { type Component } from 'vue'
import { GroupFile, GroupFileFolder } from '@renderer/function/model/file'
import { Msg } from '@renderer/function/model/msg'
import { Resource } from '@renderer/function/model/resource'
import {
	GroupSession,
	Session,
	UserSession,
} from '@renderer/function/model/session'
import { Member } from '@renderer/function/model/user'
import { Gender, Role } from '@renderer/function/adapter/enmu'

export interface AdapterInterface {
	// 基础信息
	/**
	 * 适配器名称
	 */
	name: string
	/**
	 * 适配器版本
	 */
	version: string //
	/**
	 * 协议类型简称，如 ob（onebot），mk（milky）
	 */
	protocol: string //
	/**
	 * 返回自身适配器的信息页面
	 */
	optInfo?(): Component
	/**
	 * 连接到协议段
	 * @param url 协议层路径
	 * @param ssl 是否使用 SSL
	 * @param token 访问令牌
	 * @returns 是否连接成功
	 */
	connect(url: string, ssl: boolean, token: string): Promise<boolean>
	close(): Promise<true | undefined>
	/**
	 * 重定向到其他适配器
	 */
	redirect?(): Promise<AdapterInterface | undefined>
	/**
	 * 获取当前适配器信息
	 */
	getAdapterInfo(): Promise<{ [key: string]: string } | undefined>

	//#region == API ===============================================
	//#region  == 基础信息 =====================
	/**
	 * 获取登陆基本信息
	 * @return 返回登录信息(uin, 昵称)
	 */
	getLoginInfo(): Promise<LoginInfo | undefined>
	/**
	 * 获取协议段信息
	 */
	getImplInfo(): Promise<ImplInfo | undefined>
	//#endregion

	//#region == 获取信息 ======================
	/**
	 * 获取好友列表
	 * @param useCache 是否使用缓存
	 */
	getFriendList(useCache?: boolean): Promise<FriendData[] | undefined>
	/**
	 * 获取群组列表
	 * @param useCache 是否使用缓存
	 */
	getGroupList(useCache?: boolean): Promise<GroupData[] | undefined>
	/**
	 * 获取用户信息
	 * @param userId 用户id
	 * @param useCache 是否使用缓存
	 */
	getUserInfo(
		userId: number,
		useCache?: boolean,
	): Promise<UserData | undefined>
	/**
	 * 获取群成员信息
	 * @param group 群组会话
	 * @param useCache 是否使用缓存
	 */
	getMemberList(
		group: GroupSession,
		useCache?: boolean,
	): Promise<MemberData[] | undefined>
	/**
	 * 获取群公告信息
	 * @param group
	 */
	getGroupAnnouncement?(
		group: GroupSession,
	): Promise<GroupAnnouncementData[] | undefined>
	/**
	 * 获取群精华消息
	 * @param group
	 */
	getGroupEssence?(group: GroupSession): Promise<EssenceData[] | undefined>
	/**
	 * 获取用户自定义表情
	 * @param userId
	 */
	getCustomFace?(): Promise<string[] | undefined>
	/**
	 * 获取资源url
	 * @param id
	 */
	getResource?(id: string): Promise<string | undefined>
	//#endregion

	//#region == 群聊相关 ======================
	/**
	 * 设置群名称
	 * @param group 群组
	 * @param name 新名称
	 */
	setGroupName?(group: GroupSession, name: string): Promise<true | undefined>
	/**
	 * 为群成员设置新的群内名称
	 * @param group 群组
	 * @param mem 群成员
	 * @param card 新名称
	 */
	setMemberCard?(
		group: GroupSession,
		mem: Member,
		card: string,
	): Promise<true | undefined>
	/**
	 * 为群成员设置头衔,头衔为''或者没有时表示清除头衔
	 * @param group
	 * @param mem
	 * @param title
	 */
	setMemberTitle?(
		group: GroupSession,
		mem: Member,
		title: string,
	): Promise<true | undefined>
	/**
	 * 群禁言
	 * @param group 群组
	 * @param mem 被禁言的成员
	 * @param time 禁言时间 (s)
	 */
	banMember?(
		group: GroupSession,
		mem: Member,
		time: number,
	): Promise<true | undefined>
	/**
	 * 踢出群成员
	 * @param group 群组
	 * @param mem 群成员
	 */
	kickMember?(group: GroupSession, mem: Member): Promise<true | undefined>
	/**
	 * 退出群组
	 * @param group 群组
	 */
	leaveGroup?(group: GroupSession): Promise<true | undefined>
	//#endregion

	//#region == 消息相关 ======================
	/**
	 * 设置已读消息
	 * @param session 目标会话
	 * @param msg 目标消息
	 */
	setMsgReaded?(session: Session, msg: Msg): Promise<true | undefined>
	/**
	 * 获取消息
	 * @param session 会话
	 * @param msgId 消息id
	 */
	getMsg(session: Session, msgId: string): Promise<MsgData | undefined>
	/**
	 * 获取消息历史
	 * @param session 会话
	 * @param count 获取消息数量
	 * @param start 起始消息
	 */
	getHistoryMsg?(
		session: Session,
		count: number,
		start?: Msg,
	): Promise<MsgData[] | undefined>
	/**
	 * 发送消息
	 * @param session 目标会话
	 * @param msg 消息内容
	 */
	sendMsg(msg: Msg): Promise<string | undefined>
	/**
	 * 撤回消息
	 * @param msg 要撤回的消息
	 */
	recallMsg?(msg: Msg): Promise<true | undefined>
	/**
	 * 群聊发送戳一戳
	 * @param session 当前会话
	 * @param target 目标成员
	 */
	sendGroupPoke?(
		session: GroupSession,
		target: Member,
	): Promise<true | undefined>
	/**
	 * 私聊发送戳一戳
	 * @param session
	 */
	sendPrivatePoke?(session: UserSession): Promise<true | undefined>
	/**
	 * 设置消息表情响应
	 * @param msg 要设置表情的消息
	 * @param emojiId 表情ID
	 * @param add 是否添加表情,如果为false则表示删除表情
	 * @returns 返回是否成功
	 */
	setResponse?(
		msg: Msg,
		emojiId: string,
		add?: boolean,
	): Promise<true | undefined>
	//#endregion

	//#region == 文件相关 ======================
	/**
	 * 获取群文件根目录
	 * @param group 群组会话
	 */
	getGroupFile?(group: GroupSession): Promise<FilesData | undefined>
	/**
	 * 获取群文件夹内容
	 * PS: 文件夹对象塞GroupSession不知道为啥会报循环错误,所以用的是groupId
	 * @param groupId 群组id
	 * @param folderId 文件夹id
	 */
	getGroupFolderFile?(
		group: GroupSession,
		folderId: string,
	): Promise<FilesData | undefined>
	/**
	 * 获取文件下载连接
	 * @param file 要下载的文件
	 */
	getGroupFileUrl?(file: GroupFile): Promise<string | undefined>
	/**
	 * 发送文件到群里
	 * @param group
	 * @param file
	 * @param fold
	 */
	sendGroupFile?(
		group: GroupSession,
		file: File,
		fold?: GroupFileFolder,
	): Promise<string | undefined>
	/**
	 * 发送文件到私聊
	 * @param session
	 * @param file
	 */
	sendPrivateFile?(
		session: UserSession,
		file: File,
	): Promise<string | undefined>
	/**
	 * 创建群文件夹
	 * @param group
	 * @param folderName
	 */
	createFileFolder?(
		group: GroupSession,
		folderName: string,
	): Promise<string | undefined>
	/**
	 * 删除群文件
	 * @param file
	 */
	deleteGroupFile?(file: GroupFile): Promise<true | undefined>
	/**
	 * 删除群文件夹
	 * @param folder
	 */
	deleteGroupFileFolder?(folder: GroupFileFolder): Promise<true | undefined>
	/**
	 * 重命名群文件
	 * @param file
	 * @param newName
	 */
	renameGroupFile?(
		file: GroupFile,
		newName: string,
	): Promise<true | undefined>
	/**
	 * 重命名群文件夹
	 * @param folder
	 * @param newName
	 */
	renameGroupFileFolder?(
		folder: GroupFileFolder,
		newName: string,
	): Promise<true | undefined>
	//#endregion
	//#region == 个人信息 ======================
	/**
	 * 设置昵称
	 * @param nickname 新昵称
	 */
	setNickname?(nickname: string): Promise<true | undefined>
	/**
	 * 设置个性签名
	 * @param sign 新签名
	 */
	setSign?(sign: string): Promise<true | undefined>
	//#endregion
	//#endregion
}
//#region == API响应 ===============================================
/**
 * 基本登陆信息
 */
export interface LoginInfo {
	uin: number
	nickname: string
}
/**
 * 协议段信息
 */
export interface ImplInfo {
	name: string // 协议段名称
	version: string // 协议段版本
}
/**
 * 好友会话数据
 */
export interface FriendData {
	user_id: number // 用户ID
	nickname: string // 昵称
	remark?: string // 备注
	class_id: number // 分组ID
	class_name: string // 分组名称
}
/**
 * 群友会话数据
 */
export interface GroupData {
	group_id: number // 群ID
	group_name: string // 群名称
	member_count: number // 成员数量
	max_member_count: number // 最大成员数量
}
/**
 * 用户信息数据
 */
export interface UserData {
	id: number // 用户ID
	remark?: string // 备注
	nickname?: string // 昵称
	longNick?: string // 个性签名
	qid?: string // qid
	country?: string // 国家
	province?: string // 省份
	city?: string // 城市
	regTime: number | string // 注册时间
	qqLevel: number // QQ等级
	birthday_year?: number // 出生年份
	birthday_month?: number // 出生月份
	birthday_day?: number // 出生日期
	age: number // 年龄
	sex: Gender // 性别
}
/**
 * 群成员信息数据
 */
export interface MemberData {
	age: number // 年龄
	card?: string // 群内名称
	group_id: number // 群ID
	join_time: number // 加入时间
	last_sent_time: number // 最后发言时间
	level: string // 群等级
	nickname?: string // 昵称
	role: Role // 角色
	sex: Gender //性别
	title?: string // 头衔
	user_id: number // 用户ID
	unfriendly: boolean // 不友好记录
	banTime?: number // 禁言时间，单位秒
}
/**
 * 群公告数据
 */
export interface GroupAnnouncementData {
	content: string // 公告内容
	img?: string // 图片url
	time: number // 发布时间
	sender: number // 发布者ID
	is_read?: boolean // 是否已读
	read_num?: number // 已读人数
}

/**
 * 群文件数据
 */
export interface GroupFileData {
	file_id: string // 文件ID
	file_name: string // 文件名
	size: number // 文件大小，单位字节
	download_times: number // 下载次数
	dead_time?: number // 过期时间
	upload_time: number // 上传时间
	uploader_name?: string // 上传者名称
	uploader_id?: number // 上传者ID
}

/**
 * 群文件夹数据
 */
export interface GroupFolderData {
	folder_id: string // 文件夹ID
	folder_name: string // 文件夹名称
	count: number // 文件数量
	create_time: number // 创建时间GroupFile
	creator_name?: string // 创建者名称
	creator_id?: number // 创建者ID
}

export type FilesData = { files: GroupFileData[]; folders: GroupFolderData[] }

export interface SenderData {
	id: number // 发送者用户ID
	nickname: string // 发送者昵称
	card?: string // 群内名称
	sex: Gender // 性别
	age?: number // 年龄
	area?: string // 地区
	level?: number // 等级
	role?: Role // 角色
	title?: string // 头衔
}
export interface SessionData {
	id: number // 会话ID
	group_id?: number // 临时会话群ID
	type: 'group' | 'user' | 'temp' // 会话类型
}
//#endregion

//#region == 事件 ==================================================
export type MessageEventType =
	| 'msg'
	| 'recall'
	| 'ban'
	| 'banLift'
	| 'poke'
	| 'join'
	| 'leave'
	| 'response'
export type SessionEventType = MessageEventType
export type EventType = SessionEventType | 'unknown'
export interface EventData {
	type: EventType // 事件类型
	time: number // 事件发生时间戳
}
/**
 * 和会话绑定的事件数据
 */
export interface SessionEventData extends EventData {
	type: SessionEventType // 事件类型
	session: SessionData // 事件发生的会话
}

/**
 * 携带有 Message 的事件数据
 */
export interface MessageEventData extends SessionEventData {
	type: MessageEventType // 事件类型
}
/**
 * 表情回应事件数据
 */
export interface ResponseEventData extends MessageEventData {
	type: 'response' // 事件类型
	operator: SenderData // 操作者
	message_id: string // 被响应的消息ID
	emojiId: string // 表情ID
	add: boolean // 是否添加表情,如果为false则表示删除表情
}
/**
 * 新消息事件
 */
export interface MsgEventData extends MessageEventData {
	type: 'msg' // 事件类型
	message: MsgData // 消息数据
	message_id: string // 事件携带通知的消息ID
}
/**
 * 撤回消息事件
 */
export interface RecallEventData extends MessageEventData {
	type: 'recall' // 事件类型
	recallId: string // 被撤回的消息ID
	suffix: string // 撤回消息后缀
	user: SenderData // 撤回消息的用户信息
	operator: SenderData // 撤回操作员信息
}
/**
 * 禁言事件
 */
export interface BanEventData extends MessageEventData {
	type: 'ban' // 事件类型
	user: SenderData // 被禁言的用户ID
	operator: SenderData // 操作员信息
	duration: number // 禁言时间，单位秒
}
/**
 * 解除禁言事件
 */
export interface BanLiftEventData extends MessageEventData {
	type: 'banLift' // 事件类型
	user: SenderData // 被解禁的用户ID
	operator: SenderData // 操作员信息
}
/**
 * 戳一戳事件
 */
export interface PokeEventData extends MessageEventData {
	type: 'poke' // 事件类型
	sender: SenderData // 发送者信息
	target: SenderData // 被戳一戳的用户信息
	action: string // 戳一戳动作
	suffix: string // 戳一戳后缀
	ico: string // 戳一戳图片链接
}
/**
 * 用户加入事件
 */
export interface JoinEventData extends MessageEventData {
	type: 'join' // 事件类型
	user: SenderData // 加入的用户信息
	operator?: SenderData // 操作员信息
	inviter?: SenderData // 邀请者信息
}
/**
 * 群成员离开事件
 */
export interface LeaveEventData extends MessageEventData {
	type: 'leave' // 事件类型
	user: SenderData // 离开的用户信息
	operator: SenderData // 操作员信息
}
/**
 * 未知事件数据
 */
export interface UnknownEventData extends EventData {
	type: 'unknown' // 事件类型
	data: object // 原始数据
}
//#endregion

//#region == 消息 ==================================================

/**
 * 消息
 */
export interface MsgData {
	message_id?: string // 消息ID
	session: SessionData // 会话信息
	sender: SenderData // 发送者信息
	time?: number // 发送时间戳
	message: SegData[] // 消息内容段
	isDelete: boolean // 是否是已删除消息
}

/**
 * 群精华消息的消息段数据
 */
export type EssenceSeg = TextSegData | ImgSegData | FaceSegData
/**
 * 群精华消息数据
 */
export interface EssenceData {
	sender: SenderData // 发送者信息
	sender_time: number // 发送时间戳
	operator: SenderData // 操作员信息
	operator_time: number // 操作时间戳
	content: EssenceSeg[] // 消息内容段
}
//#endregion

//#region == 消息段 ================================================
export interface SegData {
	type: string // 消息段类型
}
export interface TextSegData extends SegData {
	type: 'text' // 消息段类型
	text: string // 文本内容
}
export interface MdSegData extends SegData {
	type: 'md' // 消息段类型
	content: string // Markdown内容
}
export interface ImgSegData extends SegData {
	type: 'image' // 消息段类型
	url: Resource // 图片链接
	isFace: boolean // 是否是表情图片
	summary?: string // 预览信息
	width?: number // 图片宽度
	height?: number // 图片高度
}
export interface MfaceSegData extends SegData {
	type: 'mface' // 消息段类型
	url: string // 表情链接
	summary: string // 预览信息
	packageId: number // 表情包ID
	id: string // 表情ID
	key: string // key
}
export interface FaceSegData extends SegData {
	type: 'face' // 消息段类型
	text?: string // 文本描述
	id: number // 表情ID
}
export interface SuperFaceSegData extends SegData {
	type: 'super-face' // 消息段类型
	text?: string // 文本描述
	id: number // 表情ID
}
export interface AtSegData extends SegData {
	type: 'at' // 消息段类型
	user_id: number // 被艾特的用户ID
	text?: string // 被艾特的用户昵称
}
export interface AtAllSegData extends SegData {
	type: 'atall' // 消息段类型
}
export interface FileSegData extends SegData {
	type: 'file' // 消息段类型
	name: string // 文件名称
	size: number // 文件大小，单位字节
	url: string // 文件链接
	file_id: string // 文件ID
}
export interface VideoSegData extends SegData {
	type: 'video' // 消息段类型
	file: string // 视频文件链接
	url: Resource // 视频链接
}
// 正常的合并转发没几层...就一并解析了吧
export interface ForwardSegData extends SegData {
	type: 'forward' // 消息段类型
	id: string // 合并转发ID
	content: ForwardNodeData[] // 转发内容
}
export interface ReplySegData extends SegData {
	type: 'reply' // 消息段类型
	id: string // 回复的消息ID
}
export interface PokeSegData extends SegData {
	type: 'poke' // 消息段类型
}
export interface XmlSegData extends SegData {
	type: 'xml' // 消息段类型
	data: string // XML内容
	id: string // XML ID
}
export interface JsonSegData extends SegData {
	type: 'json' // 消息段类型
	data: string // JSON内容
	id: string // JSON ID
}

export interface UnknownSegData extends SegData {
	type: 'unknown' // 消息段类型
	segType: string // 未知的消息段类型
	data: object // 原始数据
}

export interface ErrorSegData extends SegData {
	type: 'error' // 消息段类型
}

/**
 * 合并转发节点
 */
export interface ForwardNodeData {
	sender: ForwardSenderData // 发送者信息
	content: SegData[] // 消息内容段
}
/**
 * 合并转发发送者消息
 */
export interface ForwardSenderData {
	nickname: string // 发送者昵称
	face: string // 发送者头像链接
}
//#endregion
