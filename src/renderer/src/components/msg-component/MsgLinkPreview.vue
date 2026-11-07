<script setup lang="ts">
import { LinkInfo } from '@renderer/function/utils/linkViewUtil'
import Og from '@renderer/components/msg-component/msgLinkPreviewComp/Og.vue'
import Bilibili from '@renderer/components/msg-component/msgLinkPreviewComp/Bilibili.vue'
import Music163 from '@renderer/components/msg-component/msgLinkPreviewComp/Music163.vue'

const { info } = defineProps<{
	info: LinkInfo
}>()
</script>

<template>
	<Og v-if="info.type == 'og'" :info="info" />
	<Bilibili v-else-if="info.type == 'bilibili'" :info="info" />
	<Music163 v-else-if="info.type == 'music163'" :info="info" />
</template>
