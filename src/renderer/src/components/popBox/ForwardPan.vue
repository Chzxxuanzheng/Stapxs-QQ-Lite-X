<!--
 * @FileDescription: 转发栏组件
 * @Author: Mr.Lee
 * @Date: 2025/07/27
 *        2025/07/31
 *        2025/08/18
 * @Version: 1.0
 *           2.0 重构为弹窗
-->
<template>
	<div class="forward-pan">
		<div>
			<input
				v-auto-focus
				v-search="searchInfo"
				:placeholder="$t('搜索 ……')"
			/>
			<button v-if="!multiselectMode" @click="multiselectMode = true">
				多选
			</button>
			<button v-if="multiselectMode" @click="runForward">发送</button>
		</div>
		<div>
			<TinySessionBody
				v-for="session in displaySession"
				:key="session.id"
				:session="session"
				:selected="selected.includes(session)"
				@click="clickChat(session)"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import MsgBar from '@renderer/components/MsgBar.vue'
import TinySessionBody from '@renderer/components/TinySessionBody.vue'

import { logger, popInfo } from '@renderer/function/base'
import { Msg, SelfMsg, SelfPreMsg } from '@renderer/function/model/msg'
import { Session } from '@renderer/function/model/session'
import useRuntimeData from '@renderer/state/runtimeData'
import { changeSession } from '@renderer/function/utils/msgUtil'
import { popBox } from '@renderer/function/utils/popBox'
import { vAutoFocus, vSearch } from '@renderer/function/utils/vcmd'
import app from '@renderer/main'
import {
	computed,
	h,
	markRaw,
	nextTick,
	shallowReactive,
	shallowRef,
	ShallowRef,
} from 'vue'

//#region == 声明/导出变量 ===========================================================
// 变量
type MsgWhileSend = { session: Session; msgs: SelfMsg[] }[]
const runtimeData = useRuntimeData()
const { $t } = app.config.globalProperties
const selected: ShallowRef<Session[]> = shallowRef([])
const multiselectMode: ShallowRef<boolean> = shallowRef(false)
const refreshDisplaySession = shallowRef(0)
const searchInfo = shallowReactive({
	originList: shallowReactive<Session[]>([]),
	query: shallowReactive([]),
	isSearch: false,
})
const displaySession = computed(() => {
	void refreshDisplaySession.value
	const headSession = selected.value
	const mainSession = searchInfo.isSearch
		? searchInfo.query
		: searchInfo.originList
	return [...headSession, ...mainSession]
})

const { msgs, type } = defineProps<{
	msgs: Msg[]
	type: 'single' | 'merge'
}>()

const emit = defineEmits<{
	closePopBox: []
}>()

init()
//#endregion

//#region == 方法函数 ====================================================================
/**
 * 初始化乱七八糟的参数
 */
function init() {
	const activeChat = Array.from(Session.activeSessions).sort((a, b) => {
		if (!a.preMessage?.time) return 1
		if (!b.preMessage?.time) return -1
		return b.preMessage.time.time - a.preMessage.time.time
	})
	const allChat = Session.sessionList.filter(
		(item) => !activeChat.includes(item),
	)

	searchInfo.originList = shallowReactive([...activeChat, ...allChat])
	multiselectMode.value =
		runtimeData.sysConfig.default_multiselect_forward ?? false
}
/**
 * 运行发送消息确认框
 */
async function runForward() {
	close()
	let previewMsg: SelfPreMsg[]
	let title: string
	let whileSendMsg: MsgWhileSend
	if (type === 'single') {
		title = $t('转发消息')
		previewMsg = createSinglePreview(msgs)
	} else {
		title = $t('合并转发消息')
		previewMsg = createMergePreview(msgs)
	}

	popBox({
		title: title,
		comp: () =>
			h('div', { style: { overflowY: 'auto' } }, [
				h(
					MsgBar,
					markRaw({
						msgs: previewMsg,
						canInteraction: false,
						showIcon: false,
						dimNonExistentMsg: false,
						withoutAvatar: true,
					}),
				),
			]),
		button: [
			{
				text: $t('取消'),
			},
			{
				text: $t('确定'),
				master: true,
				fun: async () => {
					try {
						if (type === 'single') {
							whileSendMsg = await createSingleSendMsgs(msgs)
						} else {
							whileSendMsg = await createMergeSendMsg(msgs)
						}
						sendMsg(whileSendMsg)
						popInfo.info($t('转发成功'))
					} catch (e) {
						logger.error(e as Error, '转发失败')
						popInfo.error($t('转发失败'))
					}
				},
			},
		],
	})

	if (!runtimeData.sysConfig.jump_forward) return
	if (selected.value.length > 1) return
	const chat = selected.value[0]
	nextTick(() => {
		changeSession(chat)
	})
}
/**
 * 直接发送消息的函数
 * @param msgs
 */
// oxlint-disable-next-line no-shadow
async function sendMsg(msgs: MsgWhileSend) {
	// oxlint-disable-next-line no-shadow
	const main = async (session: Session, msgs: SelfMsg[]) => {
		for (const msg of msgs) {
			await session.addMessage(msg)
			await msg.send()
		}
	}
	const tasks: Promise<void>[] = []
	for (const data of msgs) {
		tasks.push(main(data.session, data.msgs))
	}
	await Promise.all(tasks)
}
function close() {
	emit('closePopBox')
}
/**
 * 创建单条转发消息预览
 * @param msgs
 */
// oxlint-disable-next-line no-shadow
function createSinglePreview(msgs: Msg[]): SelfPreMsg[] {
	const out: SelfPreMsg[] = []
	msgs.forEach((msg: Msg) => {
		out.push(SelfPreMsg.create(msg.message))
	})
	return out
}
/**
 * 创建合并转发消息预览
 * @param msg
 */
// oxlint-disable-next-line no-shadow
function createMergePreview(msgs: Msg[]): SelfPreMsg[] {
	const Msg = SelfPreMsg.createMerge(msgs)
	return [Msg]
}
/**
 * 创建单条转发消息发送内容
 * @param msgs
 */
// oxlint-disable-next-line no-shadow
async function createSingleSendMsgs(msgs: Msg[]): Promise<MsgWhileSend> {
	const out: Promise<{ session: Session; msgs: SelfMsg[] }>[] = []
	const main = async (session: Session) => {
		const sessionMsg: SelfMsg[] = []
		await session.activate()
		for (const msg of msgs) {
			sessionMsg.push(
				SelfMsg.create(
					msg.message.map((item) => item.copy()),
					session,
				),
			)
		}
		return { session, msgs: sessionMsg }
	}
	for (const session of selected.value) {
		out.push(main(session))
	}
	return Promise.all(out)
}

/**
 * 创建合并转发消息发送内容
 * @param msgs
 */
// oxlint-disable-next-line no-shadow
async function createMergeSendMsg(msgs: Msg[]): Promise<MsgWhileSend> {
	const out: Promise<{ session: Session; msgs: SelfMsg[] }>[] = []
	const main = async (session: Session) => {
		await session.activate()
		return {
			session,
			msgs: [
				SelfMsg.createMerge(
					msgs.map((item) => item.copy()),
					session,
				),
			],
		}
	}
	for (const session of selected.value) {
		out.push(main(session))
	}
	return Promise.all(out)
}
function clickChat(chat: Session) {
	if (!multiselectMode.value) {
		selected.value = [chat]
		runForward()
	} else {
		const selectedPos = selected.value.indexOf(chat)
		if (selectedPos > -1) {
			selected.value.splice(selectedPos, 1)
			searchInfo.originList.unshift(chat)
		} else {
			selected.value.push(chat)
			const originPos = searchInfo.originList.indexOf(chat)
			if (originPos > -1) searchInfo.originList.splice(originPos, 1)
		}
		refreshDisplaySession.value++
	}
}
//#endregion
</script>
