<!--
 * @FileDescription: 右键菜单
 * @Author: Mr.Lee
 * @Date:
 *      2025/07/25
 *      2025/12/04
 * @Version:
 *      1.0 - 初始版本
 *      2.0 - 改为类似PopBox一样的结构
 * @description:
 *      右键菜单组件,允许点击无关地方关闭,支持改变动画效果,支持通过id='anchor'来确定锚点元素
-->
<template>
	<div :id="`context-menu-${id}`" ref="content" class="content">
		<component
			:is="compData.comp"
			v-bind="compData.props"
			v-model="model"
			v-on="compData.emit || {}"
			@close="controller.close"
		/>
	</div>
</template>
<script setup lang="ts">
import { useEventListener } from '@renderer/function/composable/useEventListener'
import { ContextMenuData } from '@renderer/function/utils/contextMenu'
import { onMounted, useTemplateRef } from 'vue'

//#region == 声明变量 ===============================================
const { pos, id, compData, controller } = defineProps<ContextMenuData>()

const content = useTemplateRef<HTMLElement>('content')

const model = defineModel<any>()
//#endregion

useEventListener(
	window,
	'pointerdown',
	(event) => {
		spaceClickCheck(event.target as HTMLElement)
	},
	true,
)
useEventListener(
	window,
	'contextmenu',
	(event) => {
		spaceClickCheck(event.target as HTMLElement)
	},
	true,
)
useEventListener(
	document,
	'wheel',
	(event) => {
		spaceClickCheck(event.target as HTMLElement)
	},
	true,
)

let lock = false
function spaceClickCheck(dom?: HTMLElement): void {
	if (!dom) return
	const menu = content.value
	if (!menu) return
	if (menu.contains(dom)) return
	if (lock) return
	lock = true
	controller.close('leave-outside-click')
}

onMounted(() => {
	keepCalc(true)
})

/**
 * 计算菜单位置
 * @param x 菜单x坐标
 * @param y 菜单y坐标
 * @param xa 锚点x相对坐标
 * @param ya 锚点y相对坐标
 * @param width 菜单宽度
 * @param height 菜单高度
 * @param menu 菜单元素
 */
function calcMenu(
	x: number,
	y: number,
	xa: number,
	ya: number,
	width: number,
	height: number,
	menu: HTMLElement,
): void {
	let positionX = x
	let positionY = y

	// 锚点元素
	const SPACE = 20
	const leftSpace = xa + SPACE
	const rightSpace = width - xa + SPACE
	const topSpace = ya + SPACE
	const bottomSpace = height - ya + SPACE

	// 出界处理
	// 左留白
	if (positionX < leftSpace) positionX = leftSpace
	// 右留白
	if (document.body.clientWidth - positionX < rightSpace)
		positionX = document.body.clientWidth - rightSpace
	// 上留白
	if (positionY < topSpace) positionY = topSpace
	// 下留白
	if (document.body.clientHeight - positionY < bottomSpace)
		positionY = document.body.clientHeight - bottomSpace

	// 锚点处理
	positionX = positionX - xa
	positionY = positionY - ya

	// 位置计算
	menu.style.marginLeft = positionX + 'px'
	menu.style.marginTop = positionY + 'px'
}

let cacheData = { xa: 0, ya: 0, width: 0, height: 0 }
/**
 * 持续计算菜单位置
 * @param force 跳过变动检查，强制更新
 */
function keepCalc(force: boolean = false): void {
	const menu = content.value
	if (!menu) return
	const menuRect = menu.getBoundingClientRect()
	const anchorRect = menu
		.querySelector('#anchor')
		?.getBoundingClientRect() ?? {
		x: menuRect.x,
		y: menuRect.y,
	}
	const data = {
		xa: anchorRect.x - menuRect.x,
		ya: anchorRect.y - menuRect.y,
		width: menu.clientWidth,
		height: menu.clientHeight,
	}
	if (
		force ||
		data.xa !== cacheData.xa ||
		data.ya !== cacheData.ya ||
		data.width !== cacheData.width ||
		data.height !== cacheData.height
	) {
		cacheData = data
		calcMenu(pos.x, pos.y, data.xa, data.ya, data.width, data.height, menu)
	}

	requestAnimationFrame(() => keepCalc())
}
</script>

<style scoped>
.content {
	position: absolute;
	z-index: 1000;
	top: 0;
	left: 0;
}
</style>
