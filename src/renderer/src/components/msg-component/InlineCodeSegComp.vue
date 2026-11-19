<script setup lang="ts">
import { InlineCodeSeg } from '@renderer/function/model/segs'

const { seg } = defineProps<{
	seg: InlineCodeSeg
}>()
</script>

<template>
	<code class="msg-inline-code msg-inline">{{ seg.content }}</code>
</template>
