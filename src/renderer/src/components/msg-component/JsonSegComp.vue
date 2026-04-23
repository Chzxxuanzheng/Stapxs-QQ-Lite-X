<!--
 * @FileDescription: 卡片消息消息组件
 * @Author: Stapxs
 * @Date: 2023/05/23
 *        2026/02/13
 * @Version: 1.0 - 初始版本
 *           2.0 - 重构为单独组件
-->

<template>
    <template v-if="comp">
        <component :is="comp" :seg="seg" />
    </template>
    <span v-else class="msg-unknown">{{
        '( ' + $t('不支持的卡片类型') + ': ' + seg.id + ' )'
    }}</span>
</template>

<script setup lang="ts">
import { JsonSeg } from '@renderer/function/model/seg'

const comps = import.meta.glob('./jsonComp/*.vue', {
    eager: true,
    import: 'default',
})

const cardComponentMap = {
    'com.tencent.tuwen.lua': comps['./jsonComp/Tuwen.lua.vue'],
    'com.tencent.mannounce': comps['./jsonComp/Mannounce.vue'],
    'com.tencent.miniapp.lua': comps['./jsonComp/Miniapp.lua.vue'],
    'com.tencent.miniapp_01': comps['./jsonComp/Miniapp.vue'],
    'com.tencent.music.lua': comps['./jsonComp/Music.lua.vue'],
    'com.tencent.contact.lua': comps['./jsonComp/Contact.lua.vue'],
    'com.tencent.map': comps['./jsonComp/Map.vue'],
    'com.tencent.forum': comps['./jsonComp/Forum.vue'],
    'com.tencent.autoreply': comps['./jsonComp/AutoReply.vue'],
    'com.tencent.feed.lua': comps['./jsonComp/Feed.lua.vue'],
}

const { seg } = defineProps<{
    seg: JsonSeg
}>()

const comp = cardComponentMap[seg.id]
</script>
