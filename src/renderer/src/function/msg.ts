/*
 * @FileDescription: 消息处理模块
 * @Author: Stapxs
 * @Date:
 *      2022/11/1
 *      2022/12/7
 *      2024/9/2
 * @Version:
 *      1.0 - 初始版本
 *      2.0 - 重构为 ts 版本，修改 Vue3 相关变更
 *      3.0 - 优化更优雅的代码结构
 * @Description: <del>此模块用于拆分和保存/处理 bot 返回的各类信息，整个运行时数据也保存在这儿。</del>
 *               用于处理受到的事件
 */
import qed from '@renderer/assets/qed.txt?raw'

import Umami from '@stapxs/umami-logger-typescript'

import { randomNum } from '@renderer/function/utils/systemUtil'
import { logger } from './base'
import { Msg, SelfMsg } from './model/msg'
import { Notify } from './notify'
import { htmlPopBox } from './utils/popBox'
import { FileSender } from './utils/fileSender'
import { RecallEvent } from './model/event'
import useRuntimeData from '@renderer/state/runtimeData'

export function recallMsg(event: RecallEvent) {
	const runtimeData = useRuntimeData()
	const session = event.session
	// 寻找消息
	let matchMsg: undefined | Msg
	let matchMsgId: undefined | number
	for (const [id, msg] of session.messageList.entries()) {
		if (!(msg instanceof Msg)) continue
		if (msg.message_id === String(event.recallId)) {
			matchMsg = msg
			matchMsgId = id
			break
		}
	}
	if (!matchMsg || !matchMsgId) {
		logger.error(null, '没有找到这条被撤回的消息 ……')
		return
	}

	// 收录被撤回的消息，方便重新编辑
	if (matchMsg.sender.user_id === runtimeData.loginInfo?.uin) {
		event.message.originMsg = matchMsg
	}

	// 添加提示,移除消息
	session.removeMsg(matchMsg)

	// 撤回通知
	new Notify().closeAll(String(session.id))
}

let qed_try_times = 0
export async function newMsg(msg: Msg) {
	const runtimeData = useRuntimeData()
	// 消息基础信息 ============================================
	if (!msg.session)
		return logger.error(null, '消息没有 session 信息，无法处理消息')
	if (!msg.message_id)
		return logger.error(null, '消息没有 message_id 信息，无法处理消息')
	const loginId = runtimeData.loginInfo?.uin
	const sender = msg.sender.user_id

	// 自己发送消息拦截 ============================================
	if (sender === loginId) {
		if (await SelfMsg.isSendMsg(msg)) return
		if (await FileSender.isSendFile(msg)) return
	}

	// 添加消息
	msg.session.addMessage(msg)

	// 抽个签 (什么鬼？业务逻辑而还没抽签多)
	if (msg.session !== runtimeData.nowChat) return
	const num = randomNum(0, 10000)
	qed_try_times++
	if (num >= 4500 && num <= 5500) {
		logger.info(num.toString() + '，这只是个神秘的数字...')
	}
	if (num === 495) {
		// QED怎么能和芙兰无关？(◣_◢)吃我一发 QED [495年的波纹]
		htmlPopBox(qed, {
			button: [{ text: '确定(O)' }],
		})
		Umami.trackEvent('show_qed', { times: qed_try_times })
	}
}
