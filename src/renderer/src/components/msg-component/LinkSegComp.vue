<script setup lang="ts">
import { LinkSeg } from '@renderer/function/model/segs'
import { openLink } from '@root/src/renderer/src/function/utils/appUtil'

const { seg } = defineProps<{
	seg: LinkSeg
}>()
</script>

<template>
	<a @click="openLink(seg.url)" class="msg-link link msg-inline">
		{{ seg.name }}
	</a>
</template>
