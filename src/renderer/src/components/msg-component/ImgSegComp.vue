<!--
 * @FileDescription: 图片消息消息组件
 * @Author: Mr.Lee
 * @Date: 2026/01/02
 * @Version: 1.3 - 支持 isLottie 动画消息
 * @Description: 图片消息的单独组件，主要用于处理图片加载完成后的消息尺寸刷新问题
-->
<script setup lang="ts">
import { useViewer } from '@renderer/function/composable/inject/useViewer'
import { ImgSeg } from '@renderer/function/model/segs'
import LazyLottie from '@renderer/components/LazyLottie.vue'
import { computed, h, nextTick, render, shallowRef, useTemplateRef } from 'vue'

const { seg, pos } = defineProps<{
	seg: ImgSeg
	pos: 'alone' | 'top' | 'middle' | 'bottom'
}>()

const emit = defineEmits<{
	imageLoaded: [height: number]
}>()

const rootRef = useTemplateRef<HTMLDivElement>('rootRef')

const viewer = useViewer()

const src = computed(() => {
	const url = seg.url
	if (!url) return ''
	if (url.startsWith('base64://')) {
		return url.replace('base64://', 'data:image/png;base64,')
	}
	return url
})

const naturalWidth = shallowRef(seg.width ?? 0)
const naturalHeight = shallowRef(seg.height ?? 0)

function initType(): 'image' | 'face' | 'long-image' {
	if (seg.isFace) return 'face'
	const nw = naturalWidth.value
	const nh = naturalHeight.value
	return nw > 0 && nh / nw > 3 ? 'long-image' : 'image'
}

const state = shallowRef<'loading' | 'loaded' | 'error'>('loading')
const type = shallowRef<'image' | 'face' | 'long-image'>(initType())

/**
 * 只把原始像素尺寸以 CSS 变量形式下发给样式表，
 * 占位盒子的 width / aspect-ratio / 兜底尺寸全部由 msg.css 决定。
 * PS: 之前只下发 --width / --height 但样式里除表情外并没有消费它们，
 *     导致图片加载完成前盒子没有任何尺寸约束、塌陷成 icon 大小，
 *     图片就绪后又被撑开，是整个聊天列表高度突变的直接原因。
 */
const boxStyle = computed(() => {
	const nw = naturalWidth.value
	const nh = naturalHeight.value
	if (!(nw > 0 && nh > 0)) return undefined
	return { '--img-w': `${nw}`, '--img-h': `${nh}` }
})

function init() {
	void initImg()
}

/**
 * 初始化图片尺寸信息
 */
async function initImg() {
	const load = seg.isLottie ? loadedLottie : loadedImg
	let loadResult = await load()
	if (!loadResult) {
		await seg.refreshResource()
		loadResult = await load()
	}

	if (!loadResult) state.value = 'error'
}

async function loadedImg(): Promise<boolean> {
	if (!src.value) return false
	return new Promise((resolve) => {
		const img = new Image()
		img.onload = () => {
			onLoaded(
				img.naturalWidth || img.width,
				img.naturalHeight || img.height,
			)
			resolve(true)
		}

		img.onerror = () => {
			resolve(false)
		}

		img.src = src.value
	})
}

async function loadedLottie(): Promise<boolean> {
	if (!seg.url) return false

	const size = await new Promise<
		{ width: number; height: number } | undefined
	>((resolve) => {
		const host = document.createElement('div')
		let settled = false

		const finish = (result?: { width: number; height: number }) => {
			if (settled) return
			settled = true
			clearTimeout(timer)
			// 卸载探测实例并释放游离节点
			render(null, host)
			resolve(result)
		}

		const timer = setTimeout(() => finish(), 10 * 1000)

		render(
			h(LazyLottie, {
				animationLink: seg.url,
				onLoaded: (result) => finish(result),
			}),
			host,
		)
	})

	if (!size) return false
	onLoaded(size.width, size.height)
	return true
}

/**
 * 资源就绪，图片解码和动画探测共用这一条路径
 * 记录尺寸、回填元数据、切换状态，并通知父级纠正滚动位置
 * @param width 原始宽度
 * @param height 原始高度
 */
function onLoaded(width: number, height: number) {
	// 加载前的高度，用于让父级纠正滚动位置
	const beforeHeight = rootRef.value?.getBoundingClientRect().height ?? 0

	if (width > 0 && height > 0) {
		naturalWidth.value = width
		naturalHeight.value = height
		if (!seg.width) {
			try {
				seg.setSize(width, height)
			} catch {}
		}
		// 长图是针对超长图片的展示兜底，动画不适用
		if (!seg.isLottie && height / width > 3) {
			type.value = 'long-image'
		}
	}

	state.value = 'loaded'

	nextTick(() => {
		const afterHeight = rootRef.value?.getBoundingClientRect().height ?? 0
		emit('imageLoaded', afterHeight - beforeHeight)
	})
}

void init()

/**
 * 图片点击
 */
function imgClick() {
	viewer?.value?.open(seg.imgData)
}

const transitionName = shallowRef('none')
setTimeout(() => (transitionName.value = 'fade-out-in'), 500)
</script>

<template>
	<div
		ref="rootRef"
		:class="['msg-img', pos, type, state, { 'msg-inline': seg.inline }]"
		:style="boxStyle"
	>
		<Transition :name="transitionName" mode="out-in" type="transition">
			<font-awesome-icon
				v-if="state === 'loading'"
				:icon="['fas', 'spinner']"
				spin
			/>
			<LazyLottie
				v-else-if="seg.isLottie"
				:animation-link="seg.url"
				:title="seg.summary"
			/>
			<img
				v-else-if="state === 'loaded'"
				:alt="seg.summary"
				:title="seg.summary"
				:src="src"
				:width="naturalWidth || undefined"
				:height="naturalHeight || undefined"
				@click="imgClick"
			/>
			<div v-else class="fail-load">
				<font-awesome-icon :icon="['fas', 'face-frown']" />
				{{ $t('加载图片失败') }}
				<a :href="src" target="_blank" class="link">
					{{ $t('预览图片') }}
				</a>
			</div>
		</Transition>
	</div>
</template>

<style scoped>
/* 动画铺满图片的占位盒子，避免被 LazyLottie 的 100px 最小尺寸撑成小块 */
.msg-img > .lazy-lottie {
	width: 100%;
	height: 100%;
	min-width: 0;
	min-height: 0;
}
</style>
