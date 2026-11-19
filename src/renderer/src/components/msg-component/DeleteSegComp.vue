<script setup lang="ts">
import { DeleteSeg } from '@renderer/function/model/segs'
import Segs from '@renderer/components/msg-component/Segs.vue'

const emit = defineEmits<{
	imageLoaded: [height: number]
}>()

const { seg, showToMe = false } = defineProps<{
	seg: DeleteSeg
	showToMe?: boolean
}>()
</script>

<template>
	<del class="msg-delete msg-inline">
		<Segs
			:segs="seg.children"
			:show-to-me="showToMe"
			@image-loaded="(height) => emit('imageLoaded', height)"
		/>
	</del>
</template>
