<script setup lang="ts">
import { HeadingSeg } from '@renderer/function/model/segs'
import Segs from '@renderer/components/msg-component/Segs.vue'

const emit = defineEmits<{
	imageLoaded: [height: number]
}>()

const { seg, showToMe = false } = defineProps<{
	seg: HeadingSeg
	showToMe?: boolean
}>()
</script>

<template>
	<component :is="`h${seg.level}`" class="msg-heading">
		<Segs
			:segs="seg.children"
			:show-to-me="showToMe"
			@image-loaded="(height) => emit('imageLoaded', height)"
		/>
	</component>
</template>
