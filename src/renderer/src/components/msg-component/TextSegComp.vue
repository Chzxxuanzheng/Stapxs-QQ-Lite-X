<script setup lang="ts">
import { TextSeg } from '@renderer/function/model/segs'

const { seg } = defineProps<{
	seg: TextSeg
}>()
</script>

<template>
	<span class="msg-text msg-inline">{{ seg.text }}</span>
</template>
