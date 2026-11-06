<template>
	<div class="msg-json" v-if="success" @click="openLink(data.jumpUrl)">
		<p>{{ data.title }}</p>
		<span>{{ data.desc }}</span>
		<img :src="data.img" alt="" />
		<div class="bottom-bar">
			<img :src="data.icon" alt="" />
			<span>{{ data.name }}</span>
		</div>
	</div>
	<span v-else class="msg-unknown">{{
		'( ' + $t('加载失败') + ': ' + seg.id + ' )'
	}}</span>
</template>

<script setup lang="ts">
import { logger } from '@renderer/function/base'
import { JsonSeg } from '@renderer/function/model/seg'
import { openLink } from '@renderer/function/utils/appUtil'
import * as z from 'zod'

const { seg } = defineProps<{
	seg: JsonSeg
}>()

const music = z
	.object({
		app: z.literal('com.tencent.music.lua'),
		meta: z.object({
			music: z.object({
				title: z.string(),
				desc: z.string(),
				jumpUrl: z.string(),
				musicUrl: z.string(),
				preview: z.string(),
				tagIcon: z.string(),
				tag: z.string(),
			}),
		}),
	})
	.transform((o) => ({
		title: o.meta.music.title,
		desc: o.meta.music.desc,
		jumpUrl: o.meta.music.jumpUrl,
		musicUrl: o.meta.music.musicUrl,
		img: o.meta.music.preview,
		icon: o.meta.music.tagIcon,
		name: o.meta.music.tag,
	}))
// TODO 播放音乐
const json = JSON.parse(seg.data)
const parsedData = music.safeParse(json)
const success = parsedData.success
const data = parsedData.data!
if (!success) {
	logger.error(parsedData.error, 'Card Parse Error')
}
</script>
