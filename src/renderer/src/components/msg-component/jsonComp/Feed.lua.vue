<template>
	<div class="msg-json" v-if="success" @click="openLink(data.jumpUrl ?? '')">
		<p>{{ data.title }}</p>
		<span v-if="data.desc">{{ data.desc }}</span>
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

/**
 * 解包 Qzone 风格的嵌套 URL 链接
 * @param url 原始的完整 URL 字符串
 * @returns 解码后的内部链接，如果解析失败则返回 null
 */
function unpackNestedUrl(url: string): string | null {
	try {
		const urlObj = new URL(url)

		// 1. 处理路径部分 (pathname)
		// 示例路径: /groupphoto/inqq/detail/https%3A%2F%2F...
		const pathname = urlObj.pathname

		// 寻找 "detail/" 之后的部分，这是常见的 Qzone 嵌套模式
		const detailMarker = 'detail/'
		const markerIndex = pathname.indexOf(detailMarker)

		if (markerIndex !== -1) {
			// 截取 detail/ 之后的所有内容
			const encodedPart = pathname.substring(
				markerIndex + detailMarker.length,
			)

			// 进行 URL 解码
			// 注意：decodeURIComponent 会处理 %3A, %2F, %26 等
			return decodeURIComponent(encodedPart)
		}

		return null
	} catch (error) {
		logger.error(error as Error, 'URL 解包失败')
		return null
	}
}

const feed = z
	.object({
		app: z.literal('com.tencent.feed.lua'),
		meta: z.object({
			feed: z.object({
				cover: z.string(),
				title: z.string(),
				tagIcon: z.string(),
				tagName: z.string(),
				forwardMessage: z.string().optional(),
				pcJumpUrl: z.string().optional(),
				jumpUrl: z.string().optional(),
			}),
		}),
		prompt: z.string(),
	})
	.transform((o) => ({
		title: o.meta.feed.title,
		jumpUrl: o.meta.feed.pcJumpUrl
			? (unpackNestedUrl(o.meta.feed.pcJumpUrl) ?? o.meta.feed.pcJumpUrl)
			: o.meta.feed.jumpUrl,
		img: o.meta.feed.cover,
		icon: o.meta.feed.tagIcon,
		name: o.meta.feed.tagName,
		desc: o.meta.feed.forwardMessage,
	}))
const json = JSON.parse(seg.data)
const parsedData = feed.safeParse(json)
const success = parsedData.success
const data = parsedData.data!
if (!success) {
	logger.error(parsedData.error, 'Card Parse Error')
}
</script>
