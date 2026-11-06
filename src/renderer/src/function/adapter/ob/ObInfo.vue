<template>
	<div v-if="status != 'unknown'" :class="'bot-status ' + status">
		<div />
		<span>{{
			$t('连接_' + status, {
				step: adapter.heartBeatInfo.expectInterval,
				timeout: adapter.heartBeatInfo.interval,
			})
		}}</span>
	</div>
	<div class="bot-info">
		<div
			v-for="[key, value] in Object.entries(adapterInfo)"
			:key="'botinfo-' + key"
		>
			<span>
				<span>{{ key + ': ' }}</span>
				<span>
					{{ value }}
				</span>
			</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import useRuntimeData from '@renderer/state/runtimeData'
import { OneBotAdapter } from './adapter'
import { computed, markRaw } from 'vue'
const runtimeData = useRuntimeData()
const adapter = computed<OneBotAdapter>(() =>
	markRaw(runtimeData.nowAdapter as OneBotAdapter),
)
const status = computed<'normal' | 'slow' | 'unknown'>(() => {
	if (adapter.value.heartBeatInfo.interval === -1) return 'unknown'
	if (
		adapter.value.heartBeatInfo.interval >
		adapter.value.heartBeatInfo.expectInterval
	)
		return 'slow'
	return 'normal'
})
const adapterInfo = computed(() => {
	return adapter.value.selfInfo
})
</script>
