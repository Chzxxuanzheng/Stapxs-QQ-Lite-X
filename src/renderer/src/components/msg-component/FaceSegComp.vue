<script setup lang="ts">
import { FaceSeg } from '@renderer/function/model/seg';
import EmojiFace from '../EmojiFace.vue';

const { seg } = defineProps<{
	seg: FaceSeg
}>()
</script>

<template>
	<EmojiFace :emoji="seg.face" class="msg-face" :class="{ 'msg-inline': seg.inline }" />
</template>