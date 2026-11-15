import { SessionBox } from '@renderer/function/model/box'
import { Session } from '@renderer/function/model/session'
import { defineStore } from 'pinia'
// oxlint-disable-next-line no-restricted-imports
import { computed, shallowReactive, shallowRef, ref, watchEffect } from 'vue'
import useOptionStore from '@renderer/state/option'
import type { User } from '@renderer/function/model/user'
import { ProxyUrl } from '@renderer/function/model/proxyUrl'
import type { AdapterInterface } from '@renderer/function/adapter/interface'

const useRuntimeData = defineStore('runtimeData', () => {
	const option = useOptionStore()
	const selfInfo = shallowRef<User | undefined>()
	const connectInfo = shallowReactive<{
		address: string | undefined
		token: string | undefined
	}>({
		address: undefined,
		token: undefined,
	})
	const loginInfo = ref<{ nickname: string; uin: string } | undefined>()
	const tags = shallowReactive({
		firstLoad: false,
		darkMode: false,
		canCors: false,
		vibrancy: false,
		noLogin: true, // 一次都没有登陆
		dev: false,
	})
	const defaultColorMode = shallowRef<'light' | 'dark'>('light')
	const nowAdapter = shallowRef<AdapterInterface | undefined>()
	const connectionStatus = shallowRef<
		'disconnected' | 'connecting' | 'connected'
	>('disconnected')
	const nowChat = shallowRef<Session | undefined>()
	const nowBox = shallowRef<SessionBox | undefined>()
	const repoName = import.meta.env.VITE_APP_REPO_NAME

	// 跨域检测
	let testId = 0
	const testUrl = 'https://q1.qlogo.cn/g?b=qq&s=0&nk=0'
	setTimeout(() => {
		watchEffect(() => {
			testId++
			const thisId = testId
			tags.canCors = false
			const url = ProxyUrl.forceProxy(testUrl)
			// 没有代理直接返回
			if (url === testUrl) return
			fetch(url, { method: 'HEAD' }).then((res) => {
				if (testId > thisId) return
				tags.canCors = res.ok
			})
		})
	}, 100)

	// 系统颜色模式检测
	const media = globalThis.matchMedia('(prefers-color-scheme: dark)')
	defaultColorMode.value = media.matches ? 'dark' : 'light'
	media.addEventListener('change', (e) => {
		defaultColorMode.value = e.matches ? 'dark' : 'light'
	})

	// 开发模式
	function checkDevMode() {
		if (option.options.dev_mode) tags.dev = true
		else tags.dev = import.meta.env.DEV
	}
	setTimeout(() => {
		watchEffect(checkDevMode)
	}, 100)

	/**
	 * 清空当前适配器并同步重置连接状态
	 */
	function clearAdapter() {
		nowAdapter.value = undefined
		connectionStatus.value = 'disconnected'
	}

	function reset() {
		selfInfo.value = undefined
		loginInfo.value = undefined
		// 没有适配器时视为登出；登录过程中（适配器已就位）不能覆盖实时状态
		if (!nowAdapter.value) connectionStatus.value = 'disconnected'
	}
	return {
		connectInfo,
		loginInfo,
		tags,
		defaultColorMode,
		selfInfo,
		nowChat,
		nowBox,
		nowAdapter,
		connectionStatus,
		repoName,
		sysConfig: computed(() => option.options),
		clearAdapter,
		reset,
	}
})

export default useRuntimeData
