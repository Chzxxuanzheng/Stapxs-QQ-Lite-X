<script setup lang="ts">
import { StrongSeg } from '@renderer/function/model/segs'
import Segs from '@renderer/components/msg-component/Segs.vue'

const emit = defineEmits<{
	imageLoaded: [height: number]
}>()

const { seg, showToMe = false } = defineProps<{
	seg: StrongSeg
	showToMe?: boolean
}>()
</script>

<template>
	<strong class="msg-strong msg-inline">
		<Segs
			:segs="seg.children"
			:show-to-me="showToMe"
			@image-loaded="(height) => emit('imageLoaded', height)"
		/>
	</strong>
</template>
