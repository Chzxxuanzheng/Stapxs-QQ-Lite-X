<!--
 * @FileDescription: 聊天面板页面
 * @Author: Stapxs
 * @Date:
 *      2022/08/14
 *      2022/12/12
 *      2025/08/21
 *      2025/09/29
 * @Version:
 *      1.0 - 初始版本
 *      1.5 - 重构为 ts 版本，代码格式优化
 *      2.0 - 重构为 setup 式Api(Mr.Lee)
 *      2.1 - 简化代码结构，拆分成多个文件(Mr.Lee)
-->

<template>
	<div
		ref="chat-pan"
		v-move="chatMoveOptions"
		:class="{
			'chat-pan': true,
		}"
		:style="{
			'--bottom-height': bottomHeight + 'px',
			'--head-height': headHeight + 'px',
		}"
		@v-move-right.prevent="exitWin()"
	>
		<!-- 聊天基本信息 -->
		<ChatHead :session="chat" />

		<!-- 消息显示区 -->
		<div
			id="msgPan"
			ref="msgPan"
			class="chat"
			style="scroll-behavior: smooth"
			@scroll="chatScroll"
		>
			<!-- 前缀 -->
			<!-- 通常 -->
			<CustomHr v-if="chat.loadHistoryState === 'loading'">
				<a class="chat-hr-note">{{ $t('获取历史记录ing') }}</a>
			</CustomHr>
			<CustomHr v-else-if="chat.loadHistoryState === 'fail'">
				<a class="chat-hr-note">{{ $t('获取历史记录失败') }}</a>
			</CustomHr>
			<CustomHr v-else-if="chat.loadHistoryState === 'end'">
				<a class="chat-hr-note">{{ $t('没有更多消息啦～') }}</a>
			</CustomHr>
			<MsgBar
				ref="msgBar"
				:key="chat.id"
				:msgs="chat.messageList"
				:show-msg-menu="showMsgMenu"
				:show-user-menu="showUserMenu"
				:show-self-avatar="
					runtimeData.sysConfig.hide_self_avatar === false
				"
				:self-direction="runtimeData.sysConfig.self_msg_direction"
				@image-loaded="imgLoadedScroll"
				@left-move="replyMsg"
				@sender-double-click="(user) => sendPoke(user)"
				@emoji-click="changeRespond"
			/>
		</div>

		<!-- 滚动到底部悬浮标志 -->
		<div
			v-hide="!tags.showBottomButton"
			class="new-msg"
			@click="scrollBottom(true)"
		>
			<div class="ss-card">
				<font-awesome-icon :icon="['fas', 'comment']" />
				<span v-if="chat.newMsg > 0">{{ chat.newMsg }}</span>
			</div>
		</div>

		<!-- 多选指示器 -->
		<Transition name="select-tag">
			<div v-if="tags.isMultiselectMode" class="select-tag ss-card">
				<div v-if="msgBar!.multiCanForward()">
					<font-awesome-icon
						style="color: var(--color-red)"
						:icon="['fas', 'fa-xmark']"
						@click="popInfo.error(msgBar!.multiCanForward())"
					/>
					<span>{{ $t('合并转发') }}</span>
				</div>
				<div v-else>
					<font-awesome-icon
						:icon="['fas', 'fa-share-from-square']"
						@click="sendMergeForward"
					/>
					<span>{{ $t('合并转发') }}</span>
				</div>
				<div v-if="msgBar!.multiCanForward()">
					<font-awesome-icon
						style="color: var(--color-red)"
						:icon="['fas', 'fa-xmark']"
						@click="popInfo.error(msgBar!.multiCanForward())"
					/>
					<span>{{ $t('逐条转发') }}</span>
				</div>
				<div v-else>
					<font-awesome-icon
						:icon="['fas', 'fa-arrows-turn-right']"
						@click="sendSingleForward"
					/>
					<span>{{ $t('逐条转发') }}</span>
				</div>
				<div>
					<font-awesome-icon :icon="['fas', 'scissors']" />
					<span>{{ $t('截图') }}</span>
				</div>
				<div>
					<font-awesome-icon
						:icon="['fas', 'trash-can']"
						@click="delMsgs"
					/>
					<span>{{ $t('删除') }}</span>
				</div>
				<div>
					<font-awesome-icon
						:icon="['fas', 'copy']"
						@click="copyMsgs"
					/>
					<span>{{ $t('复制') }}</span>
				</div>
				<div>
					<font-awesome-icon
						:icon="['fas', 'xmark']"
						@click="recallMsgs"
					/>
					<span>{{ $t('撤回') }}</span>
				</div>
				<div>
					<span @click="closeMultiselect()">{{
						msgBar!.getMultiselectListLength()
					}}</span>
					<span>{{ $t('取消') }}</span>
				</div>
			</div>
		</Transition>

		<!-- 底部区域 -->
		<ChatBottom
			ref="bottom"
			v-model="inputMsg"
			:session="chat"
			:focus-hide="tags.isMultiselectMode"
			@send-poke="sendPoke"
			@scroll-bottom="scrollBottom"
		/>

		<!-- 合并转发消息预览器 -->
		<MergePan ref="mergePan" />
	</div>
</template>

<script setup lang="ts">
import ChatBottom from '@renderer/components/chat/ChatBottom.vue'
import ChatHead from '@renderer/components/chat/ChatHead.vue'
import CustomHr from '@renderer/components/CustomHr.vue'
import ChatMsgMenu from '@renderer/components/menu/ChatMsgMenu.vue'
import ChatUserMenu from '@renderer/components/menu/ChatUserMenu.vue'
import MergePan from '@renderer/components/MergePan.vue'
import MsgBar from '@renderer/components/MsgBar.vue'

import { logger, popInfo } from '@renderer/function/base'
import { MenuEventData } from '@renderer/function/elements/information'
import { InputMsg } from '@renderer/function/model/inputMsg'
import { Msg } from '@renderer/function/model/msg'
import { AtSeg } from '@renderer/function/model/seg'
import {
	GroupSession,
	Session,
	UserSession,
} from '@renderer/function/model/session'
import { IUser, Member } from '@renderer/function/model/user'
import useRuntimeData from '@renderer/state/runtimeData'
import { shouldAutoFocus } from '@renderer/function/utils/appUtil'
import { openContextMenu } from '@renderer/function/utils/contextMenu'
import {
	closeSession,
	mergeForward,
	singleForward,
} from '@renderer/function/utils/msgUtil'
import { ensurePopBox } from '@renderer/function/utils/popBox'
import {
	copyToClipboard,
	getViewTime,
} from '@renderer/function/utils/systemUtil'
import { vHide, vMove, VMoveOptions } from '@renderer/function/utils/vcmd'
import app from '@renderer/main'
import {
	nextTick,
	onMounted,
	shallowReactive,
	useTemplateRef,
	watch,
	shallowRef,
	markRaw,
	provide,
} from 'vue'
import { getCm } from '@renderer/function/utils/baseUtil'
import { useViewportUnits } from '@renderer/function/composable/useViewportUnits'
import { useFrame } from '@renderer/function/composable/useFrame'
import { useKeyboard } from '@renderer/function/composable/useKeyboard'
import { useBackHoldup } from '@renderer/function/composable/useBackHoldup'
//#region == 常量声明 ====================================================================
const { chat } = defineProps<{ chat: Session }>()
const inputMsg = defineModel<InputMsg>({ required: true })
const headHeight = shallowRef(0)
const bottomHeight = shallowRef(0)

const $t = app.config.globalProperties.$t
const runtimeData = useRuntimeData()
const { vh } = useViewportUnits()

//#region  == 模板引用 ======================================
const msgBar = useTemplateRef('msgBar')
const mergePan = useTemplateRef('mergePan')
const msgPan = useTemplateRef('msgPan')
const chatPan = useTemplateRef('chat-pan')
const chatBottom = useTemplateRef('bottom')
provide('mergePan', mergePan)
//#endregion

const tagsDefault = {
	showBottomButton: false,
	isMultiselectMode: false,
}
const tags = shallowReactive({ ...tagsDefault })
//#endregion

//#region == 初始化 ======================================================================
onMounted(init)

// 新消息滚动到底部
Session.beforeNewMessageHook.push(async (session, _msg) => {
	if (session !== chat) return

	const pan = msgPan.value
	if (!pan) return

	// 计算当前滚动位置距离底部的距离
	const distanceToBottom = pan.scrollHeight - pan.scrollTop - pan.clientHeight
	// 如果距离底部大于20vh，则不自动滚动
	if (distanceToBottom > 20 * vh.value) return

	nextTick(() => {
		// 等待渲染完成
		setTimeout(() => {
			scrollBottom(true)
		}, 100)
	})
})

// 更新顶部高度
useFrame(() => {
	const headBottom = document.getElementById('chat-head-bottom')
	if (!headBottom) return
	const headRect = headBottom.getBoundingClientRect()
	const height = headRect.bottom
	if (headHeight.value === height) return
	headHeight.value = height
})
// 更新底部高度
useFrame(() => {
	const bottomTop = document.getElementById('chat-bottom-top')
	if (!bottomTop) return
	const bottomRect = bottomTop.getBoundingClientRect()
	let height = 100 * vh.value - bottomRect.top
	if (tags.isMultiselectMode) height = Math.max(height, 140)
	if (bottomHeight.value === height) return
	bottomHeight.value = height
})

// ctrl+w 关闭聊天框
useKeyboard('ctrl+w', () => {
	exitWin()
	return true
})
//#endregion

//#region == 侦测器 ======================================================================
watch(() => chat?.id, init)
// Web：系统返回操作
useBackHoldup(() => {
	exitWin()
	return true
})
//#endregion

//#region == 函数 ========================================================================
/**
 * 初始化自身
 */
function init() {
	// 重置部分状态数据
	Object.assign(tags, tagsDefault)
	chatBottom.value?.init()
	// 聚焦输入框
	// PS: 有虚拟键盘的设备会弹键盘,要做判断
	if (shouldAutoFocus()) nextTick(() => chat.inputMsg.focus())
	// 滑动到底部
	nextTick(() => {
		scrollBottom(false)
	})
}
/**
 * 消息区滚动
 * @param event 滚动事件
 */
function chatScroll(event: Event) {
	const body = event.target as HTMLDivElement
	// 顶部
	if (body.scrollTop === 0 && chat.messageList.length > 0) loadHistory()

	// 底部
	if (body.scrollTop + body.clientHeight + 10 >= body.scrollHeight) {
		chat.setRead('viewer')
		tags.showBottomButton = false
	}
	// 显示回到底部
	if (
		body.scrollTop < body.scrollHeight - body.clientHeight * 2 &&
		tags.showBottomButton !== true
	) {
		tags.showBottomButton = true
	}
}

//#region == 右键菜单 ==========================================
/**
 * 显示消息右键菜单
 * @param data 右键菜单事件数据
 * @param msg 消息对象
 * @returns 显示菜单的 Promise, 关闭菜单后完成委托
 */
function showMsgMenu(data: MenuEventData, msg: Msg): Promise<void> | undefined {
	const intoMultiselect = (selectedMsg: Msg) => {
		msgBar.value?.startMultiselect()
		tags.isMultiselectMode = true
		msgBar.value?.forceAddToMultiselectList(selectedMsg)
	}
	const menu = openContextMenu(
		{ x: data.x, y: data.y },
		{
			comp: markRaw(ChatMsgMenu),
			props: {
				session: chat,
				msg: msg,
				eventData: data,
				changeRespondFunc: changeRespond,
				replyMsgFunc: replyMsg,
				intoMultiselectFunc: intoMultiselect,
			},
		},
	)
	return menu.finish
}

/**
 * 显示消息右键菜单
 * @param data 右键菜单事件数据
 * @param msg 用户
 * @returns 显示菜单的 Promise, 关闭菜单后完成委托
 */
function showUserMenu(data: MenuEventData, user: IUser) {
	const setAtFunc = (member: Member) => {
		chat.inputMsg.addSq(new AtSeg(member.user_id))
	}

	const menu = openContextMenu(
		{ x: data.x, y: data.y },
		{
			comp: markRaw(ChatUserMenu),
			props: {
				session: chat,
				user: user,
				sendPokeFunc: sendPoke,
				setAtFunc: setAtFunc as (user: IUser) => void,
			},
		},
	)
	return menu.finish
}

/**
 * 回复消息
 */
function replyMsg(msg: Msg) {
	if (!msg.message_id) {
		popInfo.error($t('无法回复该消息'))
		return
	}

	chat.inputMsg.setReply(msg)
}

/**
 * 发送消息回应
 * @param num
 */
async function changeRespond(id: string, msg: Msg) {
	if (!runtimeData.nowAdapter?.setResponse) {
		popInfo.error($t('当前适配器不支持表情回应'))
		return
	}

	if (!runtimeData.loginInfo) throw new Error('未登录')

	const hasSend =
		msg?.emojis[id]?.includes(runtimeData.loginInfo.uin) ?? false

	// lgr 贴表情不会根据是否已经有了做判断,而且我拿不到 emoji_id,不知道也没有已经贴上去了
	// 所以采用这个逻辑,添加成功按贴表情成功处理,否则尝试移除表情

	const re = await runtimeData.nowAdapter.setResponse(msg, id, !hasSend)

	if (!re) return
	msg.setEmoji(id, runtimeData.loginInfo.uin, !hasSend)
}
//#endregion

// TODO: 虚拟列表优化
// // 清屏重新加载消息列表（超过 n 条消息、回到底部按钮不显示）
// // PS：也就是说只在消息底部时才会触发，以防止你是在看历史消息攒满了刷掉
// if (
//     list.length > 200 &&
//     !tags.nowGetHistroy &&
//     !tags.showBottomButton
// ) {
//     loadHistory(false)
// }

/**
 * 发送戳一戳
 */
async function sendPoke(user: IUser) {
	if (chat instanceof GroupSession) {
		await sendGroupPoke(user)
	} else if (chat instanceof UserSession) {
		await sendPrivatePoke()
	}
}
async function sendGroupPoke(target: IUser) {
	if (!(target instanceof Member)) {
		popInfo.error($t('无法戳一戳该用户'))
		return
	}
	if (!runtimeData.nowAdapter?.sendGroupPoke) {
		popInfo.error($t('当前适配器不支持戳一戳'))
		return
	}

	await runtimeData.nowAdapter.sendGroupPoke(chat as GroupSession, target)
}
async function sendPrivatePoke() {
	if (!runtimeData.nowAdapter?.sendPrivatePoke) {
		popInfo.error($t('当前适配器不支持戳一戳'))
		return
	}

	await runtimeData.nowAdapter.sendPrivatePoke(chat as UserSession)
}
//#region == 多选菜单相关 ==================================================
/**
 * 合并转发
 */
function sendMergeForward() {
	if (!msgBar.value) return
	const msgList = msgBar.value.getMultiselectList()
	if (msgList.length === 0) return

	mergeForward(msgList)

	closeMultiselect()
}
/**
 * 逐条转发
 */
function sendSingleForward() {
	if (!msgBar.value) return
	const msgList = msgBar.value.getMultiselectList()
	if (msgList.length === 0) return

	singleForward(msgList)

	closeMultiselect()
}
/**
 * 删除消息
 */
async function delMsgs() {
	if (!msgBar.value) return
	const msgList = [...msgBar.value.getMultiselectList()]

	closeMultiselect()

	for (const msg of msgList) {
		await chat.removeMsg(msg)
	}
}
/**
 * 复制消息
 */
function copyMsgs() {
	if (!msgBar.value) return
	const msgList = msgBar.value.getMultiselectList()
	let msg = ''
	let lastDate = ''
	msgList.forEach((item: Msg) => {
		let time: Date | undefined
		// 去除 item.time 时间戳中的时间，只保留日期
		if (item.time) {
			time = new Date(getViewTime(item.time.time))
			const date =
				time.getFullYear() +
				'-' +
				(time.getMonth() + 1) +
				'-' +
				time.getDate()
			if (date != lastDate) {
				msg += '\n—— ' + date + ' ——\n'
				lastDate = date
			}
		}
		if (time) {
			msg +=
				item.sender.name +
				' ' +
				time.getHours() +
				':' +
				time.getMinutes() +
				':' +
				time.getSeconds() +
				'\n' +
				item.plaintext() +
				'\n\n'
		} else msg += item.preMsg + '\n\n'
	})
	msg = msg.trim()
	copyToClipboard(msg)
		.then(() => popInfo.info($t('复制成功')))
		.catch(() => popInfo.error($t('复制失败')))
}
/**
 * 批量撤回消息
 */
async function recallMsgs() {
	if (!msgBar.value) return
	if (!runtimeData.nowAdapter?.recallMsg) {
		popInfo.error($t('当前适配器不支持撤回消息'))
		return
	}
	if (!(await ensurePopBox($t('要撤回选中的消息吗？')))) return
	const msgList = msgBar.value.getMultiselectList()
	const tasks: Promise<true | undefined>[] = []
	for (const msg of msgList) {
		tasks.push(runtimeData.nowAdapter.recallMsg(msg))
	}
	closeMultiselect()
	await Promise.all(tasks)
}
function closeMultiselect() {
	if (!msgBar.value) return
	msgBar.value.cancelMultiselect()
	tags.isMultiselectMode = false
}
//#endregion

//#region == 窗口移动相关 ==================================================
const chatMoveOptions: VMoveOptions<HTMLDivElement> = {
	beforeHook: (_) => {
		// 移除不需要的css
		const target = getTargetWin()
		if (!target) return
		target.style.transition = 'all 0s'
		// 禁用滚动
		const pan = chatPan.value
		if (!pan) return
		const chatDom = pan.getElementsByClassName('chat')[0] as HTMLDivElement
		if (chatDom) chatDom.style.overflowY = 'hidden'
	},
	moveHook: (_, move: number) => {
		// 移动距离 css
		const target = getTargetWin()
		if (!target) return
		target.style.transform = 'translateX(' + move + 'px)'
	},
	endHook: (_) => {
		// 复原css
		const pan = chatPan.value
		const chatDom = pan?.getElementsByClassName('chat')[0] as HTMLDivElement
		if (chatDom) {
			chatDom.style.overflowY = 'scroll'
		}
		const target = getTargetWin()
		if (!target) return
		target.style.transition = 'transform 0.3s'
		target.style.transform = ''
	},
	rightLimit: {
		value: 100,
		type: '%',
	},
	speedCondition: {
		minMove: {
			value: getCm(),
			type: 'px',
		},
		minSpeed: 10 * getCm(),
	},
	moveCondition: {
		minMove: {
			value: 33,
			type: '%',
		},
	},
}
//#endregion
/**
 * 得到焦点窗口
 */
function getTargetWin(): HTMLDivElement | undefined {
	const pan = chatPan.value
	if (!pan) return
	if (mergePan.value?.isMergeOpen()) {
		// 合并转发面板返回
		return pan.getElementsByClassName('merge-pan')[0] as HTMLDivElement
	} else {
		// 聊天面板底层返回
		return pan as HTMLDivElement
	}
}
/**
 * 退出一层窗口
 */
function exitWin() {
	if (mergePan.value?.isMergeOpen()) {
		// 合并转发栏
		mergePan.value?.closeMergeMsg()
		setTimeout(() => {
			const pan = chatPan.value
			const mergePanDom = pan?.getElementsByClassName(
				'merge-pan',
			)[0] as HTMLDivElement
			if (mergePanDom) {
				mergePanDom.style.transform = ''
			}
		}, 500)
	} else {
		// 自身
		closeSession()
		logger.add('UI', '右滑打开侧边栏触发完成')
	}
}

/**
 * 加载更多历史消息
 */
async function loadHistory() {
	if (chat.loadHistoryState !== 'normal') return

	if (!(await chat.loadHistory())) return
}

Session.afterLoadHistoryHook.push((_arg1, _arg2, _arg3) => {
	const pan = msgPan.value
	if (!pan) return
	const oldScrollHeight = pan.scrollHeight

	nextTick(() => {
		logger.debug(
			`滚动前高度：${oldScrollHeight}，当前高度：${pan.scrollHeight}，滚动位置：${pan.scrollHeight - oldScrollHeight}`,
		)
		scrollTo(pan.scrollTop + pan.scrollHeight - oldScrollHeight, false)
	})
})
//#endregion

//#region == 滑动工具 ==========================================
/**
 * 消息区滚动到指定位置
 * @param where 位置（px）
 * @param showAnimation 是否使用动画
 */
function scrollTo(where: number | undefined, showAnimation = true) {
	const pan = msgPan.value
	if (pan !== null && where) {
		if (showAnimation === false) {
			pan.style.scrollBehavior = 'auto'
		} else {
			pan.style.scrollBehavior = 'smooth'
		}
		pan.scrollTop = where
		pan.style.scrollBehavior = 'smooth'
	}
}
function scrollBottom(showAnimation = false) {
	const pan = msgPan.value
	if (!pan) return
	scrollTo(pan.scrollHeight, showAnimation)
}
function imgLoadedScroll(height: number) {
	const pan = msgPan.value
	if (!pan) return

	if (chat.messageList.length <= 20 && !tags.showBottomButton) {
		scrollBottom()
	} else {
		// 纠正滚动位置
		scrollTo(pan.scrollTop + height, false)
	}
}
//#endregion
</script>
