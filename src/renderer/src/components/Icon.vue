<!--
 * @FileDescription: App 头像
 * @Author: Mr.Lee
 * @Date: 2025/08/29
 * @Version: 1.0
 * @Description: App 封装了眼睛动画
-->
<template>
	<svg
		ref="svg"
		viewBox="0 0 1000 1000"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<!-- 背景 -->
		<circle cx="500" cy="500" r="500" style="fill: var(--color-main)" />
		<!-- 围巾 -->
		<path
			d="M 250 750 L 750 750 L 750 825 Q 500 925 250 825 Z"
			style="fill: red"
		/>
		<path d="M 310 750 L 275 900 L 325 915 L 365 750 Z" style="fill: red" />
		<!-- 头 -->
		<ellipse cx="500" cy="480" rx="400" ry="375" style="fill: black" />
		<!-- 脸 -->
		<ellipse cx="420" cy="535" rx="250" ry="250" style="fill: white" />
		<ellipse cx="580" cy="535" rx="250" ry="250" style="fill: white" />
		<!-- 眼睛 -->
		<!-- 左眼 -->
		<!-- 睁开 -->
		<ellipse
			v-show="!animationInfo.closeEye"
			rx="40"
			ry="60"
			:cx="350 + animationInfo.leftEyeX"
			:cy="535 + animationInfo.leftEyeY"
			style="fill: black"
		/>
		<!-- 高光 -->
		<circle
			v-show="!animationInfo.closeEye"
			:cx="370 + animationInfo.leftEyeX"
			:cy="515 + animationInfo.leftEyeY"
			r="20"
			style="fill: white"
		/>
		<!-- 闭合 -->
		<path
			v-show="animationInfo.closeEye"
			d="M 300 535 Q 350 580 400 535"
			stroke-width="10"
			style="stroke: black"
		/>
		<!-- 右眼 -->
		<ellipse
			v-show="!animationInfo.closeEye"
			:cx="650 + animationInfo.rightEyeX"
			:cy="535 + animationInfo.rightEyeY"
			rx="40"
			ry="60"
			style="fill: black"
		/>
		<!-- 高光 -->
		<circle
			v-show="!animationInfo.closeEye"
			:cx="670 + animationInfo.rightEyeX"
			:cy="515 + animationInfo.rightEyeY"
			r="20"
			style="fill: white"
		/>
		<!-- 闭合 -->
		<path
			v-show="animationInfo.closeEye"
			d="M 600 535 Q 650 580 700 535"
			stroke-width="10"
			style="stroke: black"
		/>
		<!-- 嘴巴 -->
		<path
			d="M 430 700 Q 480 685 490 625 Q 500 615 510 625 Q 520 685 570 700 Q 500 750 430 700 Z"
			style="fill: #ecc425"
		/>
	</svg>
</template>

<script setup lang="ts">
import { useTemplateRef, shallowReactive } from 'vue'
import { delay, randomNum } from '@renderer/function/utils/systemUtil'
import { useEventListener } from '@renderer/function/composable/useEventListener'
import { useInterval } from '@renderer/function/composable/useInterval'

const svg = useTemplateRef('svg')

const { animation = false } = defineProps<{
	animation?: boolean
}>()

const animationInfo = shallowReactive({
	leftEyeX: 0,
	leftEyeY: 0,
	rightEyeX: 0,
	rightEyeY: 0,
	closeEye: false,
})
const targetInfo = shallowReactive({
	leftEyeX: 0,
	leftEyeY: 0,
	rightEyeX: 0,
	rightEyeY: 0,
})

let frame: ReturnType<typeof requestAnimationFrame>

function step() {
	let hasChange = false
	for (const key in targetInfo) {
		const d = (targetInfo[key] - animationInfo[key]) as number
		const change = Math.max(-1, Math.min(1, d))
		animationInfo[key] += change
		if (change !== 0) hasChange = true
	}
	if (hasChange) frame = requestAnimationFrame(step)
}

if (animation) {
	let moveTimeout: ReturnType<typeof setTimeout> | undefined
	const moveRange = 15
	useEventListener(document, 'mousemove', (event) => {
		if (!svg.value) return
		clearTimeout(moveTimeout)
		moveTimeout = setTimeout(() => {
			targetInfo.leftEyeX = 0
			targetInfo.leftEyeY = 0
			targetInfo.rightEyeX = 0
			targetInfo.rightEyeY = 0
		}, 1000)
		const rect = svg.value.getBoundingClientRect()
		const leftEye = {
			x: rect.left + rect.width * 0.35,
			y: rect.top + rect.height * 0.535,
		}
		const rightEye = {
			x: rect.left + rect.width * 0.65,
			y: rect.top + rect.height * 0.535,
		}
		cancelAnimationFrame(frame)
		frame = requestAnimationFrame(step)
		const distanceToLeftEye = Math.hypot(
			event.clientX - leftEye.x,
			event.clientY - leftEye.y,
		)
		const distanceToRightEye = Math.hypot(
			event.clientX - rightEye.x,
			event.clientY - rightEye.y,
		)
		const leftEyeMoveX =
			(moveRange * (event.clientX - leftEye.x)) / distanceToLeftEye
		const leftEyeMoveY =
			(moveRange * (event.clientY - leftEye.y)) / distanceToLeftEye
		const rightEyeMoveX =
			(moveRange * (event.clientX - rightEye.x)) / distanceToRightEye
		const rightEyeMoveY =
			(moveRange * (event.clientY - rightEye.y)) / distanceToRightEye
		targetInfo.leftEyeX = leftEyeMoveX
		targetInfo.leftEyeY = leftEyeMoveY
		targetInfo.rightEyeX = rightEyeMoveX
		targetInfo.rightEyeY = rightEyeMoveY
	})
	useInterval(() => {
		const main = async () => {
			for (let i = 0; i < randomNum(2, 3); i++) {
				animationInfo.closeEye = true
				await delay(150)
				animationInfo.closeEye = false
				await delay(100)
			}
		}
		setTimeout(main, randomNum(0, 2000))
	}, 5000)
}
</script>
