<!--
 * @FileDescription: 新建收纳盒
 * @Author: Mr.Lee
 * @Date:
 *      2025/08/02
 * @Version:
 *      1.0 - 初始版本
-->
<template>
	<div class="config-box">
		<!-- 盒子配置 -->
		<div class="config-box-base session-body-container">
			<BoxBody :data="baseBox" :from="init ? 'new' : 'friend'" />
			<div class="color-select">
				<div :style="{ '--color': baseBox.color }" @click="setColor" />
				<div />
			</div>
			<input
				v-once
				v-auto-focus="init"
				:placeholder="$t('你也是起名困难症嘛？')"
				:value="baseBox.showName"
				type="text"
				class="box-name-input"
				@input="setName"
			/>
			<div class="icon-select">
				<font-awesome-icon
					v-for="icon in allIcons"
					:key="icon"
					:icon="['fas', icon]"
					:class="{ selected: baseBox.icon === icon }"
					@click="baseBox.icon = icon"
				/>
			</div>
		</div>
		<!-- 群组搜索与选择 -->
		<div class="box-search">
			<div>
				<input
					v-auto-focus="!init"
					v-search="searchInfo"
					:placeholder="$t('搜索 ……')"
				/>
			</div>
			<div>
				<TinySessionBody
					v-for="session in displaySession"
					:key="session.id"
					:session="session"
					:selected="selectedSession.includes(session)"
					@click="
						selectedSession.includes(session)
							? unselect(session)
							: select(session)
					"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import BoxBody from '@renderer/components/BoxBody.vue'
import TinySessionBody from '@renderer/components/TinySessionBody.vue'
import { SessionBox } from '@renderer/function/model/box'
import { Session } from '@renderer/function/model/session'
import { randomChoice, randomNum } from '@renderer/function/utils/systemUtil'
import { vAutoFocus, vSearch } from '@renderer/function/utils/vcmd'
import { computed, onUnmounted, shallowReactive, shallowRef } from 'vue'

const allIcons = [
	// 常用分组图标
	'box',
	'boxes',
	'folder',
	'folder-open',
	'archive',
	'layer-group',
	'th-large',
	'th',
	'grip-horizontal',
	'cubes',
	'cube',
	'inbox',
	'clipboard',
	'briefcase',
	'toolbox',
	'heart',
	'star',
	'bookmark',
	'tag',

	// 其他常用图标
	'home',
	'user',
	'users',
	'cog',
	'bell',
	'calendar',
	'clock',
	'envelope',
	'phone',
	'globe',
	'shield',
	'key',
	'lock',
	'unlock',
	'eye',
	'camera',
	'image',
	'file',
	'download',
	'upload',
	'cloud',
	'database',
	'server',
	'chart-bar',
	'chart-pie',
	'trophy',
	'robot',
	'yin-yang',
	'gear',
	'gears',
	'user-gear',

	// 表情图标
	'smile',
	'laugh',
	'thumbs-up',
	'fire',
	'crown',
	'gem',
	'magic',
	'wand-magic-sparkles',

	// 分类图标
	'gamepad',
	'music',
	'video',
	'book',
	'graduation-cap',
	'shopping-cart',
	'car',
	'plane',
	'bicycle',
]
// // TODO:获取所有 FontAwesome 图标
// 这得做虚拟列表...不想做,先仍这里吧...
// async function loadAllIcons() {
//     try {
//         // 从 FontAwesome 库中获取所有 solid 图标
//         const { fas } = await import('@fortawesome/free-solid-svg-icons')

//         // 提取图标名称（去掉 'fa' 前缀）
//         allIcons.value = Object.keys(fas)
//             .map(key => key.replace(/^fa/, '').replace(/([A-Z])/g, '-$1').toLowerCase().slice(1))
//             .filter(name => name.length > 0)
//             .sort()
//     } catch (error) {
//         console.error('Failed to load FontAwesome icons:', error)
//         // 备用图标列表
//         allIcons.value = [
//             'box', 'boxes', 'folder', 'folder-open', 'archive',
//             'layer-group', 'th-large', 'th', 'grip-horizontal',
//             'cubes', 'cube', 'inbox', 'clipboard', 'briefcase',
//             'toolbox', 'heart', 'star', 'bookmark', 'tag',
//             'circle', 'square', 'triangle', 'diamond', 'hexagon'
//         ]
//     }
// }
const { init = false } = defineProps<{
	init?: boolean
}>()

const baseBox = defineModel<SessionBox>({ required: true })

// 初始化新收纳盒数据
if (init) {
	baseBox.value.color = randomNum(0, 360)
	baseBox.value.icon = randomChoice(...allIcons)
}

onUnmounted(() => {
	// 保存数据
	SessionBox.saveData()
})

// 设置颜色
function setColor(event: MouseEvent | TouchEvent) {
	const target = event.target as HTMLElement
	let x: number
	const width: number = target.clientWidth
	if (event instanceof MouseEvent) {
		x = event.clientX
	} else {
		x = event.touches[0].clientX
	}
	x -= target.getBoundingClientRect().left
	baseBox.value.color = (x / width) * 360
}
const originalName = baseBox.value.showName
// 设置名称
function setName(event: Event) {
	const input = event.target as HTMLInputElement
	const value = input.value.trim()
	if (value === '') baseBox.value.name = originalName
	else baseBox.value.name = value
}

//#region == 群组选择 =========================================
const selectedSession = shallowRef<Session[]>([])
const searchInfo = shallowReactive({
	originList: shallowReactive([...Session.sessionList]),
	query: shallowReactive([]),
	isSearch: false,
})
// 初始化已选择的会话
for (const [index, session] of [...searchInfo.originList].entries()) {
	if (!session.boxes.some((item) => item.id === baseBox.value.id)) continue
	selectedSession.value.push(session)
	searchInfo.originList.splice(index, 1)
}
const refreshDisplaySession = shallowRef(0)
const displaySession = computed(() => {
	void refreshDisplaySession.value
	const headSession = selectedSession.value
	const mainSession = searchInfo.isSearch
		? searchInfo.query
		: searchInfo.originList
	return [...headSession, ...mainSession]
})
/**
 * 选择会话
 * @param session
 */
function select(session: Session) {
	// 如果已经选择了，就不再添加
	if (selectedSession.value.includes(session)) return

	// 放入到收纳盒里
	baseBox.value.putSession(session)

	// 从搜索列表中移除
	selectedSession.value.push(session)
	const index = searchInfo.originList.indexOf(session)
	if (index === -1) return
	searchInfo.originList.splice(index, 1)

	// 刷新显示列表
	refreshDisplaySession.value++
}
/**
 * 取消选择会话
 * @param session
 */
function unselect(session: Session) {
	// 如果没有选择，就不做任何操作
	if (!selectedSession.value.includes(session)) return

	// 从收纳盒中移除
	baseBox.value.removeSession(session)

	// 放回到搜索列表中
	selectedSession.value.splice(selectedSession.value.indexOf(session), 1)
	searchInfo.originList.unshift(session)

	// 刷新显示列表
	refreshDisplaySession.value++
}
//#endregion
</script>
