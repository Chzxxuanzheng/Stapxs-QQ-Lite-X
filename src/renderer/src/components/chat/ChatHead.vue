<!--
 * @FileDescription: 聊天面板顶栏
 * @Author: Mr.Lee
 * @Date:
 *      2025/09/30
 * @Version:
 *      1.0 - 初始版本
-->

<template>
	<div
		class="chat-head"
		:class="{ hide: hide }"
		@mouseenter="hoverStart()"
		@mouseleave="hoverEnd()"
	>
		<div class="info">
			<img :src="session.face" :alt="session.showName" />
			<div class="info">
				<p>
					{{ session.showName }}
					<template v-if="session instanceof GroupSession">
						({{ session.memberList.length }})
					</template>
				</p>
				<span>
					<template v-if="session.appendInfo">
						{{ session.appendInfo }}
					</template>
					{{
						session.preMessage
							? $t('上次消息 - {time}', {
									time: session.preMessage.time?.format(),
								})
							: $t('暂无消息')
					}}
				</span>
			</div>
			<div class="space" />
			<div class="more">
				<font-awesome-icon
					v-if="session.isActive"
					:icon="['fas', 'ellipsis-vertical']"
					@click="openChatInfoPan"
				/>
				<font-awesome-icon
					v-else
					:icon="['fas', 'spinner']"
					class="loading"
				/>
			</div>
		</div>
		<div id="chat-head-bottom" />
	</div>
</template>

<script setup lang="ts">
import { GroupSession, Session } from '@renderer/function/model/session'
import { popBox } from '@renderer/function/utils/popBox'
import app from '@renderer/main'
import Info from '@renderer/pages/info/Info.vue'
import { computed, shallowRef } from 'vue'
import useRuntimeData from '@renderer/state/runtimeData'

const runtimeData = useRuntimeData()

const { session } = defineProps<{
	session: Session
}>()

const hover = shallowRef(false)

const hide = computed<boolean>(() => {
	if (!runtimeData.sysConfig.hide_chat_head) return false
	return !hover.value
})

function $t(key: string, args: Record<string, any> = {}): string {
	return app.config.globalProperties.$t(key, args)
}

let hoverTimeout: ReturnType<typeof setTimeout> | undefined
let staticTime: number | undefined
/**
 * 鼠标移入
 * 可以指定多长时间，才允许鼠标移出后，侧边栏收起
 * @param timeout
 */
function hoverStart(timeout: number = 500) {
	if (!staticTime) {
		hover.value = true
		staticTime = Date.now() + timeout
	}
	clearTimeout(hoverTimeout)
}
/**
 * 鼠标移出
 * @param event 鼠标移除位置检测
 */
function hoverEnd(event?: MouseEvent) {
	if (!staticTime) return
	if (event?.relatedTarget instanceof HTMLElement) {
		if (event.relatedTarget.closest('.menu-component')) return
	}
	const dTime = staticTime - Date.now()
	if (dTime <= 0) {
		hover.value = false
		staticTime = undefined
	} else {
		hoverTimeout = setTimeout(() => {
			hover.value = false
			staticTime = undefined
		}, dTime)
	}
}

/**
 * 打开好友/群组信息页面
 */
function openChatInfoPan() {
	// 加载一些需要显示的消息，有部分判断是用来防止反复加载已存在内容的

	popBox({
		comp: Info,
		title: session.type === 'group' ? $t('群信息') : $t('好友信息'),
		svg: session.type === 'group' ? 'users' : 'user',
		props: { chat: session },
	})

	// // 加载基础信息
	// TODO:
	// if (
	//     chat.show.type === 'group' &&
	//     chat.info.group_info.gc !== chat.show.id
	// ) {
	//     const url = `https://qinfo.clt.qq.com/cgi-bin/qun_info/get_group_info_all?gc=${chat.show.id}&bkn=${runtimeData.loginInfo?.bkn}`
	//     Connector.send(
	//         'http_proxy',
	//         { url: url },
	//         'getMoreGroupInfo',
	//     )
	// }
}
</script>
