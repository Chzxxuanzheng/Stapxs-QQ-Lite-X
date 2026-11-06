<!--
 * @FileDescription: 会话右键菜单
 * @Author: Mr.Lee
 * @Date:
 *      2025/08/02
 * @Version:
 *      1.0 - 初始版本
 * @Description:
 *      原本的只能在Message.vue中使用的右键菜单，现在抽离出来，方便其他组件使用
-->
<template>
	<div>
		<div class="ss-card msg-menu-body" @click.stop>
			<div v-if="displayTag.top" @click="clickTop">
				<div><font-awesome-icon :icon="['fas', 'fa-thumbtack']" /></div>
				<a>{{ $t('置顶') }}</a>
			</div>
			<div v-if="displayTag.cancelTop" @click="clickCancelTop">
				<div>
					<font-awesome-icon :icon="['fas', 'fa-grip-lines']" />
				</div>
				<a>{{ $t('取消置顶') }}</a>
			</div>
			<div v-if="displayTag.remove" @click="clickRemove">
				<div><font-awesome-icon :icon="['fas', 'fa-trash-can']" /></div>
				<a>{{ $t('卸载') }}</a>
			</div>
			<div v-if="displayTag.reload" @click="clickReload">
				<div><font-awesome-icon :icon="['fas', 'fa-undo']" /></div>
				<a>{{ $t('重载') }}</a>
			</div>
			<div v-if="displayTag.read" @click="clickReaded">
				<div>
					<font-awesome-icon :icon="['fas', 'fa-check-to-slot']" />
				</div>
				<a>{{ $t('标记已读') }}</a>
			</div>
			<div v-if="displayTag.unread" @click="clickRead">
				<div><font-awesome-icon :icon="['fas', 'fa-flag']" /></div>
				<a>{{ $t('标记未读') }}</a>
			</div>
			<div v-if="displayTag.noticeOpen" @click="clickNoticeOpen">
				<div>
					<font-awesome-icon :icon="['fas', 'fa-volume-high']" />
				</div>
				<a>{{ $t('开启通知') }}</a>
			</div>
			<div v-if="displayTag.noticeClose" @click="clickNoticeClose">
				<div>
					<font-awesome-icon :icon="['fas', 'fa-volume-xmark']" />
				</div>
				<a>{{ $t('关闭通知') }}</a>
			</div>
			<div v-if="displayTag.putInBox" @click="clickPutInBox">
				<div><font-awesome-icon :icon="['fas', 'fa-box']" /></div>
				<a>{{ $t('收纳盒') }}</a>
			</div>
			<div v-if="displayTag.configBox" @click="clickConfigBox">
				<div><font-awesome-icon :icon="['fas', 'fa-gear']" /></div>
				<a>{{ $t('设置') }}</a>
			</div>
			<div v-if="displayTag.leaveBox" @click="clickLeaveBox">
				<div>
					<font-awesome-icon
						:icon="['fas', 'arrow-up-right-from-square']"
					/>
				</div>
				<a>{{ $t('离开盒子') }}</a>
			</div>
			<div v-if="displayTag.deleteBox" @click="clickDeleteBox">
				<div>
					<font-awesome-icon
						:icon="['fas', 'fa-trash']"
						style="color: var(--color-red)"
					/>
				</div>
				<a style="color: var(--color-red)">{{ $t('删除') }}</a>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { BubbleBox, SessionBox } from '@renderer/function/model/box'
import { GroupSession, Session } from '@renderer/function/model/session'
import useRuntimeData from '@renderer/state/runtimeData'
import { ensurePopBox, popBox } from '@renderer/function/utils/popBox'
import { i18n } from '@renderer/main'
import ConfigBox from '@renderer/components/popBox/ConfigBox.vue'
import SelectBox from '@renderer/components/popBox/SelectBox.vue'
import { markRaw, shallowReactive, ShallowReactive } from 'vue'

//#region == 声明变量 ================================================================
const $t = i18n.global.t
const runtimeData = useRuntimeData()
const displayTag: ShallowReactive<{
	top: boolean
	cancelTop: boolean
	remove: boolean
	reload: boolean
	read: boolean
	unread: boolean
	noticeOpen: boolean
	noticeClose: boolean
	putInBox: boolean
	configBox: boolean
	leaveBox: boolean
	deleteBox: boolean
}> = shallowReactive({
	top: false,
	cancelTop: false,
	remove: false,
	reload: false,
	read: false,
	unread: false,
	noticeOpen: false,
	noticeClose: false,
	putInBox: false,
	configBox: false,
	leaveBox: false,
	deleteBox: false,
})

const { from, session, box } = defineProps<{
	from: 'message' | 'friend'
	session?: Session
	box?: SessionBox
}>()
const emit = defineEmits<{
	close: [arg?: any]
}>()
init()
//#endregion

//#region == 方法函数 ================================================================
async function init(): Promise<void> {
	for (const key in displayTag) displayTag[key] = false

	if (session) checkSessionMenuConfig(from, session, box)
	else checkBoxMenuConfig(from, box!)
}

/**
 * 检查会话菜单配置
 * @param fromComponent
 * @param selectedSession
 */
function checkSessionMenuConfig(
	fromComponent: 'message' | 'friend',
	selectedSession: Session,
	selectedBox?: SessionBox,
): void {
	// 检测需要显示的菜单项
	// 置顶
	if (selectedSession.alwaysTop) {
		displayTag.top = false
		displayTag.cancelTop = true
	} else {
		displayTag.top = true
		displayTag.cancelTop = false
	}
	// 删除
	if (fromComponent === 'message' && selectedSession.isActive) {
		if (runtimeData.nowChat?.id === selectedSession.id) {
			displayTag.remove = false
			displayTag.reload = true
		} else {
			displayTag.remove = true
			displayTag.reload = false
		}
	} else {
		displayTag.remove = false
		displayTag.reload = false
	}
	// 已读与未读
	if (fromComponent === 'message') {
		if (selectedSession.showNotice) {
			displayTag.unread = false
			displayTag.read = true
		} else {
			displayTag.unread = true
			displayTag.read = false
		}
	} else {
		displayTag.read = false
		displayTag.unread = false
	}
	// 通知开关
	if (selectedSession instanceof GroupSession) {
		if (selectedSession.notice) {
			displayTag.noticeOpen = false
			displayTag.noticeClose = true
		} else {
			displayTag.noticeOpen = true
			displayTag.noticeClose = false
		}
	} else {
		displayTag.noticeOpen = false
		displayTag.noticeClose = false
	}
	displayTag.putInBox = true
	// 移除收纳盒
	if (selectedBox && selectedBox.id !== BubbleBox.instance.id) {
		displayTag.leaveBox = true
	} else {
		displayTag.leaveBox = false
	}
}

/**
 * 检查收纳盒菜单配置
 * @param selectedBox
 */
function checkBoxMenuConfig(
	fromComponent: 'message' | 'friend',
	selectedBox: SessionBox,
): void {
	if (selectedBox.id === BubbleBox.instance.id) {
		return checkBubbleBoxConfig(fromComponent, selectedBox)
	}
	// 检测需要显示的菜单项
	// 置顶
	if (selectedBox.alwaysTop) {
		displayTag.top = false
		displayTag.cancelTop = true
	} else {
		displayTag.top = true
		displayTag.cancelTop = false
	}
	// 删除
	if (fromComponent === 'message') {
		if (selectedBox.isActive) {
			displayTag.remove = true
		} else {
			displayTag.remove = false
		}
	} else {
		displayTag.remove = false
	}
	// 已读与未读
	if (fromComponent === 'message') {
		if (selectedBox.showNotice) {
			displayTag.read = true
		} else {
			displayTag.read = false
		}
	} else {
		displayTag.read = false
	}

	// 设置
	displayTag.configBox = true
	// 删除
	displayTag.deleteBox = true
}

/**
 * 检查群收纳盒的菜单配置
 */
function checkBubbleBoxConfig(
	fromComponent: 'message' | 'friend',
	selectedSession: BubbleBox,
): void {
	// 删除
	if (fromComponent === 'message') {
		if (selectedSession.isActive) {
			displayTag.remove = true
		} else {
			displayTag.remove = false
		}
	} else {
		displayTag.remove = false
	}
	// 已读与未读
	if (fromComponent === 'message') {
		if (selectedSession.showNotice) {
			displayTag.read = true
		} else {
			displayTag.read = false
		}
	} else {
		displayTag.read = false
	}
}

function getTarget(): Session | SessionBox {
	if (session) return session
	else if (box) return box
	else throw new Error('没有选择会话或收纳盒')
}

function clickTop() {
	getTarget().setAlwaysTop(true)
	emit('close')
}
function clickCancelTop() {
	getTarget().setAlwaysTop(false)
	emit('close')
}
function clickRemove() {
	getTarget().unactive()
	emit('close')
}
function clickReload() {
	const target = getTarget() as Session
	target.unactive()
	setTimeout(() => {
		target.activate()
	}, 1000)
	emit('close')
}
function clickReaded() {
	getTarget().setRead('cmd')
	emit('close')
}
function clickRead() {
	if (!session) return
	const target = session
	target.showNotice = true
	emit('close')
}
function clickNoticeOpen() {
	;(getTarget() as GroupSession)?.setNotice(true)
	emit('close')
}
function clickNoticeClose() {
	;(getTarget() as GroupSession)?.setNotice(false)
	emit('close')
}
function clickPutInBox() {
	popBox({
		title: $t('放入收纳盒'),
		comp: SelectBox,
		props: { session: markRaw(getTarget() as Session) },
		button: [
			{
				text: $t('确定'),
				master: true,
			},
		],
	})
	emit('close')
}
function clickConfigBox() {
	popBox({
		title: $t('收纳盒设置'),
		comp: ConfigBox,
		model: markRaw(getTarget()) as SessionBox,
		button: [
			{
				text: $t('确定'),
				master: true,
			},
		],
	})
	emit('close')
}
function clickLeaveBox() {
	if (box && session) {
		box.removeSession(session)
		SessionBox.saveData()
	}
	emit('close')
}
function clickDeleteBox() {
	const target = getTarget() as SessionBox
	ensurePopBox($t('确定要删除收纳盒吗？它会永远消失的！')).then((ensure) => {
		if (ensure) target.remove()
	})
	emit('close')
}
//#endregion
</script>
