<template>
    <div class="msg-json" v-if="success" @click="openLink(data.jumpUrl)">
        <p>{{ data.title }}</p>
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

const feed = z
    .object({
        app: z.literal('com.tencent.plaintext.lua'),
        meta: z.object({
            feed: z.object({
                content: z.string(),
                tagIcon: z.string(),
                tagName: z.string(),
                jumpUrl: z.string(),
            }),
        }),
        prompt: z.string(),
    })
    .transform((o) => ({
        title: o.meta.feed.content,
        jumpUrl: o.meta.feed.jumpUrl,
        icon: o.meta.feed.tagIcon,
        name: o.meta.feed.tagName,
    }))
const json = JSON.parse(seg.data)
const parsedData = feed.safeParse(json)
const success = parsedData.success
const data = parsedData.data!
if (!success) {
    logger.error(parsedData.error, 'Card Parse Error')
}
</script>
