<template>
	<svg ref="svg" :viewBox="`0 0 ${width + 30} 20`" style="--color: red">
		<defs>
			<mask id="circle-mask">
				<rect width="100%" height="100%" fill="white" />
				<circle cx="10" cy="10" r="6" fill="black" />
			</mask>
		</defs>
		<rect
			x="0"
			y="0"
			width="100%"
			height="20"
			rx="10"
			ry="10"
			fill="var(--color)"
			mask="url(#circle-mask)"
		/>
		<text x="20" y="14" font-size="12" fill="white" font-family="inherit">
			<slot />
		</text>
	</svg>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef, shallowRef } from 'vue'

const width = shallowRef<number>(500)
const svg = useTemplateRef('svg')

onMounted(() => {
	const text = svg.value!.querySelector('text')
	const textWidth = text!.getBBox().width
	width.value = textWidth
})
</script>
