<!--
 * @FileDescription: 用于会话选择要放入的收纳盒
 * @Author: Mr.Lee
 * @Date:
 *      2025/08/03
 * @Version:
 *      1.0 - 初始版本
-->
<template>
	<div>
		<input
			v-auto-focus
			v-search="searchInfo"
			class="ss-input"
			:placeholder="$t('搜索 ……')"
		/>
	</div>
	<div>
		<TinySessionBody
			v-for="box in displayBox"
			:key="box.id"
			:session="box"
			:selected="selected.includes(box)"
			@click="switchSelected(box)"
		/>
	</div>
</template>

<script setup lang="ts">
import { SessionBox } from '@renderer/function/model/box'
import { Session } from '@renderer/function/model/session'
import { shallowRef, shallowReactive, computed, onUnmounted } from 'vue'
import { vAutoFocus, vSearch } from '@renderer/function/utils/vcmd'
import TinySessionBody from '@renderer/components/TinySessionBody.vue'

const { session } = defineProps<{
	session: Session
}>()

const selected = shallowRef<SessionBox[]>([])
const searchInfo = shallowReactive({
	originList: shallowReactive<SessionBox[]>([]),
	query: shallowReactive([]),
	isSearch: false,
})

// 保存数据
onUnmounted(() => {
	SessionBox.saveData()
})

// 初始化选择和未选择的盒子
for (const box of SessionBox.sessionBoxes) {
	if (session.boxes.includes(box)) selected.value.push(box)
	else searchInfo.originList.push(box)
}
const refreshDisplayBox = shallowRef(0)
const displayBox = computed(() => {
	void refreshDisplayBox.value
	const head = selected.value
	const main = searchInfo.isSearch ? searchInfo.query : searchInfo.originList
	return [...head, ...main]
})

function switchSelected(box: SessionBox) {
	const selectedPos = selected.value.indexOf(box)
	if (selectedPos > -1) {
		selected.value.splice(selectedPos, 1)
		searchInfo.originList.unshift(box)
		box.removeSession(session)
	} else {
		selected.value.push(box)
		const originPos = searchInfo.originList.indexOf(box)
		if (originPos > -1) searchInfo.originList.splice(originPos, 1)
		box.putSession(session)
	}
	refreshDisplayBox.value++
}
</script>
