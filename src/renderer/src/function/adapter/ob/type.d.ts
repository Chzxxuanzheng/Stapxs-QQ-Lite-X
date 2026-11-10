/*
 * @FileDescription: Ob适配器的类型定义
 * @Author: Mr.Lee
 * @Date: 2025/08/06
 * @Version: 1.0
 * @Description: 定义适配器的基本接口，所有适配器应当实现这个的接口。
 */

type data = Record<string, boolean | number | string | null | data | data[]>

/**
 * Ob的Ws请求格式
 * @see https://github.com/botuniverse/onebot-11/blob/master/communication/ws.md#api-%E6%8E%A5%E5%8F%A3
 */
export interface ObRequest<T extends data> {
	action: string
	echo: string
	params?: T
}

/**
 * Ob的Ws响应格式
 * @see https://github.com/botuniverse/onebot-11/blob/master/communication/ws.md#api-%E6%8E%A5%E5%8F%A3
 */
export interface ObResponse<T extends data> {
	status: 'failed' | 'ok' | 'async'
	echo: string
	retcode: number
	data: T
}

export type ObResponseNull = ObResponse<null>

//#region == API ===============================================

/**
 * 发送私聊消息
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#send_private_msg-发送私聊消息
 */
export type ObSendPrivateMsg = ObResponse<{
	message_id: number
}>

/**
 * 发送群消息
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#send_group_msg-发送群消息
 */
export type ObSendGroupMsg = ObResponse<{
	message_id: number
}>

/**
 * 发送消息
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#send_msg-发送消息
 */
export type ObSendMsg = ObResponse<{
	message_id: number
}>

/**
 * 撤回消息
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#delete_msg-撤回消息
 */
export type ObDeleteMsg = ObResponseNull

/**
 * 获取消息
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_msg-获取消息
 */
export type ObGetMsg = ObResponse<ObMsg>

/**
 * 获取合并转发消息
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_forward_msg-获取合并转发消息
 */
export type ObGetForwardMsg = ObResponse<{
	message: ObForwardNodeSeg[]
}>

/**
 * 发送好友赞
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#send_like-发送好友赞
 */
export type ObSendLike = ObResponseNull

/**
 * 群组踢人
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#set_group_kick-群组踢人
 */
export type ObSetGroupKick = ObResponseNull

/**
 * 群组单人禁言
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#set_group_ban-群组单人禁言
 */
export type ObSetGroupBan = ObResponseNull

/**
 * 群组匿名用户禁言
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#set_group_anonymous_ban-群组匿名用户禁言
 */
export type ObSetGroupAnonymousBan = ObResponseNull

/**
 * 群组全员禁言
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#set_group_whole_ban-群组全员禁言
 */
export type ObSetGroupWholeBan = ObResponseNull

/**
 * 群组设置管理员
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#set_group_admin-群组设置管理员
 */
export type ObSetGroupAdmin = ObResponseNull

/**
 * 群组匿名
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#set_group_anonymous-群组匿名
 */
export type ObSetGroupAnonymous = ObResponseNull

/**
 * 设置群名片（群备注）
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#set_group_card-设置群名片群备注
 */
export type ObSetGroupCard = ObResponseNull

/**
 * 设置群名
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#set_group_name-设置群名
 */
export type ObSetGroupName = ObResponseNull

/**
 * 退出群组
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#set_group_leave-退出群组
 */
export type ObSetGroupLeave = ObResponseNull

/**
 * 设置群组专属头衔
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#set_group_special_title-设置群组专属头衔
 */
export type ObSetGroupSpecialTitle = ObResponseNull

/**
 * 处理加好友请求
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#set_friend_add_request-处理加好友请求
 */
export type ObSetFriendAddRequest = ObResponseNull

/**
 * 处理加群请求／邀请
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#set_group_add_request-处理加群请求邀请
 */
export type ObSetGroupAddRequest = ObResponseNull

/**
 * 获取登录号信息
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_login_info-获取登录号信息
 */
export type ObGetLoginInfo = ObResponse<{
	user_id: number
	nickname: string
}>

/**
 * 获取陌生人信息
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_stranger_info-获取陌生人信息
 */
export type ObGetStrangerInfo = ObResponse<{
	user_id: number
	nickname: string
	sex: 'male' | 'female' | 'unknown'
	age: number
}>

/**
 * 获取好友列表
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_friend_list-获取好友列表
 */
export type ObGetFriendList = ObResponse<
	[
		{
			user_id: number
			nickname: string
			remark: string
		},
	]
>

/**
 * 获取群信息
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_group_info-获取群信息
 */
export type ObGetGroupInfo = ObResponse<{
	group_id: number
	group_name: string
	member_count: number
	max_member_count: number
}>

/**
 * 获取群列表
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_group_list-获取群列表
 */
export type ObGetGroupList = ObResponse<
	[
		{
			group_id: number
			group_name: string
			member_count: number
			max_member_count: number
		},
	]
>

/**
 * 获取群成员信息
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_group_member_info-获取群成员信息
 */
export type ObGetGroupMemberInfo = ObResponse<{
	group_id: number
	user_id: number
	nickname: string
	card: string
	sex: 'male' | 'female' | 'unknown'
	age: number
	area: string
	join_time: number
	last_sent_time: number
	level: string
	role: 'owner' | 'admin' | 'member'
	unfriendly: boolean
	title: string
	title_expire_time: number
	card_changeable: boolean
}>

/**
 * 获取群成员列表
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_group_member_list-获取群成员列表
 */
export type ObGetGroupMemberList = ObResponse<ObGetGroupMemberInfo['data'][]>

/**
 * 获取群荣誉信息
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_group_honor_info-获取群荣誉信息
 */
export type ObGetGroupHonorInfo = ObResponse<{
	group_id: number
	current_talkative?: {
		user_id: number
		nickname: string
		avatar: string
		day_count: number
	}
	talkative_list?: Array<{
		user_id: number
		nickname: string
		avatar: string
		description: string
	}>
	performer_list?: Array<{
		user_id: number
		nickname: string
		avatar: string
		description: string
	}>
	legend_list?: Array<{
		user_id: number
		nickname: string
		avatar: string
		description: string
	}>
	strong_newbie_list?: Array<{
		user_id: number
		nickname: string
		avatar: string
		description: string
	}>
	emotion_list?: Array<{
		user_id: number
		nickname: string
		avatar: string
		description: string
	}>
}>

/**
 * 获取 Cookies
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_cookies-获取-cookies
 */
export type ObGetCookies = ObResponse<{
	cookies: string
}>

/**
 * 获取 CSRF Token
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_csrf_token-获取-csrf-token
 */
export type ObGetCsrfToken = ObResponse<{
	token: number
}>

/**
 * 获取 QQ 相关接口凭证
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_credentials-获取-qq-相关接口凭证
 */
export type ObGetCredentials = ObResponse<{
	cookies: string
	csrf_token: number
}>

/**
 * 获取语音
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_record-获取语音
 */
export type ObGetRecord = ObResponse<{
	file: string
}>

/**
 * 获取图片
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_image-获取图片
 */
export type ObGetImage = ObResponse<{
	file: string
}>

/**
 * 检查是否可以发送图片
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#can_send_image-检查是否可以发送图片
 */
export type ObCanSendImage = ObResponse<{
	yes: boolean
}>

/**
 * 检查是否可以发送语音
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#can_send_record-检查是否可以发送语音
 */
export type ObCanSendRecord = ObResponse<{
	yes: boolean
}>

/**
 * 获取运行状态
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_status-获取运行状态
 */
export type ObGetStatus = ObResponse<{
	online: boolean | null
	good: boolean
	// 可扩展字段
	[key: string]: any
}>

/**
 * 获取版本信息
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#get_version_info-获取版本信息
 */
export type ObGetVersionInfo = ObResponse<{
	app_name: string
	app_version: string
	protocol_version: string
}>

/**
 * 重启 OneBot 实现
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#set_restart-重启-onebot-实现
 */
export type ObSetRestart = ObResponseNull

/**
 * 清理缓存
 * @see https://github.com/botuniverse/onebot-11/blob/master/api/public.md#clean_cache-清理缓存
 */
export type ObCleanCache = ObResponseNull

//#endregion

//#region == 请求 ==============================================
/**
 * Ob的事件固有属性
 * @see https://github.com/botuniverse/onebot-11/blob/master/event/README.md#%E5%86%85%E5%AE%B9%E5%AD%97%E6%AE%B5
 */
export interface ObEvent {
	time: number
	self_id: number
	post_type: string
}
//#endregion

export interface ObPrivateSender {
	user_id: number // 发送者 QQ 号
	nickname: string // 昵称
	sex:
		| 'male' // 性别
		| 'female'
		| 'unknown'
	age: number // 年龄
}

export interface ObGroupSender {
	user_id: number // 发送者 QQ 号
	nickname: string // 昵称
	card: string // 群名片／备注
	sex:
		| 'male' // 性别
		| 'female'
		| 'unknown'
	age: number // 年龄
	area: string // 地区
	level: string // 成员等级
	role: string // 角色，owner 或 admin 或 member
	title: string // 专属头衔
}

export interface ObAnonymousSender {
	id: string // 匿名 ID
	name: string // 匿名名称
	flag: string // 匿名标志
}

export interface ObMsg {
	time: number
	message_type: 'private' | 'group'
	sub_type: 'friend' | 'group' | 'anonymous' | 'normal'
	message_id: number
	real_id: number
	sender: ObPrivateSender | ObGroupSender | ObAnonymousSender
	message: ObSeg<string, any>[]
	user_id?: number // 仅在群消息中存在，表示发送者的 QQ 号
	group_id?: number // 仅在群消息中存在，表示所在的群号
}

//#region == 消息段 ============================================
export interface ObSeg<T extends string, D> {
	type: T
	data: D
}

export type ObTextSeg = ObSeg<
	'text',
	{
		text: string
	}
>
export type ObImgSeg = ObSeg<
	'image',
	{
		file: string
		url: string
	}
>
export type ObFaceSeg = ObSeg<
	'face',
	{
		id: string
	}
>
export type ObAtSeg = ObSeg<
	'at',
	{
		qq: string
	}
>
export type ObVideoSeg = ObSeg<
	'video',
	{
		file: string
		url: string
	}
>
export type ObForwardSeg = ObSeg<
	'forward',
	{
		id: string
	}
>
export type ObForwardNodeSeg = ObSeg<
	'node',
	{
		user_id: string
		nickname: string
		content: ObSeg[]
	}
>
export type ObReplySeg = ObSeg<
	'reply',
	{
		id: string
	}
>
export type ObPokeSeg = ObSeg<
	'poke',
	{
		type: string
		id: string
	}
>
export type ObXmlSeg = ObSeg<
	'xml',
	{
		data: string
	}
>
export type ObJsonSeg = ObSeg<
	'json',
	{
		data: string
	}
>
//#endregion

//#region == 事件 ==============================================
export interface ObEvent {
	time: number // 事件发生时间戳
	self_id: number // 事件发送者的 QQ 号
	post_type:
		| 'message' // 事件类型
		| 'notice'
		| 'request'
		| 'meta_event'
}
export interface ObGroupMessageEvent extends ObEvent {
	post_type: 'message'
	message_type: 'group' // 消息类型
	sub_type:
		| 'normal' // 子类型
		| 'anonymous'
		| 'notice'
	message_id: number // 消息 ID
	user_id: number // 发送者 QQ 号
	group_id: number // 群号
	message: ObSeg<string, any>[] // 消息内容
	raw_message: string // 原始消息文本
	sender:
		| ObGroupSender // 发送者信息
		| ObAnonymousSender
}
export interface ObPrivateMessageEvent extends ObEvent {
	post_type: 'message'
	message_type: 'private' // 消息类型
	sub_type:
		| 'friend' // 子类型
		| 'normal'
		| 'other'
	message_id: number // 消息 ID
	user_id: number // 对话方 QQ 号
	group_id?: number // 群号
	message: ObSeg<string, any>[] // 消息内容
	raw_message: string // 原始消息文本
	sender: ObPrivateSender // 发送者信息
}
export type ObMessageEvent = ObGroupMessageEvent | ObPrivateMessageEvent
export interface ObHeartEvent extends ObEvent {
	post_type: 'meta_event'
	meta_event_type: 'heartbeat' // 元事件类型
	interval: number // 心跳间隔
}
export interface ObNoticeEvent extends ObEvent {
	post_type: 'notice'
	notice_type: string | 'notify' // 通知类型一并塞进去吧...
	sub_type?: string // 子类型
	group_id?: number // 群号（可能不存在）
	user_id?: number // 用户 QQ 号（可能不存在）
}
export interface ObGroupIncreaseEvent extends ObNoticeEvent {
	notice_type: 'group_increase' // 群成员增加事件
	sub_type: 'approve' | 'invite' // 子类型
	group_id: number // 群号
	user_id: number // 新成员 QQ 号
	operator_id: number // 操作人 QQ 号
}
export interface ObGroupDecreaseEvent extends ObNoticeEvent {
	notice_type: 'group_decrease' // 群成员减少事件
	sub_type:
		| 'leave' // 子类型
		| 'kick'
		| 'kick_me'
	group_id: number // 群号
	user_id: number // 成员 QQ 号
	operator_id: number // 操作人 QQ 号（可能不存在）
}
export interface ObGroupBanEvent extends ObNoticeEvent {
	notice_type: 'group_ban' // 群禁言事件
	sub_type: 'ban' | 'lift_ban' // 子类型
	group_id: number // 群号
	operator_id: number // 操作人 QQ 号（可能不存在）
	user_id: number // 被禁言成员 QQ 号
	duration: number // 禁言时长，单位秒
}
export interface ObGroupRecallEvent extends ObNoticeEvent {
	notice_type: 'group_recall' // 群消息撤回事件
	group_id: number // 群号
	user_id: number // 撤回者 QQ 号
	operator_id: number // 操作人 QQ 号
	message_id: number // 被撤回消息 ID
}
export interface ObFriendRecallEvent extends ObNoticeEvent {
	notice_type: 'friend_recall' // 好友消息撤回事件
	user_id: number // 撤回者 QQ 号
	message_id: number // 被撤回消息 ID
}
export interface ObPokeEvent extends ObNoticeEvent {
	notice_type: 'notify' // 戳一戳事件
	sub_type: 'poke' // 子类型
	group_id: number // 群号
	user_id: number // 戳一戳者 QQ 号
	target_id: number // 被戳者 QQ 号
}
//#endregion
export type RkeyType = 'PRIVATE' | 'GROUP' | 'UNKNOWN'

//#region == LGRV1 ==============================================
export type LgrObGetVersionInfo = ObResponse<{
	app_name: string
	app_version: string
	protocol_version: string
	nt_protocol: string
}>
export type LgrObGetFriendList = ObResponse<
	{
		user_id: number
		nickname: string
		remark: string
		q_id: string
		group: {
			group_id: number
			group_name: string
		}
	}[]
>
export type LgrObGetStongerInfo = ObResponse<{
	user_id: number
	avatar: string
	q_id: string
	nickname: string
	sign: string
	sex: 'male' | 'female' | 'unknown'
	age: number
	level: number
	status: {
		// 状态
		status_id: number
		face_id: number
		message: string
	}
	RegisterTime: string
	Business?: {
		// QQ会员
		type: number
		name: string
		level: number
		icon: string
		ispro: number
		isyear: number
	}[]
}>
export type LgrObGetGroupNotices = ObResponse<
	{
		notice_id: string
		sender_id: number
		publish_time: number
		message: {
			text: string
			images: {
				id: string
				width: number
				height: number
			}[]
		}
	}[]
>
export type LgrObGetGroupFileRoot = ObResponse<{
	files: LgrGroupFileData[]
	folders: LgrGroupFolderData[]
}>
export type LgrObGetFileUrl = ObResponse<{ url: string }>

export interface LgrGroupFileData {
	group_id: number
	file_id: string
	file_name: string
	busid: number
	file_size: number
	upload_time: number
	dead_time: number
	modify_time: number
	download_times: number
	uploader: number
	uploader_name: string
}
export interface LgrGroupFolderData {
	group_id: number
	folder_id: string
	folder_name: string
	create_time: number
	create_name: string
	total_file_count: number
}
export type LgrObGetHistoryMsg = ObResponse<{
	messages: ObMsg[]
}>
export interface LgrObEssenceMsg {
	sender_id: number
	sender_nick: string
	sender_time: number
	operator_id: number
	operator_nick: string
	operator_time: number
	message_id: number
	content: ObSeg<string, any>[]
}
export type LgrObGetEssenceMsg = ObResponse<LgrObEssenceMsg[]>

export type LgrObGetMsg = ObResponse<{
	time: number
	message_type: 'private' | 'group'
	sub_type: 'friend' | 'group' | 'anonymous' | 'normal'
	message_id: number
	real_id: number
	sender: ObPrivateSender | ObGroupSender | ObAnonymousSender
	message: ObSeg<string, any>[]
}>

export type LgrObMdSeg = ObSeg<
	'markdown',
	{
		content: string
	}
>
export type LgrObImgSeg = ObSeg<
	'image',
	{
		file: string
		url: string
		subType?: number
		summary?: string
		filename?: string
	}
>
export type LgrObMfaceSeg = ObSeg<
	'mface',
	{
		url: string
		summary: string
		emoji_package_id: number
		emoji_id: string
		key: string
	}
>
export type LgrObFileSeg = ObSeg<
	'file',
	{
		url: string
		file_name: string
		file_hash: number
		file_id: string
	}
>
export type LgrObGetCustomFace = ObResponse<string[]>

export interface LgrObPokeEvent extends ObPokeEvent {
	action: string // 戳一戳动作
	suffix: string // 戳一戳后缀
	action_img_url: string // 戳一戳动作图片
}
//#endregion

//#region == NAPCAT =============================================
export type NcObGetFriendsWithCategory = ObResponse<
	{
		categoryId: number
		categorySortId: number
		categoryName: string
		categoryMbCount: number
		onlineCount: number
		buddyList: {
			birthday_year: number
			birthday_month: number
			birthday_day: number
			user_id: number
			age: number
			phone_num: string
			email: string
			category_id: number
			nickname: string
			remark: string
			sex: 'unknown' | 'male' | 'female'
			level: number
		}[]
	}[]
>

export type NcObGetStrangerInfo = ObResponse<{
	user_id: number
	uid: string
	uin: string
	nickname: string
	age: number
	qid: string
	qqLevel: number
	sex: 'unknown' | 'male' | 'female'
	long_nick: string
	reg_time: number
	is_vip: boolean
	is_years_vip: boolean
	vip_level: number
	remark: string
	status: number
	login_days: number
	country: string
	province: string
	city: string
	birthday_year: number
	birthday_month: number
	birthday_day: number
}>
export type NcObGetGroupNotices = ObResponse<
	{
		notice_id: string
		sender_id: number
		publish_time: number
		message: {
			text: string
			image: {
				id: string
				width: number
				height: number
			}[]
		}
	}[]
>
export type NcObGetEssenceMsgList = ObResponse<
	{
		msg_seq: number
		msg_random: number
		sender_id: number
		sender_nick: string
		operator_id: number
		operator_nick: string
		message_id: number
		operator_time: number
		content: ObSeg<string, any>[]
	}[]
>
export type NcObFetchCustomFace = ObResponse<string[]>
export type NcObGetHistoryMsg = ObResponse<{
	messages: ObMsg[]
}>
export type NcObGetGroupFileRoot = ObResponse<{
	files: NcGroupFileData[]
	folders: NcGroupFolderData[]
}>
export type NcObGetGroupFile = ObResponse<{
	files: NcGroupFileData[]
	folders: NcGroupFolderData[]
}>

export interface NcGroupFileData {
	group_id: number
	file_id: string
	file_name: string
	busid: number
	size: number
	file_size: number
	upload_time: number
	dead_time: number
	modify_time: number
	modify_time: number
	download_times: number
	uploader: number
	uploader_name: string
}
export interface NcGroupFolderData {
	group_id: number
	folder_id: string
	folder: string
	folder_name: string
	create_time: number
	creator: number
	creator_name: string
	total_file_count: number
}
export type NcObGetFileUrl = ObResponse<{ url: string }>

export type NcObMdSeg = ObSeg<
	'markdown',
	{
		content: string
	}
>
export type NcObImgSeg = ObSeg<
	'image',
	| {
			file: string
			url: string
			sub_type: number
			summary: string
			file_size: number
	  }
	| {
			file: string
			url: string
			summary: string
			key: string
			emoji_id: string
			emoji_package_id: number
	  }
>
export type NcObMfaceSeg = ObSeg<
	'mface',
	{
		file: string
		url: string
		summary: string
		key: string
		emoji_id: string
		emoji_package_id: number
	}
>
export type NcObFileSeg = ObSeg<
	'file',
	{
		file: string
		file_id: string
		file_size: number
		url: string
	}
>
interface NcForwardData {
	user_id: string
	sender: {
		user_id: number
		nickname: string
		card: string
	}
	message: ObSeg[]
}
export type NcObForwardSeg = ObSeg<
	'forward',
	{
		id: string
		content?: NcForwardData[]
	}
>
export type NcObGetForwardMsg = ObResponse<{
	messages: NcForwardData[]
}>
export interface NcObPokeEvent extends ObPokeEvent {
	raw_info: [
		{ uid: string },
		{ src: string },
		{ txt: string },
		{ uid: string },
		{ txt: string },
	]
}
export interface NcObGroupMsgEmojiLikeEvent extends ObNoticeEvent {
	notice_type: 'group_msg_emoji_like'
	likes: [
		{
			emoji_id: string
			count: 1
		},
	]
	user_id: number
	group_id: number
	message_id: number
}
export interface NcObAbsMessageSendEvent extends ObEvent {
	user_id: number
	message_id: number
	message: ObSeg<string, any>[]
	raw_message: string
	sub_type: 'friend' | 'normal'
	target_id: number
	message: ObSeg<string, any>[]
}
export interface NcObPrivateMessageSendEvent extends NcObAbsMessageSendEvent {
	message_type: 'private'
	sender: {
		user_id: number
		nickname: string
		card: string
	}
}
export interface NcObGroupMessageSendEvent extends NcObAbsMessageSendEvent {
	group_id: number
	group_name: string
	message_type: 'group'
	sender: {
		user_id: number
		nickname: string
		card: string
		role: string
	}
}
export type NcObMessageSendEvent =
	| NcObPrivateMessageSendEvent
	| NcObGroupMessageSendEvent
export type NcObUploadGroupFile = ObResponse<{
	file_id: string
}>
export type NcObUploadPrivateFile = ObResponse<{
	file_id: string
}>
export type NcObCreateGroupFileFolder = ObResponse<{
	groupItem: {
		folderInfo: {
			folderId: string
		}
	}
}>
export type NcObGetRkey = ObResponse<
	[
		{
			rkey: string
			ttl: string
			time: number
			type: 10
		},
		{
			rkey: string
			ttl: string
			time: number
			type: 20
		},
	]
>
//#endregion

//#region == LLTWOBOT =============================================

/* ---------------------------
   Common / Shared types
   --------------------------- */

export interface LlbotObBuddy {
	user_id: number
	nickname: string
	remark: string
	sex: string
	birthday_year: number
	birthday_month: number
	birthday_day: number
	age: number
	qid: string
	long_nick: string
	level: number
	longNick: string
	eMail: string
	uid: string
	categoryId: number
	richTime: number
}

export interface LlbotObCategory {
	categoryId: number
	categoryName: string
	categoryMbCount: number
	buddyList: LlbotObBuddy[]
}

/* Image structure used in some messages / notices */
export interface LlbotObImageItem {
	height?: string
	width?: string
	id: string // note: image url can be constructed with https://gdynamic.qpic.cn/gdynamic/<id>/0
}

/* Group notice message body */
export interface LlbotObGroupNoticeMessage {
	text: string
	images: LlbotObImageItem[]
}

/* Generic message image item (used inside history messages) */
export interface LlbotObMsgImageData {
	file: string
	subType?: number
	url: string
	file_size?: string | number
}

/* Message sender shape for friend/group messages */
export interface LlbotObMsgSender {
	user_id: number
	nickname: string
	card?: string
	role?: string
	title?: string
}

/* File & Folder records for group file APIs */
export interface LlbotObGroupFileRecord {
	group_id: number
	file_id: string
	file_name: string
	busid: number
	file_size: number
	upload_time: number
	dead_time: number
	modify_time: number
	download_times: number
	uploader: number
	uploader_name: string
}

export interface LlbotObGroupFolderRecord {
	group_id: number
	folder_id: string
	folder_name: string
	create_time: number
	creator: number
	creator_name: string
	total_file_count: number
}

/* ---------------------------
     API response types
     --------------------------- */

/**
 * get_friends_with_category
 * Example `data` is an array of categories, each containing a buddyList.
 */
export type LlbotObGetFriendsWithCategory = ObResponse<LlbotObCategory[]>

/**
 * get_stranger_info
 * Example `data` is an object describing a stranger / user profile.
 */
export type LlbotObGetStrangerInfo = ObResponse<{
	user_id: number
	nickname: string
	sex: 'male' | 'female' | 'unknown'
	age: number
	qid: string
	level: number
	login_days: number
	reg_time: number
	long_nick: string
	city: string
	country: string
	birthday_year: number
	birthday_month: number
	birthday_day: number
}>

/**
 * _get_group_notice
 * Example `data` is an array of notices.
 */
export type LlbotObGetGroupNotice = ObResponse<
	Array<{
		sender_id: number
		publish_time: number
		message: LlbotObGroupNoticeMessage
	}>
>

/**
 * fetch_custom_face
 * Example `data` is an array of custom face image URLs.
 */
export type LlbotObFetchCustomFace = ObResponse<string[]>

/**
 * get_friend_msg_history
 * Example `data` has a `messages` array with message entries (private).
 */
export type LlbotObGetMsgHistory = ObResponse<{
	messages: LlbotObMsg[]
}>

export type LlbotObForwardNode = {
	content: ObSeg[]
	sender: {
		nickname: string
		user_id: number
	}
	time: number
	message_format: string
	message_type: string
}

/**
 * get_forward_msg
 * Example `data` includes forwarded messages (content array).
 */
export type LlbotObGetForwardMsg = ObResponse<{
	messages: LlbotObForwardNode[]
}>

/**
 * get_group_root_files
 * Example `data` contains files and folders in the group root.
 */
export type LlbotObGetGroupFiles = ObResponse<{
	files: LlbotObGroupFileRecord[]
	folders: LlbotObGroupFolderRecord[]
}>

/**
 * get_group_file_url
 * Example `data` contains a single `url` for a file resource.
 */
export type LlbotObGetGroupFileUrl = ObResponse<{
	url: string
}>

/**
 * upload_group_file
 * Example `data` returns an uploaded file id.
 */
export type LlbotObUploadGroupFile = ObResponse<{
	file_id: string
}>

/**
 * upload_private_file
 * Example `data` returns an uploaded file id.
 */
export type LlbotObUploadPrivateFile = ObResponse<{
	file_id: string
}>

/**
 * create_group_file_folder
 * Example `data` returns a created folder id.
 */
export type LlbotObCreateGroupFileFolder = ObResponse<{
	folder_id: string
}>

export type LlbotObGetEssenceMsgList = ObResponse<LlbotObEssenceMsg[]>

export type LlbotObGetRkey = ObResponse<{
	private_key: string
	group_key: string
	expired_time: number
	updated_time: string
}>

// == 消息 =================

export type LlbotObEssenceMsg = {
	sender_id: number
	sender_nick: string
	sender_time: number
	operator_id: number
	operator_nick: string
	operator_time: number
	message_id: number
}

export type LlbotObMdSeg = ObSeg<'markdown', { content: string }>

export type LlbotObImageSeg = ObSeg<
	'image',
	{
		file: string
		url: string
		file_size: string
		summary: string
		subType: number
		type: 'flash' | 'show'
		thumb: string
		name: string
	}
>

export type LlbotObFaceSeg = ObSeg<
	'face',
	{
		id: number
		sub_type: 1 | 2 | 3 | 5
	}
>

export type LlbotObMfaceSeg = ObSeg<
	'mface',
	{
		emoji_package_id: number
		emoji_id: string
		key: string
		summary: string
		url: string
	}
>

export type LlbotObFileSeg = ObSeg<
	'file',
	{
		file: string
		url: string
		path: string
		file_size: string
		file_id: string
		thumb: string
		name: string
	}
>

// == 事件 =================

export interface LlbotObPokeEvent extends ObPokeEvent {
	raw_info: [
		{ uid: string },
		{ src: string },
		{ txt: string },
		{ uid: string },
		{ txt: string },
	]
}

export interface LlbotObAbsMessageSendEvent extends ObEvent {
	user_id: number
	message_id: number
	message_seq: number
	raw_message: string
	sub_type: 'friend' | 'normal'
	message: ObSeg<string, any>[]
	post_type: 'message_sent'
	target_id: number
}
export interface LlbotObPrivateMessageSendEvent extends LlbotObAbsMessageSendEvent {
	message_type: 'private'
	sender: {
		user_id: number
		nickname: string
		card: string
	}
}
export interface LlbotObGroupMessageSendEvent extends LlbotObAbsMessageSendEvent {
	group_id: number
	group_name: string
	message_type: 'group'
	sender: {
		user_id: number
		nickname: string
		card: string
		role: string
	}
}

export type LlbotObMessageSendEvent =
	| LlbotObPrivateMessageSendEvent
	| LlbotObGroupMessageSendEvent

export interface LlbotObMsg extends ObMsg {
	message_seq: number
}

export interface LlbotObGroupMsgEmojiLikeEvent extends ObNoticeEvent {
	notice_type: 'group_msg_emoji_like'
	likes: [
		{
			emoji_id: string
			count: number
		},
	]
	user_id: number
	group_id: number
	message_id: number
}
//#endregion
