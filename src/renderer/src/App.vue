<template>
	<div id="base-app" ref="base-app">
		<div
			class="main-body"
			:style="{
				'--side-bar-width': runtimeData.sysConfig.side_bar_width + 'px',
			}"
		>
			<SideBar />
			<div class="main-box">
				<Chat
					v-if="driver.isConnected() && runtimeData.nowChat"
					ref="chat"
					v-model="runtimeData.nowChat.inputMsg"
					:chat="runtimeData.nowChat"
				/>
				<!-- 背景 -->
				<div
					v-if="!runtimeData.tags.vibrancy || !runtimeData.nowChat"
					v-hide="runtimeData.tags.noLogin"
					class="main-box-bg"
				>
					<div class="ss-card choice-chat">
						<template v-if="runtimeData.nowChat">
							<font-awesome-icon
								:icon="['fas', 'angles-right']"
							/>
							<span>(っ≧ω≦)っ</span>
							<span>{{ $t('别划了别划了被看见了啦') }}</span>
						</template>
						<template v-else>
							<font-awesome-icon :icon="['fas', 'inbox']" />
							<span>{{ $t('选择联系人开始聊天') }}</span>
						</template>
					</div>
				</div>
			</div>
		</div>

		<!-- 通知列表 -->
		<TransitionGroup class="app-msg" name="appmsg" tag="div">
			<div v-for="msg in popList" :key="'appmsg-' + msg.id">
				<div><font-awesome-icon :icon="['fas', msg.svg]" /></div>
				<a>{{ msg.text }}</a>
				<div v-if="!msg.autoClose" @click="popInfo.remove(msg.id)">
					<font-awesome-icon :icon="['fas', 'xmark']" />
				</div>
			</div>
		</TransitionGroup>

		<!-- 全局搜索栏 -->
		<GlobalSessionSearchBar />
		<Viewer ref="viewer" />

		<!-- 弹窗列表 -->
		<PopBoxes />
		<!-- 菜单 -->
		<ContextMenus />
		<!-- 提示工具 -->
		<Tooltips />
		<div id="mobile-css" />
	</div>
	<div
		class="bg-blur"
		:style="{
			backdropFilter: `blur(${runtimeData.sysConfig.background_img_blur}px)`,
		}"
	/>
</template>

<script setup lang="ts">
import Umami from '@stapxs/umami-logger-typescript'
import * as App from './function/utils/appUtil'

import { logger, popInfo, popList } from '@renderer/function/base'
import { i18n, uptime } from '@renderer/main'
import { onMounted, provide, shallowReactive, useTemplateRef } from 'vue'
import driver from '@renderer/function/driver'
import { Notify } from '@renderer/function/notify'
import { ensurePopBox } from '@renderer/function/utils/popBox'
import { getVersion, openLoginPan } from '@renderer/function/utils/systemUtil'

import GlobalSessionSearchBar from '@renderer/components/GlobalSessionSearchBar.vue'
import Viewer from '@renderer/components/Viewer.vue'
import { vHide } from '@renderer/function/utils/vcmd'
import { useBackHoldup, useFrame } from '@renderer/function/utils/vuse'
import Chat from '@renderer/pages/Chat.vue'
import SideBar from '@renderer/pages/SideBar.vue'
import ContextMenus from '@renderer/components/menu/ContextMenus.vue'
import Tooltips from '@renderer/components/tooltip/Tooltips.vue'
import PopBoxes from '@renderer/components/popBox/PopBoxes.vue'
import useRuntimeData from './state/runtimeData'

//#region == 定义变量 ===================================================
const fps = shallowReactive({
	last: Date.now(),
	ticks: 0,
	value: 0,
})
const $t = i18n.global.t
const runtimeData = useRuntimeData()
//#endregion

//#region == 组件实例注册 ===============================================
const viewer = useTemplateRef('viewer')
const baseApp = useTemplateRef('base-app')
provide('viewer', viewer)
//#endregion

//#region == 更新标题 ===================================================
const titleList = [
	'也试试 Icalingua Plus Plus 吧！',
	'点击阅读《社交功能限制提醒》',
	'登录失败，Code 45',
	'你好世界！',
	'这只是个普通的彩蛋！',
]
if (import.meta.env.DEV) {
	document.title = 'Stapxs QQ Lite X(Dev)'
} else {
	const title = titleList[Math.floor(Math.random() * titleList.length)]
	document.title = title + '- Stapxs QQ Lite X'
}
//#endregion

//#region == 全局监听 ===================================================
// moYu彩蛋
window.moYu = () => {
	return '\x75\x6e\x64\x65\x66\x69\x6e\x65\x64'
}
// 页面加载完成后
onMounted(init)
window.onbeforeunload = () => {
	logger.system(
		'开发者阁下—— 唔，阁下离开的太匆忙了！让我来帮开发者阁下收拾下东西吧。',
	)
	new Notify().clear()
	runtimeData.nowAdapter?.close()
	runtimeData.nowAdapter = undefined
}

useFrame(() => {
	if (!baseApp.value) return
	baseApp.value.scrollTop = 0
})
//#endregion

//#region == 方法函数 ===================================================
/**
 * 初始化
 */
async function init() {
	if (import.meta.env.DEV)
		// oxlint-disable-next-line no-console
		console.log(
			'[ SSystem Bootloader Complete took ' +
				(new Date().getTime() - uptime) +
				'ms, welcome to sar-dos on stapxs-qq-lite.su ]',
		)
	else
		// oxlint-disable-next-line no-console
		console.log(
			'[ SSystem Bootloader Complete took ' +
				(new Date().getTime() - uptime) +
				'ms, welcome to ssqq on stapxs-qq-lite.user ]',
		)

	// AMAP：初始化高德地图
	window._AMapSecurityConfig = import.meta.env.VITE_APP_AMAP_SECRET

	//#region == 初始化功能 =====================================
	// 加载开发者相关功能
	if (import.meta.env.DEV) {
		document.title = 'Stapxs QQ Lite X (Dev)'
		// FPS 检查
		rafLoop()
	}

	if (import.meta.env.DEV) {
		logger.debug(
			'stapxs-qq-lite.su:$/mnt/boot/dawnHunt/bin/core --pour /mnt/app/bin/main',
			true,
		)
		logger.system(
			'[ dawnHuntCore Version: 1.0 Beta, dawnHuntDB: 2025-04-24 ]',
		)
	} else {
		logger.debug('stapxs-qq-lite.user:$/mnt/app/bin/main', true)
	}
	logger.debug('系统配置' + runtimeData.sysConfig)

	// 基础初始化完成
	logger.system(
		'欢迎回来，开发者。Stapxs QQ Lite X 正处于 ' +
			(import.meta.env.DEV ? 'development' : 'production') +
			' 模式。正在为您加载更多功能。',
	)
	//#endregion

	//#region == popstate监听 ==================================
	let askFlag = false
	const exit = useBackHoldup(async () => {
		if (askFlag) exit()
		else {
			askFlag = true
			// 离开提醒
			const ensure = await ensurePopBox(
				$t('离开 Stapxs QQ Lite X？'),
				$t('离开'),
			)
			if (ensure) exit()
			askFlag = false
		}
		return true
	})
	//#endregion

	//#region == 加载 Umami 统计功能 ============================
	if (!runtimeData.sysConfig.close_ga) {
		if (import.meta.env.DEV) {
			logger.system(
				'开发者，由于 Stapxs QQ Lite X 运行在调试模式下，分析组件并未初始化 …… 系统将无法捕获开发者阁下的访问状态，请悉知。',
			)
		} else {
			const config = {
				baseUrl: import.meta.env.VITE_APP_MU_ADDRESS,
				websiteId: import.meta.env.VITE_APP_MU_ID,
			} as any
			Umami.initialize(config)
			// 上报一些应用基础信息
			App.sendIdentifyData({
				app_version:
					import.meta.env.VITE_APP_CLIENT_TAG + ',' + getVersion(),
				os_version: await getDeviceInfo(),
				os_arch: undefined,
			})
		}
	}
	//#endregion

	//#region == 公告弹窗 ======================================
	openLoginPan() // 打开登录面板
	App.checkUpdate() // 检查更新
	App.checkOpenTimes() // 检查打开次数
	App.checkNotice() // 检查公告
	//#endregion

	if (new Date().getMonth() == 3 && new Date().getDate() == 1)
		document.getElementById('connect_btn')?.classList.add('afd')
}

/**
 * 刷新页面 fps 数据
 * @param timestamp 时间戳
 */
function rafLoop() {
	fps.ticks += 1
	//每30帧统计一次帧率
	if (fps.ticks >= 30) {
		const now = Date.now()
		const diff = now - fps.last
		const fpsValue = Math.round(1000 / (diff / fps.ticks))
		fps.last = now
		fps.ticks = 0
		fps.value = fpsValue
	}
	requestAnimationFrame(rafLoop)
}

async function getDeviceInfo(): Promise<string> {
	let os = ''
	let version = ''

	// 优先使用 navigator.userAgentData（Chrome / Edge / Android）
	if ((navigator as any).userAgentData) {
		os = (navigator as any).userAgentData.platform || os
		try {
			const highEntropy = await (
				navigator as any
			).userAgentData.getHighEntropyValues(['platformVersion'])
			version = highEntropy.platformVersion || version
		} catch {
			// 如果获取失败，保持 Unknown
		}
	} else {
		// fallback: 使用 navigator.userAgent
		const ua = navigator.userAgent

		if (/Windows NT (\d+\.\d+)/.test(ua)) {
			os = 'Windows'
			version = /Windows NT (\d+\.\d+)/.exec(ua)?.[1] ?? 'Unknown'
		} else if (/Mac OS X (\d+[_.]\d+[_.]?\d*)/.test(ua)) {
			os = 'macOS'
			version =
				/Mac OS X (\d+[_.]\d+[_.]?\d*)/
					.exec(ua)?.[1]
					?.replaceAll('_', '.') ?? 'Unknown'
		} else if (/Android (\d+(\.\d+)?)/.test(ua)) {
			os = 'Android'
			version = /Android (\d+(\.\d+)?)/.exec(ua)?.[1] ?? 'Unknown'
		} else if (/iPhone OS (\d+[_.]\d+[_.]?\d*)/.test(ua)) {
			os = 'iOS'
			version =
				/iPhone OS (\d+[_.]\d+[_.]?\d*)/
					.exec(ua)?.[1]
					?.replaceAll('_', '.') ?? 'Unknown'
		} else if (/Linux/.test(ua)) {
			os = 'Linux'
			version = 'Unknown'
		}
	}
	return `${os} ${version} (Web)`
}
//#endregion
</script>

<style scoped>
/* 应用通知动画 */
.appmsg-move,
.appmsg-enter-active,
.appmsg-leave-active {
	transition: all 0.2s;
}

.appmsg-leave-active {
	position: absolute;
}

.appmsg-enter-from,
.appmsg-leave-to {
	transform: translateX(-20px);
	opacity: 0;
}
</style>
