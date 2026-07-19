<template>
    <div class="msg-json" v-if="success" @click="open(data.jumpUrl)">
        <p>{{ data.title }}</p>
        <span v-if="data.type === 'group'">{{ data.desc }}</span>
        <img :src="data.img" alt="" />
        <div class="bottom-bar">
            <font-awesome-icon
                v-if="data.type === 'group'"
                :icon="['fas', 'users']"
            />
            <font-awesome-icon v-else :icon="['fas', 'user']" />
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

function open(url: string) {
    if (!url.startsWith('http')) return
    openLink(url)
}

const friend = z
    .object({
        app: z.literal('com.tencent.contact.lua'),
        meta: z.object({
            contact: z.object({
                avatar: z.string(),
                nickname: z.string(),
                contact: z.string(),
                jumpUrl: z.string(),
                tag: z.literal('推荐好友'),
            }),
        }),
    })
    .transform((o) => ({
        type: 'user' as const,
        img: o.meta.contact.avatar,
        title: o.meta.contact.nickname,
        jumpUrl: o.meta.contact.jumpUrl,
        name: o.meta.contact.tag,
    }))

const group = z
    .object({
        app: z.literal('com.tencent.contact.lua'),
        meta: z.object({
            contact: z.object({
                avatar: z.string().transform((s) => s.replace('/100', '/')),
                nickname: z.string(),
                contact: z.string().transform((s) => `${s}…`),
                jumpUrl: z.string(),
                tag: z.literal('群名片'),
            }),
        }),
    })
    .transform((o) => ({
        type: 'group' as const,
        img: o.meta.contact.avatar,
        title: o.meta.contact.nickname,
        desc: o.meta.contact.contact,
        jumpUrl: o.meta.contact.jumpUrl,
        name: o.meta.contact.tag,
    }))

const bot = z
    .object({
        app: z.literal('com.tencent.contact.lua'),
        meta: z.object({
            contact: z.object({
                avatar: z.string(),
                nickname: z.string(),
                contact: z.string(),
                jumpUrl: z.string(),
                tag: z.literal('机器人名片'),
            }),
        }),
    })
    .transform((o) => ({
        type: 'bot' as const,
        img: o.meta.contact.avatar,
        title: o.meta.contact.nickname,
        desc: o.meta.contact.contact,
        jumpUrl: o.meta.contact.jumpUrl,
        name: o.meta.contact.tag,
    }))

const pd = z
    .object({
        app: z.literal('com.tencent.contact.lua'),
        meta: z.object({
            contact: z.object({
                avatar: z.string(),
                nickname: z.string(),
                contact: z.string(),
                jumpUrl: z.string(),
                tag: z.literal('频道名片'),
            }),
        }),
    })
    .transform((o) => ({
        type: 'bot' as const,
        img: o.meta.contact.avatar,
        title: o.meta.contact.nickname,
        desc: o.meta.contact.contact,
        jumpUrl: o.meta.contact.jumpUrl,
        name: o.meta.contact.tag,
    }))

const contact = z.union([friend, group, bot, pd])

const json = JSON.parse(seg.data)
const parsedData = contact.safeParse(json)
const success = parsedData.success
const data = parsedData.data!
if (!success) {
    logger.error(parsedData.error, 'Card Parse Error')
}
</script>
