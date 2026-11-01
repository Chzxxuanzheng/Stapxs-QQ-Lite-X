<script setup lang="ts">
import { VideoSeg } from '@renderer/function/model/seg';

const { seg } = defineProps<{
    seg: VideoSeg
}>()

const timeoutMs = 10_000

let refreshButStillFailed = false

async function canLoaded(): Promise<boolean> {
	return new Promise((resolve, reject) => {
		const v = document.createElement('video')
		v.preload = 'auto'
		v.muted = true

		let settled = false
		const finish = (fn: () => void) => {
			if (settled) return
			settled = true
			clearTimeout(timer)
			v.onloadedmetadata = v.onloadeddata = v.onerror = null
			v.removeAttribute('src')
			v.load() // 中止请求、释放解码器
			fn()
		}
		const timer = setTimeout(
			() => finish(() => resolve(false)),
			timeoutMs,
		)

		v.onloadeddata = () => {
			finish(() => resolve(true))
		}
		v.onerror = () => {
			const err = v.error // 同理，cleanup 后可能变 null
			finish(() => reject(err ?? new Error('video load failed')))
		}

		v.src = seg.url
		v.load()
	})

}

let refreshLock = false

async function refreshResource() {
	if (refreshButStillFailed) return

	if (refreshLock) return
	refreshLock = true

	await seg.refreshResource()

	refreshButStillFailed = await canLoaded()
	refreshLock = false
}
</script>

<template>
	<div class="msg-video">
		<video playsinline controls muted autoplay @error="refreshResource">
			<source :src="seg.url" type="video/mp4" />
			现在还有不支持 video tag 的浏览器吗？
		</video>
	</div>
</template>	