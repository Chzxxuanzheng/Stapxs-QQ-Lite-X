<template>
	<input
		ref="input"
		v-model="model.value"
		v-auto-focus
		class="input-pop-box"
		:placeholder="placeholder"
		@keydown="keydown"
		@compositionstart="composition = true"
		@compositionend="composition = false"
	/>
</template>

<script setup lang="ts">
import { vAutoFocus } from '@renderer/function/utils/vcmd'
import { onMounted, shallowRef, useTemplateRef } from 'vue'

const input = useTemplateRef('input')
const composition = shallowRef(false)

const { placeholder = '', complete } = defineProps<{
	placeholder?: string
	complete: (value: string) => void
}>()
const model = defineModel<{ value: string }>({ required: true })
const emit = defineEmits<{
	closePopBox: []
}>()

onMounted(() => {
	input.value?.select()
})

function keydown(event: KeyboardEvent): void {
	if (composition.value) return

	if (event.key !== 'Enter') return
	if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return

	event.preventDefault()
	event.stopPropagation()
	emit('closePopBox')
	complete(model.value.value)
}
</script>
