<script setup lang="ts">
import { ButtonSeg } from '@root/src/renderer/src/function/model/segs/buttonSeg'

const { seg } = defineProps<{
	seg: ButtonSeg
}>()
</script>

<template>
	<button class="msg-button msg-inline" @click="seg.click()">
		{{ seg.name }}
	</button>
</template>
