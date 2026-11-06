<template>
	<div ref="lottieContainer" class="lazy-lottie">
		<Lottie
			ref="lottieRef"
			:animation-link="animationLink"
			:title="title"
			:auto-play="false"
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

const lottieContainer = useTemplateRef('lottieContainer')
const lottieRef = useTemplateRef('lottieRef')
let observer: IntersectionObserver | null = null

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
