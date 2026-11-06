<template>
	<div v-once class="msg-json" v-if="success">
		<p>{{ data.title }}</p>
		<ElAmap :center="[data.lng, data.lat]" :zoom="15">
			<ElAmapMarker :position="[data.lng, data.lat]" />
		</ElAmap>
		<div class="bottom-bar">
			<font-awesome-icon :icon="['fas', 'map-marker-alt']" />
			<span>{{ data.name }}</span>
		</div>
	</div>
	<span v-else class="msg-unknown">{{
		'( ' + $t('加载失败') + ': ' + seg.id + ' )'
	}}</span>
</template>

<script setup lang="ts">
import { logger } from '@renderer/function/base'
import { JsonSeg } from '@renderer/function/model/seg'
import { ElAmap, ElAmapMarker } from '@vuemap/vue-amap'
import * as z from 'zod'

const { seg } = defineProps<{
	seg: JsonSeg
}>()

const map = z
	.object({
		app: z.literal('com.tencent.map'),
		meta: z.object({
			'Location.Search': z.object({
				name: z.string(),
				address: z.string(),
				lat: z.coerce.number(),
				lng: z.coerce.number(),
			}),
		}),
	})
	.transform((o) => ({
		name: o.meta['Location.Search'].name,
		title: o.meta['Location.Search'].address,
		lat: o.meta['Location.Search'].lat,
		lng: o.meta['Location.Search'].lng,
	}))

const json = JSON.parse(seg.data)
const parsedData = map.safeParse(json)
const success = parsedData.success
const data = parsedData.data!
if (!success) {
	logger.error(parsedData.error, 'Card Parse Error')
}
</script>
