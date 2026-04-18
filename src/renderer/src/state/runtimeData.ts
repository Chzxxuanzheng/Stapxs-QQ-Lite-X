import { SessionBox } from '@renderer/function/model/box'
import { Session } from '@renderer/function/model/session'
import { defineStore } from 'pinia'
// eslint-disable-next-line no-restricted-imports
import { computed, shallowReactive, shallowRef, ref, watchEffect } from 'vue'
import useOptionStore from './option'
import type { User } from '@renderer/function/model/user'
import { backend } from '@renderer/runtime/backend'
import { ProxyUrl } from '@renderer/function/model/proxyUrl'
import { AdapterInterface } from '@renderer/function/adapter/interface'

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
    const loginInfo = ref<{ nickname: string; uin: number } | undefined>()
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
            if (backend.type === 'electron') {
                tags.canCors = true
                return
            }
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

    function reset() {
        selfInfo.value = undefined
        loginInfo.value = undefined
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
        repoName,
        sysConfig: computed(() => option.options),
        reset,
    }
})

export default useRuntimeData
