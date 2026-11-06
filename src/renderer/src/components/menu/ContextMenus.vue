<template>
	<Teleport to="body">
		<TransitionGroup
			name="----not-use-this----"
			@before-enter="(el) => customAnimationName('before-enter')(el)"
			@enter="(el) => customAnimationName('enter')(el)"
			@after-enter="(el) => customAnimationName('after-enter')(el)"
			@enter-cancelled="(el) => customAnimationName('cancel-enter')(el)"
			@before-leave="(el) => customAnimationName('before-leave')(el)"
			@leave="(el) => customAnimationName('leave')(el)"
			@after-leave="(el) => customAnimationName('after-leave')(el)"
			@leave-cancelled="(el) => customAnimationName('cancel-leave')(el)"
		>
			<ContextMenu
				v-for="value in contextMenus"
				:key="value.id"
				v-bind="value"
				v-model="value.compData.model"
			/>
		</TransitionGroup>
	</Teleport>
</template>
<script setup lang="ts">
import { contextMenus } from '@renderer/function/utils/contextMenu'
import ContextMenu from './ContextMenu.vue'

function getAnimationName(el: Element): string {
	const menuEl = el.children[0]
	if (!menuEl) return 'default-menu'
	const animationName = (menuEl as any).dataset.animationName
	if (!animationName) return 'default-menu'
	return animationName
}

function customAnimationName(
	state:
		| 'before-enter'
		| 'enter'
		| 'after-enter'
		| 'cancel-enter'
		| 'before-leave'
		| 'leave'
		| 'after-leave'
		| 'cancel-leave',
): (el: Element) => void {
	return (el: Element) => {
		const animationName = getAnimationName(el)
		const getName = (name: string) => {
			return `${animationName}-${name}`
		}
		switch (state) {
			case 'before-enter':
				el.classList.add(getName('enter-from'))
				break
			case 'enter':
				el.classList.remove(getName('enter-from'))
				el.classList.add(getName('enter-to'))
				el.classList.add(getName('enter-active'))
				break
			case 'after-enter':
			case 'cancel-enter':
				el.classList.remove(getName('enter-from'))
				el.classList.remove(getName('enter-to'))
				el.classList.remove(getName('enter-active'))
				break
			case 'before-leave':
				el.classList.add(getName('leave-from'))
				break
			case 'leave':
				el.classList.remove(getName('leave-from'))
				el.classList.remove(getName('leave-to'))
				el.classList.add(getName('leave-active'))
				break
			case 'after-leave':
			case 'cancel-leave':
				el.classList.remove(getName('leave-from'))
				el.classList.remove(getName('leave-to'))
				el.classList.remove(getName('leave-active'))
				break
		}
	}
}
</script>
