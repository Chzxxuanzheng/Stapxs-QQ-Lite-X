<script setup lang="ts">
import { TxtSeg } from '@renderer/function/model/seg'
import { openLink } from '@renderer/function/utils/appUtil'

const { seg } = defineProps<{
	seg: TxtSeg
}>()
</script>

<template>
	<div class="msg-text" :class="{ 'msg-inline': seg.inline }">
		<template v-for="(data, id) in seg.praseMsg" :key="id">
			<span v-if="data.type === 'txt'">{{ data.content }}</span>
			<a
				v-else
				@click="
					openLink(
						data.content.startsWith('http')
							? data.content
							: `https://${data.content}`,
					)
				"
				class="link"
			>
				{{ data.content }}
			</a>
		</template>
	</div>
</template>
