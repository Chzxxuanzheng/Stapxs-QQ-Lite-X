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
	<div :class="{ 'msg-inline': seg.inline }">
		<div>
			<div>
				<a>
					<font-awesome-icon :icon="['fas', 'file']" />
					{{
						msg?.session?.type == 'group'
							? $t('群文件')
							: $t('离线文件')
					}}
				</a>
				<p>{{ seg.name }}</p>
			</div>
			<i>{{ seg.formatSize }}</i>
		</div>
		<div>
			<font-awesome-icon
				v-if="seg.download_percent === undefined"
				:icon="['fas', 'angle-down']"
				@click="seg.download()"
			/>
			<svg
				v-else-if="
					seg.download_percent !== undefined &&
					seg.download_percent < 100
				"
				class="download-bar"
				xmlns="http://www.w3.org/2000/svg"
			>
				<circle
					cx="50%"
					cy="50%"
					r="40%"
					stroke-width="15%"
					ill="none"
					stroke-linecap="round"
				/>
				<circle
					cx="50%"
					cy="50%"
					r="40%"
					stroke-width="15%"
					fill="none"
					:stroke-dasharray="
						seg.download_percent === undefined
							? '0,10000'
							: `${(Math.floor(2 * Math.PI * 25) * seg.download_percent) / 100},10000`
					"
				/>
			</svg>
			<font-awesome-icon v-else :icon="['fas', 'check']" />
		</div>
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
	</div>
</template>
