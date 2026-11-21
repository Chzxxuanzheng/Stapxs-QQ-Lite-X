<template>
	<div ref="lottieContainer" class="lazy-lottie">
		<Lottie
			ref="lottieRef"
			:animation-link="animationLink"
			:title="title"
			:auto-play="false"
			@on-animation-loaded="onAnimationLoaded"
		/>
	</div>
</template>

<script setup lang="ts">
import { logger } from '@renderer/function/base'
import { useTemplateRef, onMounted, onUnmounted } from 'vue'
import { Vue3Lottie as Lottie } from 'vue3-lottie'

defineProps<{
	animationLink: string
	title?: string
}>()

const emit = defineEmits<{
	/** 动画渲染完成，携带原始画布尺寸（读取不到时均为 0） */
	loaded: [size: { width: number; height: number }]
}>()

const lottieContainer = useTemplateRef('lottieContainer')
const lottieRef = useTemplateRef('lottieRef')
let observer: IntersectionObserver | null = null

/**
 * 动画渲染完成，回报原始画布尺寸
 * PS: lottie-web 渲染时会把 JSON 里的画布尺寸写进 SVG 的 viewBox，
 *     所以这里直接读 viewBox 即可，不需要额外请求动画 JSON。
 */
function onAnimationLoaded() {
	const svg = lottieContainer.value?.querySelector('svg')
	const viewBox = svg
		?.getAttribute('viewBox')
		?.trim()
		.split(/[\s,]+/)
	// viewBox 形如 "0 0 w h"，后两项才是画布尺寸
	const width = Number(viewBox?.[2]) || 0
	const height = Number(viewBox?.[3]) || 0
	emit('loaded', { width, height })
}

const playAnimation = () => {
	if (!lottieRef.value) return
	try {
		lottieRef.value.play?.()
	} catch (e) {
		logger.error(e as Error, 'Lottie播放错误')
	}
}

const pauseAnimation = () => {
	if (lottieRef.value) {
		lottieRef.value.pause?.()
	}
}

onMounted(() => {
	if (!lottieContainer.value) return

	observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
					// 至少 50% 可见才渲染和播放
					playAnimation()
				} else if (entry.intersectionRatio < 0.1) {
					// 几乎不可见时暂停
					pauseAnimation()
				}
			}
		},
		{
			rootMargin: '50px',
			threshold: [0.1, 0.5, 0.9],
		},
	)

	observer.observe(lottieContainer.value)
})

onUnmounted(() => {
	pauseAnimation()
	if (observer && lottieContainer.value) {
		observer.unobserve(lottieContainer.value)
		observer.disconnect()
		observer = null
	}
})
</script>

<style scoped>
.lazy-lottie {
	display: inline-block;
	min-height: 100px;
	min-width: 100px;
}
</style>
