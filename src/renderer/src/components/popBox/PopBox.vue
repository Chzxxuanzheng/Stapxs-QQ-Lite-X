<template>
	<div
		v-esc="autoClose"
		:class="{
			'pop-box': true,
			'move-close': moveClose,
		}"
	>
		<div
			ref="main"
			v-move="moveOptions"
			:class="{
				'pop-box-body': true,
				'ss-card': true,
				full: full,
				window: true,
			}"
			:style="{
				marginBottom:
					runtimeData.sysConfig.fs_adaptation > 0
						? `${40 + Number(runtimeData.sysConfig.fs_adaptation)}px`
						: '',
				transform: vw * 100 > 500 ? 'translate(-50%, -50%)' : '',
			}"
			@v-move-right="closeByMove"
		>
			<header v-if="title">
				<div v-if="svg">
					<font-awesome-icon :icon="['fas', svg]" />
				</div>
				<a>{{ title }}</a>
				<font-awesome-icon
					v-if="allowAutoClose"
					:icon="['fas', 'xmark']"
					@click="autoClose"
				/>
			</header>
			<component
				:is="props.data.comp"
				v-bind="props.data.props"
				v-model="model"
				v-on="props.data.emit || {}"
				@close-pop-box="closeSelf"
			/>
			<div v-if="buttons.length > 0" class="button">
				<button
					v-for="(button, index) in buttons"
					:key="'pop-box-btn' + index"
					v-focus="button.master"
					:class="{
						'ss-button': true,
						master: button.master,
					}"
					@click="clickButton($event, button)"
				>
					{{ button.text }}
				</button>
			</div>
		</div>
		<div @click="autoClose" />
	</div>
</template>

<script setup lang="ts" generic="T extends Component">
import useRuntimeData from '@renderer/state/runtimeData'
import {
	closePopBox,
	PopBoxButton,
	PopBoxData,
} from '@renderer/function/utils/popBox'
import {
	vEsc,
	vFocus,
	vMove,
	VMoveOptions,
} from '@renderer/function/utils/vcmd'
import { useViewportUnits } from '@renderer/function/utils/vuse'
import { animate } from 'animejs'
import { type Component, nextTick, shallowRef, useTemplateRef } from 'vue'
import { getCm } from '@renderer/function/utils/baseUtil'

const { props } = defineProps<{ props: { id: string; data: PopBoxData<T> } }>()

const runtimeData = useRuntimeData()
const model = defineModel<any>()

const id = props.id
const {
	svg,
	title,
	full = false,
	button: buttons = [],
	allowAutoClose = true,
} = props.data

const popBoxEl = useTemplateRef('main')
const { vw } = useViewportUnits()
const moveClose = shallowRef(false)

const moveOptions: VMoveOptions<HTMLDivElement> = {
	moveHook: (el, move: number) => {
		if (!allowAutoClose) return
		if (vw.value * 100 <= 500) el.style.transform = `translateX(${move}px)`
		else el.style.transform = `translate(calc(-50% + ${move}px), -50%)`
	},
	endHook: (el) => {
		if (!allowAutoClose) return
		el.style.transform = vw.value * 100 > 500 ? 'translate(-50%, -50%)' : ''
	},
	rightLimit: {
		value: 50 * vw.value,
		type: 'px',
	},
	speedCondition: {
		minMove: {
			value: getCm(),
			type: 'px',
		},
		minSpeed: 5 * getCm(),
	},
	moveCondition: {
		minMove: {
			value: 33,
			type: '%',
		},
	},
}

/**
 * 通过拖动关闭 PopBox
 */
function closeByMove() {
	if (allowAutoClose) moveClose.value = true
	nextTick(autoClose)
}

/**
 * 自动关闭 PopBox
 * 如果不允许自动关闭，则执行一个摇晃动画
 */
function autoClose() {
	if (!allowAutoClose) {
		if (!popBoxEl.value) return
		const animeBody = popBoxEl.value
		// 使用 animejs 实现一个沿中心左右摇晃的动画，摇晃三次
		animate(animeBody, {
			rotate: [
				{ value: -10, duration: 75, easing: 'easeInOutSine' },
				{ value: 8, duration: 150, easing: 'easeInOutSine' },
				{ value: -5, duration: 150, easing: 'easeInOutSine' },
				{ value: 0, duration: 75, easing: 'easeInOutSine' },
			],
			duration: 200,
			easing: 'easeInOutSine',
		})
		return
	}
	closeSelf()
}

/**
 * 关闭当前 PopBox
 */
function closeSelf() {
	closePopBox(id)
}

/**
 * 按钮点击事件
 * @param event 事件
 * @param button 被点击的按钮
 */
function clickButton(
	event: Event,
	button: NonNullable<PopBoxButton[]>[number],
) {
	event.stopPropagation()
	event.preventDefault()

	if (button.fun?.length === 0) (button.fun as () => void)()
	else if (button.fun?.length === 1) button.fun(event)

	if (button.noClose) return
	closeSelf()
}
</script>
