<script setup lang="ts">
import { useCurrentMsg } from '@renderer/function/composable/inject/useCurrentMsg'
import { FileSeg } from '@renderer/function/model/seg'

const IMAGE_SUFFIX = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']

const VIDEO_SUFFIX = ['mp4', 'avi', 'mkv', 'flv']

const TXT_SUFFIX = ['txt', 'md']

const { seg } = defineProps<{
	seg: FileSeg
}>()

const msg = useCurrentMsg()

/**
 * 下载 txt 文件并获取文件内容
 * @param url 链接
 */
function getTxtUrl(view: any) {
	const url = view.url
	// 保存文件为 Blob
	fetch(url)
		.then((r) => r.blob())
		.then((blob) => {
			// 读取文件内容并返回文本
			const reader = new FileReader()
			reader.readAsText(blob, 'utf-8')
			reader.onload = function () {
				// 只取前 300 字，超出部分加上 ……
				const txt = reader.result as string
				view.txt = txt.length > 300 ? txt.slice(0, 300) + '…' : txt
			}
		})
}
</script>

<template>
	<section :class="{ 'msg-inline': seg.inline }" class="msg-file">
		<div>
			<header>
				<font-awesome-icon :icon="['fas', 'file']" />
				{{
					msg?.session?.type == 'group'
						? $t('群文件')
						: $t('离线文件')
				}}
			</header>
			<span>{{ seg.name }}</span>
			<footer>{{ seg.formatSize }}</footer>
		</div>
		<button @click="seg.download" target="_blank">
			<font-awesome-icon :icon="['fas', 'angle-down']" />
		</button>
		<div v-if="seg.fileView" class="file-view">
			<img
				v-if="IMAGE_SUFFIX.includes(seg.fileView.ext)"
				:alt="seg.name"
				:src="seg.fileView.url"
			/>
			<video
				v-else-if="VIDEO_SUFFIX.includes(seg.fileView.ext)"
				playsinline
				controls
				muted
				autoplay
			>
				<source
					:src="seg.fileView.url"
					:type="'video/' + seg.fileView.ext"
				/>
				现在还有不支持 video tag 的浏览器吗？
			</video>
			<span
				v-else-if="
					TXT_SUFFIX.includes(seg.fileView.ext) && seg?.size < 2000000
				"
				class="txt"
			>
				<a>{{ seg.name }} - {{ $t('文件预览') }}</a>
				{{ getTxtUrl(seg.fileView) }}{{ seg.fileView.txt }}
			</span>
		</div>
	</section>
</template>
