/*
 * @FileDescription: Session 的一些钩子函数
 * @Author: Mr.Lee
 * @Date: 2025/07/15
 * @Version: 1.0
 *           2.0
 * @Description: 感觉业务逻辑写在模型里太怪了...拆出来(里面的方法也不少了吧?)
 */

import app from '@renderer/main'
import { Message } from '@renderer/function/model/message'
import { GroupSession, Session } from '@renderer/function/model/session'
import { Notice, ReceivedNotice, SystemNotice } from '@renderer/function/model/notice'
import useRuntimeData from '@renderer/state/runtimeData'
import { Msg } from '@renderer/function/model/msg'
import { NotifyInfo } from '@renderer/function/elements/system'
import { Notify } from '@renderer/function/notify'
import { isImportant as userIsImportant } from '@renderer/function/utils/msgUtil'
import { refreshFavicon } from '@renderer/function/utils/favicon'

/**
 * 给正在输入差屁股...
 */
Session.afterNewMessageHook.push((session: Session, _: Message) => {
	const { $t } = app.config.globalProperties
	if (session.appendInfo === $t('对方正在输入……'))
		session.appendInfo = undefined
})
//#region == 通知相关 ==============================================
/**
 * 通知处理(群组)
 */
Session.afterNewMessageHook.push((session: Session, msg: Message) => {
	if (!(session instanceof GroupSession)) return
	if (msg instanceof SystemNotice) return
	if (!needSendNotice(session)) return
	if (msg.fromMe) return

	if (!isImportant(msg) && !groupNeedShowNotice(session)) return

	session.showNotice = true

	// 发送通知
	if (!groupNeedSendNotify(session)) return
	sendNotify(session, msg)
})
/**
 * 通知处理(非群组)
 */
Session.afterNewMessageHook.push((session: Session, msg: Message) => {
	if (session instanceof GroupSession) return
	if (msg instanceof SystemNotice) return
	if (!needSendNotice(session)) return
	if (msg.fromMe) return

	session.showNotice = true
	// 发送通知
	sendNotify(session, msg)
})
/**
 * 设置已读处理
 */
Session.afterNewMessageHook.push((session: Session, msg: Message) => {
	if (!msg.fromMe) return
	session.setRead('sender')
})
//#endregion

//#region == 高亮相关 ==============================================
const atme = app.config.globalProperties.$t('@你')
const atall = app.config.globalProperties.$t('@全体')
const concern = app.config.globalProperties.$t('特别关心')
// const ann = app.config.globalProperties.$t('公告')
Session.afterNewMessageHook.push((session: Session, msg: Message) => {
	if (hasConnectionWithImport(msg)) addHighlightInfo(session, concern)
	if (msg instanceof Msg) {
		if (msg.atme) addHighlightInfo(session, atme)
		if (msg.atall) addHighlightInfo(session, atall)
	}
})
//#endregion

//#region == 图标更新 ==============================================
Session.afterNewMessageHook.push((_session: Session, _msg: Message) => {
	refreshFavicon()
})
Session.afterSetReadHook.push((_session: Session) => {
	refreshFavicon()
})
Session.afterUnactiveHook.push((_session: Session) => {
	refreshFavicon()
})
//#endregion

//#region == 文件更新 ==============================================
Session.afterNewMessageHook.push((session: Session, msg: Message) => {
	if (!(session instanceof GroupSession)) return
	if (!isFileMsg(msg)) return

	session.loadFiles(false)
})
//#endregion

//#region == 工具函数 ==============================================
/**
 * 判断现在窗口是否有必要发通知
 */
function needSendNotice(session: Session): boolean {
	const runtimeData = useRuntimeData()
	if (!document.hasFocus()) return true
	if (document.hidden) return true
	if (runtimeData.nowChat !== session) return true
	return false
}

/**
 * 该消息是否和特别关系的人有关系
 * @param msg 消息
 * @returns
 */
function hasConnectionWithImport(msg: Message): boolean {
	if (msg instanceof ReceivedNotice) {
		for (const user of msg.users) {
			if (userIsImportant(user.user_id)) return true
		}
		return false
	} else if (msg instanceof Msg) {
		return userIsImportant(msg.sender)
	}
	return false
}

/**
 * 判断消息是否重要
 * @param msg 消息
 */
function isImportant(msg: Message): boolean {
	if (hasConnectionWithImport(msg)) return true
	if (msg instanceof Notice) {
		if (msg.toMe) return true
		return false
	} else if (msg instanceof Msg) {
		if (msg.atme) return true
		if (msg.atall) return true
		return false
	}
	return false
}

function addHighlightInfo(session: Session, msg: string): void {
	if (!session.highlightInfo.includes(msg)) {
		session.highlightInfo.unshift(msg)
	}
}

/**
 * 发送通知
 * @param session 会话
 * @param msg 消息
 * @param important 特别关心
 */
function sendNotify(
	session: Session,
	msg: Message,
	important: boolean = false,
): void {
	const runtimeData = useRuntimeData()
	// 如果没有开启通知，直接返回
	if (runtimeData.sysConfig.close_notice) return

	let tag: string
	if (msg instanceof Msg) tag = `${session.id}/${msg.message_id ?? ''}`
	else tag = `${session.id}/`

	// 组装通知
	const msgInfo = {
		base_type: 'msg',
		title: session.showName,
		body: msg.preMsg,
		tag: tag,
		icon: session.face,
		image: undefined as any,
		type: session.type,
		is_important: important,
	} as NotifyInfo

	new Notify().notify(msgInfo)
}

/**
 * 判断群组是否需要通知
 * @param session 群组会话
 */
function groupNeedShowNotice(session: GroupSession): boolean {
	if (session.notice) return true
	const runtimeData = useRuntimeData()
	if (runtimeData.sysConfig.group_notice_type === 'all') return true
	if (runtimeData.sysConfig.group_notice_type === 'inner') return true
	return false
}

/**
 * 判断群组是否需要发送通知
 * @param session 群组会话
 */
function groupNeedSendNotify(session: GroupSession): boolean {
	if (session.notice) return true
	const runtimeData = useRuntimeData()
	if (runtimeData.sysConfig.group_notice_type === 'all') return true
	return false
}

function isFileMsg(msg: Message): boolean {
	if (!(msg instanceof Msg)) return false
	if (msg.message.length !== 1) return false
	const seg = msg.message[0]
	return seg.type === 'file'
}
//#endregion
