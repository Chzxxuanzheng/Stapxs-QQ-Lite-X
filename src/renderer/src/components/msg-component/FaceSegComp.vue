<script setup lang="ts">
import { FaceSeg } from '@renderer/function/model/segs'
import EmojiFace from '@renderer/components/EmojiFace.vue'

const { seg } = defineProps<{
	seg: FaceSeg
}>()
</script>

<template>
	<EmojiFace :emoji="seg.face" class="msg-face msg-inline" />
</template>
