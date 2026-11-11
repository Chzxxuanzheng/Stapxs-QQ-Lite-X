<script setup lang="ts">
import { computed } from 'vue'

const {
	max = 100,
	min = 0,
	step = 1,
	format = '{value}',
} = defineProps<{
	max?: number
	min?: number
	step?: number
	format?: string
}>()
const data = defineModel<number>()

const inputValue = computed({
	get() {
		return data.value ?? 0
	},
	set(value: string) {
		data.value = +value
	},
})
const percent = computed(() => ((inputValue.value - min) / (max - min)) * 100)

function formatData() {
	return format.replace('{value}', (data.value ?? 0).toString())
}
</script>

<template>
	<div class="opt-range">
		<input
			v-model="inputValue"
			:style="`background-size: ${percent}% 100%;`"
			type="range"
			:max="max"
			:min="min"
			:step="step"
		/>
		<span :style="`color: var(--color-font${percent > 50 ? '-r' : ''})`">
			{{ formatData() }}
		</span>
	</div>
</template>
