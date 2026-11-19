<script setup lang="ts">
import { EmphasisSeg } from '@renderer/function/model/segs'
import Segs from '@renderer/components/msg-component/Segs.vue'

const emit = defineEmits<{
	imageLoaded: [height: number]
}>()

const { seg, showToMe = false } = defineProps<{
	seg: EmphasisSeg
	showToMe?: boolean
}>()
</script>

<template>
	<i class="msg-emphasis">
		<Segs
			:segs="seg.children"
			:show-to-me="showToMe"
			@image-loaded="(height) => emit('imageLoaded', height)"
		/>
	</i>
</template>
