<script setup lang="ts">
import { BreakSeg } from '@root/src/renderer/src/function/model/segs'

const { seg: _seg } = defineProps<{
	seg: BreakSeg
}>()
</script>

<template>
	<br class="msg-break msg-inline" />
</template>
