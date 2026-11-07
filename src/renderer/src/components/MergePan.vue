<template>
	<Transition name="merge-pan">
		<Teleport v-if="stack.length > 0" to="body">
			<div
				v-move="chatMoveOptions"
				class="merge-pan"
				@v-move-right="closeMergeMsg"
			>
				<div @click="closeMergeMsg" />
				<div ref="mergePan" class="ss-card">
					<div>
						<font-awesome-icon
							style="margin-top: 5px"
							:icon="['fas', 'message']"
						/>
						<span>{{ $t('合并消息') }}</span>
						<font-awesome-icon
							:icon="[
								'fas',
								stack.length > 1 ? 'angle-left' : 'xmark',
							]"
							@click="exitMergeMsg"
						/>
					</div>
					<div>
						<Transition
							:name="
								addMode ? 'merge-node-add' : 'merge-node-remove'
							"
							mode="out-in"
							@leave="addMode ? saveScrollPosition() : ''"
							@enter="!addMode ? restoreScrollPosition() : ''"
						>
							<div
								v-if="
									nowData === undefined && stack.length === 0
								"
								class="merge-node"
							>
								<!-- 无内容 -->
							</div>
							<div
								v-else-if="!nowData?.content"
								:class="'loading show'"
								class="merge-node"
							>
								<font-awesome-icon :icon="['fas', 'spinner']" />
								<span>{{ $t('加载中') }}</span>
							</div>

							<KeepAlive v-else>
								<MsgBar
									ref="msgBar"
									:key="'merge-' + nowData.id"
									:msgs="nowData.content as Message[]"
									:show-msg-menu="showMsgMenu"
									:special-self="false"
									:direction="
										vw * 100 > 450 ? 'right' : 'left'
									"
									:ex-info="[]"
									class="merge-node"
								/>
							</KeepAlive>
						</Transition>
					</div>
					<!-- 多选指示器 -->
					<Transition name="select-tag">
						<div v-if="isMultiselectMode" class="select-tag">
							<div v-if="msgBarEl!.multiCanForward()">
								<font-awesome-icon
									style="color: var(--color-red)"
									:icon="['fas', 'fa-xmark']"
									@click="
										popInfo.error(
											msgBarEl!.multiCanForward(),
										)
									"
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
							<div v-if="msgBarEl!.multiCanForward()">
								<font-awesome-icon
									style="color: var(--color-red)"
									:icon="['fas', 'fa-xmark']"
									@click="
										popInfo.error(
											msgBarEl!.multiCanForward(),
										)
									"
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
								<font-awesome-icon
									:icon="['fas', 'scissors']"
								/>
								<span>{{ $t('截图') }}</span>
							</div>
							<div>
								<font-awesome-icon
									:icon="['fas', 'copy']"
									@click="copyMsgs"
								/>
								<span>{{ $t('复制') }}</span>
							</div>
							<div>
								<span @click="closeMultiselect()">{{
									msgBarEl!.getMultiselectListLength()
								}}</span>
								<span>{{ $t('取消') }}</span>
							</div>
						</div>
					</Transition>
				</div>
			</div>
		</Teleport>
	</Transition>
</template>

<script setup lang="ts">
import MsgBar from './MsgBar.vue'

import { popInfo } from '@renderer/function/base'
import { MenuEventData } from '@renderer/function/elements/information'
import { Message } from '@renderer/function/model/message'
import { Msg } from '@renderer/function/model/msg'
import { ForwardSeg } from '@renderer/function/model/seg'
import { openContextMenu } from '@renderer/function/utils/contextMenu'
import { mergeForward, singleForward } from '@renderer/function/utils/msgUtil'
import {
	copyToClipboard,
	getViewTime,
} from '@renderer/function/utils/systemUtil'
import { vMove, VMoveOptions } from '@renderer/function/utils/vcmd'
import app from '@renderer/main'
import {
	markRaw,
	nextTick,
	shallowReactive,
	shallowRef,
	useTemplateRef,
	watch,
} from 'vue'
import ChatMsgMenu from './menu/ChatMsgMenu.vue'
import { getCm } from '@renderer/function/utils/baseUtil'
import { useViewportUnits } from '@renderer/function/composable/useViewportUnits.js'

const { vw } = useViewportUnits()
const stack = shallowReactive<ForwardSeg[]>([])
const nowData = shallowRef<undefined | ForwardSeg>()
const addMode = shallowRef(true)
const positionCache: number[] = []
const isMultiselectMode = shallowRef(false)

const msgBarEl = useTemplateRef('msgBar')
const mergePanEl = useTemplateRef('mergePan')

const chatMoveOptions: VMoveOptions<HTMLDivElement> = {
	beforeHook: (_) => {
		// 移除不需要的css
		const target = mergePanEl.value!
		target.style.transition = 'all 0s'
		// 禁用滚动
		target.style.overflowY = 'hidden'
	},
	moveHook: (_, move: number) => {
		// 移动距离 css
		const target = mergePanEl.value!
		target.style.width = `${450 - move}px`
	},
	endHook: (_) => {
		// 复原css
		const target = mergePanEl.value!
		target.style.overflowY = 'auto'
		target.style.transition = 'transform 0.3s'
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

watch(
	() => stack.length,
	(newLength, oldLength) => {
		// 最后一个保留下来做展开关闭动画
		if (stack.length !== 0) nowData.value = stack.at(-1)

		// 判断是增加还是减少
		if (newLength > oldLength) addMode.value = true
		else if (newLength < oldLength) addMode.value = false
	},
)

function $t(value: string) {
	return app.config.globalProperties.$t(value)
}

//#region == 操作与状态 ===================================================
function openMergeMsg(seg: ForwardSeg) {
	stack.push(seg)
}

/**
 * 退出一层合并转发弹窗
 */
function exitMergeMsg() {
	stack.length--
}
/**
 * 关闭合并转发弹窗
 */
function closeMergeMsg() {
	stack.length = 0
	positionCache.length = 0
}
/**
 * 判断合并转发弹窗是否打开
 * @returns 是否打开
 */
function isMergeOpen() {
	return stack.length > 0
}
//#endregion

//#region == 菜单栏相关 ====================================================
/**
 * 显示消息右键菜单
 * @param data 右键菜单事件数据
 * @param msg 消息对象
 * @returns 显示菜单的 Promise, 关闭菜单后完成委托
 */
function showMsgMenu(data: MenuEventData, msg: Msg): Promise<void> | undefined {
	const intoMultiselect = (selectedMsg: Msg) => {
		msgBarEl.value?.startMultiselect()
		isMultiselectMode.value = true
		msgBarEl.value?.forceAddToMultiselectList(selectedMsg)
	}
	const menu = openContextMenu(
		{ x: data.x, y: data.y },
		{
			comp: markRaw(ChatMsgMenu),
			props: {
				msg: msg,
				eventData: data,
				intoMultiselectFunc: intoMultiselect,
			},
		},
	)
	return menu.finish
}
//#endregion

//#region == 多选栏相关 ====================================================
/**
 * 合并转发
 */
function sendMergeForward() {
	if (!msgBarEl.value) return
	const msgList = msgBarEl.value.getMultiselectList()
	if (msgList.length === 0) return

	mergeForward(msgList)

	closeMultiselect()
}
/**
 * 逐条转发
 */
function sendSingleForward() {
	if (!msgBarEl.value) return
	const msgList = msgBarEl.value.getMultiselectList()
	if (msgList.length === 0) return

	singleForward(msgList)

	closeMultiselect()
}

/**
 * 复制消息
 */
function copyMsgs() {
	if (!msgBarEl.value) return
	const msgList = msgBarEl.value.getMultiselectList()
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
function closeMultiselect() {
	if (!msgBarEl.value) return
	msgBarEl.value.cancelMultiselect()
	isMultiselectMode.value = false
}
//#endregion

//#region == 滚动辅助函数 =================================================
/**
 * 保存滚动位置
 */
function saveScrollPosition() {
	if (!msgBarEl.value) return
	positionCache.push((msgBarEl.value as any as HTMLDivElement).scrollTop)
}
/**
 * 恢复滚动位置
 */
function restoreScrollPosition() {
	const position = positionCache.pop()
	if (!msgBarEl.value || position === undefined) return
	nextTick(() => {
		;(msgBarEl.value as any as HTMLDivElement).scrollTop = position
	})
}
//#endregion

defineExpose({
	isMergeOpen,
	closeMergeMsg,
	openMergeMsg,
})
</script>
