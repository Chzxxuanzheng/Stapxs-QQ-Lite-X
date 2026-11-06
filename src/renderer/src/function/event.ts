/*
 * @FileDescription: 消息处理模块
 * @Author: Mr.Lee
 * @Date:
 *      2025/08/09
 * @Version:
 *      1.0 - 初始版本
 * @Description:
 *               用于处理收到的事件，分发向钩子
 */

import useRuntimeData from '@renderer/state/runtimeData'
import { EventData, EventType } from './adapter/interface'
import {
	BanEvent,
	BanLiftEvent,
	Event,
	JoinEvent,
	LeaveEvent,
	MsgEvent,
	PokeEvent,
	RecallEvent,
	ResponseEvent,
} from './model/event'
import { Session } from './model/session'
import { newMsg, recallMsg } from './msg'

type EventHook<T extends Event> = (event: T) => void | Promise<void>
const eventHooks: Map<EventType, EventHook<any>[]> = new Map()

function eventHandle<T extends Event>(
	...args: [EventType, ...EventType[], EventHook<T>]
): void {
	const handle = args.pop() as EventHook<T>
	const types = args as EventType[]
	for (const t of types) {
		if (!eventHooks.has(t)) {
			eventHooks.set(t, [])
		}
		eventHooks.get(t)?.push(handle)
	}
}
/**
 * 收到事件
 * @param event
 */
export async function handleEvent(eventData: EventData): Promise<void> {
	// 很不优雅捏，但不知道怎么解决，特殊处理下吧
	if (eventData['session']) {
		const session = Session.getSession(eventData['session'])
		await session.activate()
	}
	const event = Event.parse(eventData)
	const hooks = eventHooks.get(event.type)
	if (hooks) {
		for (const hook of hooks) {
			hook(event)
		}
	}
}

// 处理新消息
eventHandle('msg', (event: MsgEvent) => {
	newMsg(event.message)
	// newMsg 包含加消息的逻辑，这里不处理
})

// 撤回消息
eventHandle('recall', (event: RecallEvent) => {
	recallMsg(event)
	event.session.addMessage(event.message)
})

// 禁言
eventHandle('ban', (event: BanEvent) => {
	event.user.setBanTime(event.duration)
	event.session.addMessage(event.message)
})

// 解禁
eventHandle('banLift', (event: BanLiftEvent) => {
	event.user.clearBanTime()
	event.session.addMessage(event.message)
})

// 戳一戳
eventHandle('poke', (event: PokeEvent) => {
	event.session.addMessage(event.message)
})

// 加群
eventHandle('join', async (event: JoinEvent) => {
	await event.session.reloadUserList()
	event.message.refreshUserData()
	event.session.addMessage(event.message)
})

// 退群
eventHandle('leave', async (event: LeaveEvent) => {
	await event.session.reloadUserList()
	event.session.addMessage(event.message)
})

// 表情回应
eventHandle('response', async (event: ResponseEvent) => {
	const runtimeData = useRuntimeData()
	if (runtimeData.sysConfig.close_respond) return
	event.msg.setEmoji(event.emojiId, event.operator.user_id, event.add)

	// 显示消息回应
	if (!event.add) return
	switch (runtimeData.sysConfig.show_response_message) {
		case 'none':
			return
		case 'self':
			if (
				event.operator.user_id !== runtimeData.selfInfo?.user_id &&
				event.msg.sender.user_id !== runtimeData.selfInfo?.user_id
			)
				return
			break
		case 'all':
			break
		default:
			throw new Error(
				`未知的 show_response_message 设置项: ${runtimeData.sysConfig.show_response_message}`,
			)
	}
	event.session.addMessage(event.message)
})
