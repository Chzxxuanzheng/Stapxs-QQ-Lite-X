<template>
	<div class="msg-json" v-if="success">
		<p>{{ data.title }}</p>
		<span>{{ data.content }}</span>
		<img v-if="data.img" :src="data.img.url" alt="" @click="viewImg()" />
		<div class="bottom-bar">
			<font-awesome-icon :icon="['fas', 'bullhorn']" />
			<span>{{ $t('群公告') }}</span>
		</div>
	</div>
	<span v-else class="msg-unknown">{{
		'( ' + $t('加载失败') + ': ' + seg.id + ' )'
	}}</span>
</template>

<script setup lang="ts">
import { logger } from '@renderer/function/base'
import { useViewer } from '@renderer/function/composable/inject/useViewer'
import { Img } from '@renderer/function/model/img'
import { JsonSeg } from '@renderer/function/model/seg'
import * as z from 'zod'

const { seg } = defineProps<{
	seg: JsonSeg
}>()

const viewer = useViewer()

const base64Code = z.base64().transform((str) => {
	const binary = atob(str)
	const bytes = Uint8Array.from(binary, (ch) => ch.codePointAt(0)!)
	return new TextDecoder().decode(bytes)
})

const mannounce = z
	.object({
		app: z.literal('com.tencent.mannounce'),
		meta: z.object({
			mannounce: z.object({
				title: base64Code,
				text: base64Code,
				pic: z.optional(
					z.array(
						z.object({
							url: z.string(),
							width: z.number(),
							height: z.number(),
						}),
					),
				),
			}),
		}),
	})
	.transform((o) => {
		const out: {
			title: string
			content: string
			img?: {
				url: string
				width: number
				height: number
			}
		} = {
			title: o.meta.mannounce.title,
			content: o.meta.mannounce.text,
		}
		if (o.meta.mannounce.pic?.length === 1) {
			out['img'] = {
				url: `https://gdynamic.qpic.cn/gdynamic/${o.meta.mannounce.pic[0].url}/0`,
				width: o.meta.mannounce.pic[0].width,
				height: o.meta.mannounce.pic[0].height,
			}
		}
		return out
	})

const json = JSON.parse(seg.data)
const parsedData = mannounce.safeParse(json)
const success = parsedData.success
const data = parsedData.data!

if (!success) {
	logger.error(parsedData.error, 'Card Parse Error')
}

function viewImg(): void {
	viewer?.value?.open(new Img(data.img!.url))
}
</script>
