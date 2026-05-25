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
        app: z.literal('com.tencent.miniapp_01'),
        meta: z.object({
            detail_1: z.object({
                title: z.string(),
                desc: z.string(),
                icon: z.string(),
                preview: z.string(),
                qqdocurl: z.string().optional(),
                url: z.string(),
            }),
        }),
    })
    .transform((o) => ({
        title: o.meta.detail_1.desc,
        jumpUrl: o.meta.detail_1.qqdocurl ?? `https://${o.meta.detail_1.url}`,
        img: o.meta.detail_1.preview,
        icon: o.meta.detail_1.icon,
        name: o.meta.detail_1.title,
    }))

const json = JSON.parse(seg.data)
const parsedData = miniapp.safeParse(json)
const success = parsedData.success
const data = parsedData.data!
if (!success) {
    logger.error(parsedData.error, 'Card Parse Error')
}
</script>
