<!--
 * @FileDescription: 收纳盒列表
 * @Author: Mr.Lee
 * @Date:
 *      2025/08/02
 * @Version:
 *      1.0 - 初始版本
-->
<template>
	<div>
		<div style="margin-top: 15px" />
		<header v-show="sideBarState === 'open'" class="side-bar-header">
			<div class="base only">
				<span>{{ $t('收纳盒') }}</span>
				<div style="flex: 1" />
				<font-awesome-icon :icon="['fas', 'fa-plus']" @click="newBox" />
			</div>
			<label>
				<input
					v-auto-focus
					v-search="searchInfo"
					type="text"
					:placeholder="$t('搜索 ……')"
				/>
				<font-awesome-icon :icon="['fas', 'magnifying-glass']" />
			</label>
		</header>
		<div class="side-bar-list session-body-container">
			<template v-if="!searchInfo.isSearch">
				<BoxBody
					:data="BubbleBox.instance"
					from="friend"
					@user-click="
						(session) => changeSession(session, BubbleBox.instance)
					"
				/>
				<BoxBody
					v-for="box in SessionBox.sessionBoxes"
					:key="box.id"
					v-menu.prevent="
						(event) =>
							openFriendMenu(
								event.x,
								event.y,
								'friend',
								undefined,
								box,
							)
					"
					:data="box"
					from="friend"
					@user-click="(session) => changeSession(session, box)"
				/>
			</template>
			<!-- 搜索用的 -->
			<template v-else>
				<BoxBody
					v-for="box in searchInfo.query"
					:key="box.id"
					:data="box"
					from="friend"
				/>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import BoxBody from '@renderer/components/BoxBody.vue'

import { BubbleBox, SessionBox } from '@renderer/function/model/box'
import { openFriendMenu } from '@renderer/function/utils/contextMenu'
import { changeSession } from '@renderer/function/utils/msgUtil'
import { popBox } from '@renderer/function/utils/popBox'
import { vAutoFocus, vMenu, vSearch } from '@renderer/function/utils/vcmd'
import { i18n } from '@renderer/main'
import ConfigBox from '@renderer/components/popBox/ConfigBox.vue'
import { markRaw, shallowReactive } from 'vue'

const $t = i18n.global.t

const { sideBarState } = defineProps<{
	sideBarState: 'fold' | 'open'
}>()

const searchInfo = shallowReactive({
	originList: SessionBox.sessionBoxes,
	query: shallowReactive([] as SessionBox[]),
	isSearch: false,
})
/**
 * 创建一个新的收纳盒
 */
function newBox() {
	// 参数接下来的组件会自动补全，这里填空就行了
	const box = new SessionBox($t('新收纳盒'), '', 0)
	popBox({
		title: $t('新建收纳盒'),
		comp: ConfigBox,
		props: { init: true },
		model: markRaw(box),
		button: [
			{
				text: $t('取消'),
			},
			{
				text: $t('确定'),
				master: true,
				fun: () => {
					SessionBox.addBox(box)
					// 更新群组->收纳盒映射
					SessionBox.saveData()
				},
			},
		],
	})
}
</script>
