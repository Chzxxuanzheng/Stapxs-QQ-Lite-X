<script setup lang="ts">
import { MdSeg } from '@renderer/function/model/seg'
import { openLink } from '@renderer/function/utils/appUtil'
import markdownit from 'markdown-it'
import { onMounted, useTemplateRef } from 'vue'

const { seg } = defineProps<{
	seg: MdSeg
}>()

const root = useTemplateRef('root')

onMounted(() => {
	if (!root.value) return

	const md = markdownit({ breaks: true })
	const html = md.render(seg.content)
	const div = root.value

	div.innerHTML = html

	// link处理
	const links = div.getElementsByTagName('a')
	for (const link of links) {
		if (link.innerHTML === '') {
			link.remove()
			continue
		}
		const href = link.getAttribute('href')
		link.removeAttribute('href')
		if (!href) continue

		if (href.startsWith('mqqapi://')) continue

		link.onclick = () =>
			openLink(href.startsWith('http') ? href : `https://${href}`)

		link.className = 'link'
	}
})
</script>

<template>
	<div
		class="msg-md"
		v-once
		ref="root"
		:class="{ 'msg-inline': seg.inline }"
	/>
</template>
