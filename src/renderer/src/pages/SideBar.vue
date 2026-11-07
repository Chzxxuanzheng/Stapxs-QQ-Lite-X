<!--
 * @FileDescription: 侧边栏
 * @Author: Mr.Lee
 * @Date: 2025/09/18
 * @Version: 1.0
-->
<template>
	<div
		ref="side-bar"
		v-move="moveOptions"
		class="side-bar"
		:style="{
			paddingBottom:
				runtimeData.sysConfig.fs_adaptation > 0
					? `${runtimeData.sysConfig.fs_adaptation}px`
					: '',
		}"
		:class="{
			fold: foldState === 'fold',
			hide: runtimeData.sysConfig.auto_hide_side_bar === 'hide',
			show: isHover,
		}"
		@v-move-left="nextSideBar()"
		@v-move-right="prevSideBar()"
		@mouseenter="hoverStart()"
		@mouseleave="hoverEnd()"
	>
		<transition
			mode="out-in"
			:name="`change-side-bar-${changeSideBarDirection}`"
		>
			<component
				:is="sideBarInfo.template"
				ref="sideBar"
				:key="sideBarInfo.type"
				class="side-bar-main"
				:side-bar-state="foldState"
			/>
		</transition>

		<div style="margin: auto" />
		<hr />

		<div class="bottom">
			<div
				class="icon"
				:title="$t('消息')"
				:class="{ active: sideBarInfo.type === 'Message' }"
				@click="clickChangeSideBar(messageSideBar)"
			>
				<font-awesome-icon :icon="['fas', 'envelope']" />
			</div>
			<div
				class="icon"
				:title="$t('联系人')"
				:class="{ active: sideBarInfo.type === 'Friend' }"
				@click="clickChangeSideBar(friendSideBar)"
			>
				<font-awesome-icon :icon="['fas', 'user']" />
			</div>
			<div
				class="icon"
				:title="$t('收纳盒')"
				:class="{ active: sideBarInfo.type === 'Box' }"
				@click="clickChangeSideBar(boxSideBar)"
			>
				<font-awesome-icon :icon="['fas', 'box']" />
			</div>
			<div style="margin: auto" />
			<div
				v-if="canControlFold"
				class="icon"
				:title="fold ? $t('展开') : $t('折叠')"
				:class="{ active: fold }"
				@click="fold = !fold"
			>
				<font-awesome-icon :icon="['fas', 'bars-staggered']" />
			</div>
			<div class="icon" :title="$t('设置')" @click="openOptions">
				<font-awesome-icon :icon="['fas', 'gear']" />
			</div>
		</div>

		<!-- 拖拽块 -->
		<div
			class="drag-region"
			:class="{ grabbing: dragging }"
			@mousedown="startDrag"
		/>
	</div>
</template>

<script setup lang="ts">
import { mousemoveMask } from '@renderer/function/input'
import useRuntimeData from '@renderer/state/runtimeData'
import { popBox } from '@renderer/function/utils/popBox'
import { VMoveOptions, vMove } from '@renderer/function/utils/vcmd'
import app from '@renderer/main'
import { computed, shallowRef, useTemplateRef } from 'vue'
import Boxes from '@renderer/pages/Boxes.vue'
import Friends from '@renderer/pages/Friends.vue'
import Messages from '@renderer/pages/Messages.vue'
import Options from '@renderer/pages/Options.vue'
import { getCm } from '@renderer/function/utils/baseUtil'
import { useLocalStorage } from '@renderer/function/composable/useLocalStorage.js'
import { useEventListener } from '@renderer/function/composable/useEventListener.js'
import { useKeyboard } from '@renderer/function/composable/useKeyboard.js'

const $t = app.config.globalProperties.$t
const runtimeData = useRuntimeData()

const moveOptions: VMoveOptions<HTMLDivElement> = {
	leftLimit: {
		value: 999,
		type: 'px',
	},
	rightLimit: {
		value: 999,
		type: 'px',
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

type SideBarType = 'Message' | 'Friend' | 'Box'

type SideBarInfo = {
	id: number
	type: SideBarType
	template: any
}

const messageSideBar: SideBarInfo = {
	type: 'Message',
	template: Messages,
	id: 0,
}
const friendSideBar: SideBarInfo = {
	type: 'Friend',
	template: Friends,
	id: 1,
}
const boxSideBar: SideBarInfo = {
	type: 'Box',
	template: Boxes,
	id: 2,
}
const sideBars = [messageSideBar, friendSideBar, boxSideBar]

const sideBarInfo = shallowRef<SideBarInfo>(messageSideBar)
const fold = useLocalStorage('side_bar_fold_state', false)
const changeSideBarDirection = shallowRef<'left' | 'right'>('right')
const canControlFold = computed(() => {
	return runtimeData.sysConfig.auto_hide_side_bar === 'none'
})
const isHover = shallowRef(false)
const dragging = shallowRef(false)
const bar = useTemplateRef('side-bar')
const foldState = computed<'open' | 'fold'>(() => {
	if (canControlFold.value) return fold.value ? 'fold' : 'open'
	switch (runtimeData.sysConfig.auto_hide_side_bar) {
		case 'none':
			return 'open'
		case 'fold':
			if (isHover.value) return 'open'
			return 'fold'
		case 'hide':
			return 'open'
		default:
			throw new Error(
				`未知侧边栏状态${runtimeData.sysConfig.auto_hide_side_bar}`,
			)
	}
})

/**
 * 滑动切换上一个侧边栏内容
 */
function nextSideBar() {
	const id = (sideBarInfo.value.id + 1) % sideBars.length
	changeSideBarDirection.value = 'right'
	setSideBar(sideBars[id])
}

/**
 * 滑动切换下一个侧边栏内容
 */
function prevSideBar() {
	const id = (sideBarInfo.value.id - 1 + sideBars.length) % sideBars.length
	changeSideBarDirection.value = 'left'
	setSideBar(sideBars[id])
}

/**
 * 通过点击切换侧边栏内容
 * @param barInfo
 */
function clickChangeSideBar(barInfo: SideBarInfo) {
	if (sideBarInfo.value.type === barInfo.type) return
	if (barInfo.id > sideBarInfo.value.id)
		changeSideBarDirection.value = 'right'
	else changeSideBarDirection.value = 'left'

	setSideBar(barInfo)
}

/**
 * 设置侧边栏内容
 * @param barInfo
 */
function setSideBar(barInfo: SideBarInfo) {
	sideBarInfo.value = barInfo
}

/**
 * 打开设置
 */
function openOptions() {
	popBox({
		comp: Options,
	})
}

let hoverTimeout: ReturnType<typeof setTimeout> | undefined
let staticTime: number | undefined
/**
 * 鼠标移入
 * 可以指定多长时间，才允许鼠标移出后，侧边栏收起
 * @param timeout
 */
function hoverStart(timeout: number = 500) {
	if (!staticTime) {
		isHover.value = true
		staticTime = Date.now() + timeout
	}
	clearTimeout(hoverTimeout)
}
/**
 * 鼠标移出
 * @param event 鼠标移除位置检测
 */
function hoverEnd() {
	if (!staticTime) return

	const dTime = staticTime - Date.now()
	if (dTime <= 0) {
		isHover.value = false
		staticTime = undefined
	} else {
		hoverTimeout = setTimeout(() => {
			isHover.value = false
			staticTime = undefined
		}, dTime)
	}
}

/**
 * 开始拖拽
 */
function startDrag() {
	bar.value!.style.transition = 'none'
	mousemoveMask(
		(event) => {
			// 拖拽标记
			dragging.value = true
			// 拖拽大小调整
			runtimeData.sysConfig.side_bar_width = event.clientX
			if (runtimeData.sysConfig.side_bar_width < 100) fold.value = true
			else if (runtimeData.sysConfig.side_bar_width > 250)
				fold.value = false
			// 计算鼠标指针大小
			const el = document.getElementById('mask')!
			el.style.cursor = fold.value ? 'e-resize' : 'ew-resize'
		},
		() => {
			dragging.value = false
			bar.value!.style.transition = ''
		},
	)
}

useEventListener(document, 'mouseout', (event) => {
	if (runtimeData.sysConfig.auto_hide_side_bar !== 'hide') return
	if (isHover.value) return
	if (event.clientX > 5) return
	hoverStart()
	hoverEnd()
})

useKeyboard('ctrl+b', () => {
	if (canControlFold.value) {
		fold.value = !fold.value
	} else {
		hoverStart(2000)
		hoverEnd()
	}
	return true
})
</script>
