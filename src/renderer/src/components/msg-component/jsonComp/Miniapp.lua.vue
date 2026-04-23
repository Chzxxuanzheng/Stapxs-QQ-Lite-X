<template>
    <div class="msg-json" v-if="success" @click="openLink(data.jumpUrl)">
        <p>{{ data.title }}</p>
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

const miniapp = z
    .object({
        app: z.literal('com.tencent.miniapp.lua'),
        meta: z.object({
            miniapp: z.object({
                title: z.string(),
                source: z.string(),
                sourcelogo: z.url(),
                preview: z.string(),
                jumpUrl: z.url(),
            }),
        }),
    })
    .transform((o) => ({
        title: o.meta.miniapp.title,
        jumpUrl: o.meta.miniapp.jumpUrl,
        img: o.meta.miniapp.preview,
        icon: o.meta.miniapp.sourcelogo,
        name: o.meta.miniapp.source,
    }))

const json = JSON.parse(seg.data)
const parsedData = miniapp.safeParse(json)
const success = parsedData.success
const data = parsedData.data!
if (!success) {
    logger.error(parsedData.error, 'Card Parse Error')
}
</script>
