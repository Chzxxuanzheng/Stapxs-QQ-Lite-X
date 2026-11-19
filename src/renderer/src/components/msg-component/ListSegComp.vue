<script setup lang="ts">
import { ListSeg } from '@renderer/function/model/segs'
import Segs from '@renderer/components/msg-component/Segs.vue'

const emit = defineEmits<{
	imageLoaded: [height: number]
}>()

const { seg, showToMe = false } = defineProps<{
	seg: ListSeg
	showToMe?: boolean
}>()

const listTag = seg.ordered ? 'ol' : 'ul'
</script>

<template>
	<component :is="listTag" class="msg-list">
		<li v-for="child of seg.children">
			<Segs
				:segs="child"
				:show-to-me="showToMe"
				@image-loaded="(height) => emit('imageLoaded', height)"
			/>
		</li>
	</component>
</template>
