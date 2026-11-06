<!--
 * @FileDescription: 标签页组件（来自小林的buci ）
 * @Date:
 *      2026/02/06
 * @Version:
 *      1.0 - 从原 bc-tab 组件移植，保持原有 DOM 结构与类名
-->

<template>
	<div class="tab-main">
		<div class="ss-card">
			<div class="body">
				<ul v-if="items.length > 0" class="tab-bar">
					<span v-if="title">{{ title }}</span>
					<TransitionGroup name="tabar">
						<li
							v-for="(item, index) in items"
							:key="'tab-' + tabId + '-' + index"
							:class="selectIndex === index ? 'select' : ''"
							@click="tabSelect(index)"
						>
							<font-awesome-icon
								v-if="item.icon"
								:icon="item.icon"
							/>
							<span v-else>{{ item.name }}</span>
							<div
								v-if="index === items.length - 1"
								:style="getTabLineStyle(index)"
							/>
						</li>
					</TransitionGroup>
				</ul>
			</div>
		</div>
		<div :id="'bc-tab-' + tabId" ref="bodyRef" class="tab-body">
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { VNode } from 'vue'
import { computed, nextTick, onMounted, shallowRef, useSlots, watch } from 'vue'

interface TabItem {
	name?: string
	icon?: string
}

defineProps<{
	title?: string
}>()

const emit = defineEmits<{
	selected: [index: number]
}>()

const slots = useSlots()

// 生成一个随机数作为 id（与原实现一致，用于 tab-body 的 id）
const tabId = Math.random().toString(36).substring(2)
const selectIndex = shallowRef(0)
const bodyRef = shallowRef<HTMLElement | null>(null)
// 内容区里参与切换的子项数量，用于在子项增删时重新应用选中态
const contentCount = shallowRef(0)

/**
 * 从默认插槽的 VNode 中读取 name / icon 生成标签栏条目
 * （与原 bc-tab 行为一致；没有 name 也没有 icon 的子项不参与标签栏）
 */
const items = computed<TabItem[]>(() => {
	const nodes = (slots.default?.() ?? []) as VNode[]
	const list: TabItem[] = []
	for (const node of nodes) {
		const nodeProps = node.props as Record<string, unknown> | null
		if (!nodeProps) continue
		const name = nodeProps.name
		const icon = nodeProps.icon
		if (typeof name !== 'string' && typeof icon !== 'string') continue
		list.push({
			name: typeof name === 'string' ? name : undefined,
			icon: typeof icon === 'string' ? icon : undefined,
		})
	}
	return list
})

/**
 * 只处理内容区里带 name / icon 属性的 div，按出现顺序与标签栏一一对应
 */
function contentElements(): HTMLElement[] {
	const body = bodyRef.value
	if (!body) return []
	const elements: HTMLElement[] = []
	for (const child of Array.from(body.children)) {
		if (child.nodeName !== 'DIV') continue
		if (!child.hasAttribute('name') && !child.hasAttribute('icon')) continue
		elements.push(child as HTMLElement)
	}
	return elements
}

/**
 * 按选中项显示 / 隐藏内容区内的子项
 */
function syncContent() {
	const elements = contentElements()
	contentCount.value = elements.length
	const active =
		selectIndex.value >= 0 && selectIndex.value < elements.length
			? selectIndex.value
			: 0
	elements.forEach((el, index) => {
		if (index === active) {
			el.style.display = 'block'
			// 切换时把内容区滚动回顶部（与原实现一致）
			setTimeout(() => {
				el.scrollTo(0, 0)
			}, 100)
		} else {
			el.style.display = 'none'
		}
	})
}

function tabSelect(index: number) {
	selectIndex.value = index
	nextTick(syncContent)
	emit('selected', index)
}

/**
 * 标签下划线指示器：只有最后一项带下划线，通过位移移动到选中项
 * 位移量依赖 --bc-tab-margin，未定义时按原组件默认值 20px 兜底
 */
function getTabLineStyle(maxIndex: number) {
	const x = maxIndex - selectIndex.value
	return `transform: translateX(calc(-${x}00% - (var(--bc-tab-margin, 20px) * 2 + 10px) * ${x}))`
}

onMounted(() => {
	tabSelect(0)
})

// 内容子项有变更（增加或减少）时重新应用选中状态，
// 避免出现没有被隐藏的内容 DIV（注意这里不读插槽，避免在渲染上下文外调用槽函数）
watch(contentCount, () => {
	nextTick(syncContent)
})
</script>

<style scoped>
.tabar-move,
.tabar-enter-active,
.tabar-leave-active {
	transition:
		transform 0.3s,
		opacity 0.1s;
}
.tabar-enter-from,
.tabar-leave-to {
	transform: translateX(10px);
	opacity: 0;
}
.tabar-leave-active {
	position: absolute;
	right: 0;
}

/*
 * 原 bc-tab 内部用 bcui 的 ss-card 组件包裹标签栏，其卡片 body 的内边距与卡片
 * margin 没有被 public/bcui/css/style.css 的全局 .ss-card 规则覆盖，这里补回来。
 * 背景、圆角、padding 等仍由全局 .ss-card 样式提供，避免重复定义冲突。
 */
.tab-main > .ss-card {
	margin: 5px;
}
.tab-main > .ss-card > .body {
	padding: 0 10px;
}

.tab-main > div:first-child {
	margin-bottom: 10px;
}

/*
 * 注意：这里不声明 --bc-tab-margin 的默认值，只在使用处用 var(--bc-tab-margin, 20px) 兜底。
 * 原 bc-tab 在 .tab-bar 上声明了 --bc-tab-margin: 20px，它会与
 * .face-pan .tab-bar / .opt-tab .tab-bar / .chat-info-tab .tab-bar 中的定制值
 * 因样式注入顺序而产生不确定的覆盖，所以改为仅兜底，让项目 CSS 的定义始终优先。
 */
.tab-bar {
	margin: -17px -20px -17px -40px;
	justify-content: center;
	align-items: center;
	position: relative;
	display: flex;
}
.tab-bar > span {
	font-weight: bold;
	flex: 1;
}
.tab-bar > li {
	margin: 0 var(--bc-tab-margin, 20px);
	justify-content: center;
	flex-direction: column;
	list-style-type: none;
	align-items: center;
	border-radius: 3px;
	min-width: 30px;
	cursor: pointer;
	padding: 10px;
	display: flex;
}
.tab-bar > li span,
.tab-bar > li svg {
	color: var(--color-font);
	transition: color 0.3s;
	font-size: 0.9rem;
}

.tab-bar > li > div {
	width: calc(100% + 10px);
	margin-bottom: -10px;
	transition: all 0.35s;
	border-radius: 7px;
	margin-top: 6px;
	height: 3px;
}
.tab-bar > li:last-child > div {
	background: var(--color-main);
}
.tab-bar > li.select span,
.tab-bar > li.select svg {
	color: var(--color-main);
}
</style>
