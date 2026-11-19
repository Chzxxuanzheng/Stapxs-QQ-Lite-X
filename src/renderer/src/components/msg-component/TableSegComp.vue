<script setup lang="ts">
import { TableSeg } from '@renderer/function/model/segs'
import Segs from '@renderer/components/msg-component/Segs.vue'

const emit = defineEmits<{
	imageLoaded: [height: number]
}>()

const { seg, showToMe = false } = defineProps<{
	seg: TableSeg
	showToMe?: boolean
}>()
</script>

<template>
	<table class="msg-table">
		<thead>
			<tr>
				<th v-for="child of seg.head">
					<Segs
						:segs="child"
						:show-to-me="showToMe"
						@image-loaded="(height) => emit('imageLoaded', height)"
					/>
				</th>
			</tr>
		</thead>
		<tbody>
			<tr th v-for="row of seg.content">
				<td v-for="cell of row">
					<Segs
						:segs="cell"
						:show-to-me="showToMe"
						@image-loaded="(height) => emit('imageLoaded', height)"
					/>
				</td>
			</tr>
		</tbody>
	</table>
</template>
