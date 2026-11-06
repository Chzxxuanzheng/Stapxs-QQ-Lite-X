<!--
 * @FileDescription: 联系人列表页面
 * @Author: Stapxs
 * @Date:
 *      2022/08/14
 *      2022/12/12
 *      2025/07/27
 * @Version:
 *      1.0 - 初始版本
 *      1.5 - 重构为 ts 版本，代码格式优化
 *      2.0 - 将会话重构为类+setup式API（Mr.Lee）
-->

<template>
	<div>
		<div style="margin-top: 15px" />
		<header v-show="sideBarState === 'open'" class="side-bar-header">
			<div class="base">
				<span>{{ $t('联系人') }}</span>
				<div style="flex: 1" />
				<font-awesome-icon
					:icon="['fas', 'rotate-right']"
					@click="reloadUsers(false)"
				/>
			</div>
			<label>
				<input
					v-search="searchInfo"
					v-auto-focus
					type="text"
					:placeholder="$t('搜索 ……')"
				/>
				<font-awesome-icon :icon="['fas', 'magnifying-glass']" />
			</label>
		</header>
		<div class="side-bar-list session-body-container">
			<template v-if="!searchInfo.isSearch && sideBarState === 'open'">
				<template
					v-for="class_ in SessionClass.getClasses()"
					:key="'class-' + class_.id"
				>
					<div class="list exp-body" :class="{ open: class_.open }">
						<header
							:title="class_.name"
							class="exp-header"
							@click="class_.open = !class_.open"
						>
							<div />
							<span>{{ class_.name }}</span>
							<a>{{ class_.content.length }}</a>
						</header>
						<div :id="'class-' + class_.id">
							<FriendBody
								v-for="item in class_.content"
								:key="'fb-' + item.id"
								v-menu.prevent="
									(event) => {
										openFriendMenu(
											event.x,
											event.y,
											'friend',
											item,
										)
									}
								"
								:data="item"
								from="friend"
								@click="userClick(item as Session)"
							/>
						</div>
					</div>
				</template>
			</template>
			<div
				v-else-if="!searchInfo.isSearch && sideBarState === 'fold'"
				class="list"
			>
				<div>
					<FriendBody
						v-for="item in searchInfo.originList"
						:key="'fb-' + item.id"
						v-menu.prevent="
							(event) =>
								openFriendMenu(event.x, event.y, 'friend', item)
						"
						:data="item as Session"
						from="friend"
						@click="userClick(item as Session)"
					/>
				</div>
			</div>
			<!-- 搜索用的 -->
			<div v-else class="list">
				<div>
					<FriendBody
						v-for="item in searchInfo.query"
						:key="'fb-' + item.id"
						v-menu.prevent="
							(event) =>
								openFriendMenu(event.x, event.y, 'friend', item)
						"
						:data="item as Session"
						from="friend"
						@click="userClick(item as Session)"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import FriendBody from '@renderer/components/FriendBody.vue'

import { Session, SessionClass } from '@renderer/function/model/session'
import { reloadUsers } from '@renderer/function/utils/appUtil'
import { openFriendMenu } from '@renderer/function/utils/contextMenu'
import { changeSession } from '@renderer/function/utils/msgUtil'
import { vAutoFocus, vMenu, vSearch } from '@renderer/function/utils/vcmd'
import { shallowReactive } from 'vue'

const { sideBarState } = defineProps<{
	sideBarState: 'fold' | 'open'
}>()

/**
 * 联系人被点击事件
 * @param session 联系人信息
 * @param event 点击事件
 */
function userClick(session: Session) {
	// 重置搜索信息
	searchInfo.isSearch = false
	changeSession(session)
}

const searchInfo = shallowReactive({
	originList: Session.sessionList,
	isSearch: false,
	query: [] as Session[],
})
</script>

<style scoped>
.exp-body > div {
	transform: scaleY(0);
	height: 0;
}
.exp-body.open > div {
	transform: scaleY(1);
	height: unset;
}
.exp-body > header > div {
	transition:
		margin-right 0.3s,
		transform 0.3s;
	transform: scaleY(0);
	margin-right: 0;
	width: 0;
}
.exp-body.open > header > div {
	transform: scaleY(1);
	margin-right: 10px;
	width: 5px;
}

.exp-header {
	color: var(--color-font);
	align-items: center;
	border-radius: 7px;
	cursor: pointer;
	margin: 0 10px;
	padding: 10px;
	display: flex;
}
.exp-header:hover {
	background: var(--color-card-2);
}
.exp-header > div {
	background: var(--color-main);
	margin-right: 10px;
	border-radius: 7px;
	height: 1rem;
	width: 5px;
}
.exp-header > span {
	flex: 1;
}
.exp-header > a {
	color: var(--color-font-2);
	font-size: 0.9rem;
}

@media (max-width: 700px) {
	.exp-header:not(.open) {
		display: none;
	}
}
@media (max-width: 500px) {
	.exp-header > span {
		display: block !important;
	}
}
</style>
