<script setup lang="ts">
import { LinkInfo } from '@renderer/function/utils/linkViewUtil';
import { computed, shallowRef, useTemplateRef, watchEffect } from 'vue';

const { info } = defineProps<{
	info: LinkInfo & { type: 'music163' }
}>()

const input = useTemplateRef('input')
const audio = useTemplateRef('audio')

const maxTime = shallowRef(0)
const currentTime = shallowRef(0)

const status = shallowRef<'loading' | 'error' | 'play' | 'pause'>('loading')

function audioLoaded() {
	status.value = 'pause'

	if (!audio.value) return

	maxTime.value = audio.value.duration
}

function audioControl() {
	if (status.value === 'play') status.value = 'pause'
	else if (status.value === 'pause') status.value = 'play'
}

function audioUpdate() {
	if (!audio.value) return

	maxTime.value = audio.value.duration
	currentTime.value = audio.value.currentTime
}

function audioChange() {
	if (!audio.value) return
	if (!input.value) return

	const value = +input.value.value

	if (value <= audio.value.duration) {
		if (audio.value.paused) {
			audio.value.currentTime = value
		} else {
			audio.value.pause()
			audio.value.currentTime = value
			audio.value.play()
		}
	}
}

function formatTime(time: number) {
	const minutes = Math.floor(time / 60)
	const seconds = Math.floor(time % 60)
	return `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`
}

// 更新 滑块位置
watchEffect(() => {
	if (!input.value) return
	input.value.value = currentTime.value.toString()
	input.value.max = maxTime.value.toString()
})

// 播放完检测
watchEffect(() => {
	if (status.value === 'loading' || status.value === 'error') return
	if (currentTime.value >= maxTime.value) {
		currentTime.value = 0
		status.value = 'pause'
	}
})

// 播放状态控制
watchEffect(() => {
	if (!audio.value) return
	if (status.value === 'play') audio.value.play()
	else audio.value.pause()
})

// 播放进度
const percent = computed(() => {
	return currentTime.value / maxTime.value
})
</script>

<template>
	<div class="msg-link-view music163">
		<header>
			<img :src="info.cover.url" :alt="'[' + $t('封面') + ']'" />
			<div class="info">
				<strong>
					{{ info.name }}
					<template v-if="info.freeRange">
						{{ $t('（试听）') }}
					</template>
				</strong>
				<span>{{ info.authors.join('/') }}</span>
			</div>
		</header>
		<hr />
		<div class="audio">
			<audio :src="info.playLink?.url" @loadedmetadata="audioLoaded()" @timeupdate="audioUpdate()" ref="audio" />
			<font-awesome-icon v-if="status === 'loading'" :icon="['fas', 'spinner']" spin />
			<font-awesome-icon v-else-if="status === 'pause'" :icon="['fas', 'play']" @click="audioControl()" />
			<font-awesome-icon v-else-if="status === 'play'" :icon="['fas', 'pause']" @click="audioControl()" />
			<font-awesome-icon v-else-if="status === 'error'" :icon="['fas', 'face-frown']" />
			<input value="0" min="0" step="0.1" type="range" @input="audioChange()" ref="input" />
			<div class="progress-bar">
				<div :style="{ '--percent': percent }" />
			</div>
			<span>{{ formatTime(currentTime) }} / {{ formatTime(maxTime) }}</span>
		</div>
	</div>
</template>