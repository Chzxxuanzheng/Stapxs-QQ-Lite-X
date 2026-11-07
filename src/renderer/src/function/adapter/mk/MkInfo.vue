<template>
	<div v-if="status.delay" :class="'bot-status ' + status.delayType">
		<div />
		<span>{{ $t('延迟') + ': ' + status.delay }}</span>
	</div>
	<div v-if="status.info" class="bot-info">
		<div>
			<span>
				<span>{{ $t('Milky版本') + ': ' }}</span>
				<span>
					{{ status.info.milky_version }}
				</span>
			</span>
			<span>
				<span>{{ $t('协议端名称') + ': ' }}</span>
				<span>
					{{ status.info.impl_name }}
				</span>
			</span>
			<span>
				<span>{{ $t('协议端版本') + ': ' }}</span>
				<span>
					{{ status.info.impl_version }}
				</span>
			</span>
			<span>
				<span>{{ $t('ntqq协议') + ': ' }}</span>
				<span>
					{{ status.info.qq_protocol_version }}
				</span>
			</span>
			<span>
				<span>{{ $t('ntqq类型') + ': ' }}</span>
				<span>
					{{ status.info.qq_protocol_type.replace('_', ' ') }}
				</span>
			</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import useRuntimeData from '@renderer/state/runtimeData'
import { type MilkyAdapter } from '@renderer/function/adapter/mk/adapter'
import { computed, markRaw, shallowReactive } from 'vue'
import type { GetImplInfoOutput } from '@renderer/function/adapter/mk/types'
import { useInterval } from '@renderer/function/composable/useInterval'

const runtimeData = useRuntimeData()
const adapter = computed<MilkyAdapter>(() =>
	markRaw(runtimeData.nowAdapter as MilkyAdapter),
)
const status = shallowReactive<{
	delay?: string
	delayType: string
	info?: GetImplInfoOutput
}>({
	delay: undefined,
	delayType: 'normal',
	info: undefined,
})
useInterval(() => {
	const main = async () => {
		const now = Date.now()
		const data = await adapter.value.getImplInfoRaw()
		const delay = Date.now() - now
		if (delay > 5000) return
		status.delay = delay + 'ms'
		if (delay > 200) status.delayType = 'slow'
		else status.delayType = 'normal'
		status.info = data
	}
	const timeout = setTimeout(() => {
		status.delay = '超时'
	}, 4999)
	main().then(() => clearTimeout(timeout))
}, 5000)
</script>
