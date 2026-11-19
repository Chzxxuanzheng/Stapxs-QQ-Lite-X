<script setup lang="ts">
import { ThematicBreakSeg } from '@root/src/renderer/src/function/model/segs'

const { seg: _seg } = defineProps<{
	seg: ThematicBreakSeg
}>()
</script>

<template>
	<hr class="msg-thematic-break" />
</template>
