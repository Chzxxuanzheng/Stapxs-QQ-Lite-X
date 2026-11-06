<script setup lang="ts">
import { MdSeg } from '@renderer/function/model/seg'
import { openLink } from '@renderer/function/utils/appUtil'
import markdownit from 'markdown-it'
import { onMounted, useTemplateRef } from 'vue';

const { seg } = defineProps<{
	seg: MdSeg
}>()

const root = useTemplateRef('root')

onMounted(() => {
	if (!root.value) return

	const md = markdownit({ breaks: true })
	const html = md.render(seg.content)
	const div = document.createElement('div')
	div.innerHTML = html
	// 二次处理 img；img 拥有这样的 alt：cornerRadius=100 #48px #48px
	const imgs = div.getElementsByTagName('img')
	for (const img of imgs) {
		const alt = img.getAttribute('alt')
		if (alt) {
			const size = alt.split('#')
			if (size.length == 3) {
				img.style.width = size[1]
				img.style.height = size[2]
			}
		}
	}
	// 二次处理 a；去除 href
	const links = div.getElementsByTagName('a')
	for (const link of links) {
		const href = link.getAttribute('href')
		if (href) {
			link.dataset.link = href
			link.setAttribute('href', '')
			link.onclick = (e) => {
				e.preventDefault()
				openLink(href)
			}
		}
	}

	root.value.appendChild(div)
})
</script>

<template>
	<div class="msg-md" v-once ref="root" :class="{ 'msg-inline': seg.inline }" />
</template>