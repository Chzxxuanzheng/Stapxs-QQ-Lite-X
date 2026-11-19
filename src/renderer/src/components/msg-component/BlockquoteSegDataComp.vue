<script setup lang="ts">
import { BlockquoteSeg } from '@renderer/function/model/segs'
import Segs from '@renderer/components/msg-component/Segs.vue'

const emit = defineEmits<{
	imageLoaded: [height: number]
}>()

const { seg, showToMe = false } = defineProps<{
	seg: BlockquoteSeg
	showToMe?: boolean
}>()
</script>

<template>
	<blockquote class="msg-blockquote">
		<Segs
			:segs="seg.children"
			:show-to-me="showToMe"
			@image-loaded="(height) => emit('imageLoaded', height)"
		/>
	</blockquote>
</template>
