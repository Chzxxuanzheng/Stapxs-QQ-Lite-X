import App from './App.vue'

import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'

import { faSquare } from '@fortawesome/free-regular-svg-icons'

import VueAMap, { initAMapApiLoader } from '@vuemap/vue-amap'
import '@vuemap/vue-amap/dist/style.css'

import './assets/css/chat.css'
import './assets/css/doc.css'
import './assets/css/msg.css'
import './assets/css/options.css'
import './assets/css/sys_notice.css'
import './assets/css/view.css'
import './assets/css/color.css'

import { getPortableFileLang, getVersion } from './function/utils/systemUtil'
import { useLocalStorage } from './function/utils/vuse'
import { backend } from './runtime/backend'
import win from './runtime/win'
import useOptionStore from './state/option'
// import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

/* eslint-disable no-console */
const zh = getPortableFileLang('zh-CN')

// 载入 l10n
const messages = { 'zh-CN': zh }
// 初始化 i18n
export const i18n = createI18n({
    legacy: false,
    locale: 'zh-CN',
    fallbackLocale: 'zh-CN',
    silentFallbackWarn: true,
    messages,
})
// 创建 Pinia
const pinia = createPinia()
// pinia.use(piniaPluginPersistedstate)

// 创建 App
const app = createApp(App).use(i18n).use(pinia).use(VueAMap)
library.add(fas)
library.add(faSquare)
app.component('FontAwesomeIcon', FontAwesomeIcon)

initAMapApiLoader({
    key: import.meta.env.VITE_APP_AMAP_KEY,
    securityJsCode: import.meta.env.VITE_APP_AMAP_SECRET,
})

export default app
export const uptime = Date.now()

const _nowTimes = useLocalStorage('now-times', 0)
const timesEnd = useLocalStorage('last-times', 0)
if (uptime > timesEnd.value) {
    _nowTimes.value += 1
    const dailyFlag = useLocalStorage('daily-flag', '')
    timesEnd.value = uptime + 24 * 60 * 60 * 1000
    dailyFlag.value = ''
}

export const nowTimes = _nowTimes.value

const BOOT_TIMEOUT_MS = 10000

// 奇奇怪怪的日志
const strList = ['VERSION', 'WELCOME', 'HELLO']
const colorList = [
    '50534f',
    'f9a633',
    '8076a3',
    '92aa8a',
    '606e7a',
    '7abb7e',
    'b573f7',
    'ff5370',
    '99b3db',
    '677480',
]
const color = colorList[Math.floor(Math.random() * colorList.length)]
const str = strList[Math.floor(Math.random() * strList.length)]
console.log(
    `%c${str}%c Stapxs QQ Lite X - ${getVersion()} ( ${import.meta.env.DEV ? 'development' : 'production'} ) `,
    `font-weight:bold;background:#${color};color:#fff;border-radius:7px 0 0 7px;padding:7px 14px;margin:7px 0 7px 7px;`,
    'background:#e3e8ec;color:#000;border-radius:0 7px 7px 0;display:inline-block;padding:7px 14px;margin:7px 7px 7px 0;',
)
if (import.meta.env.DEV) {
    console.log('[ SSystem Bootloader Loading …… core/sardos-core ]')
}
console.log('[ SSystem Bootloader Loading …… core/ssqq-core ]')

// 加载配置文件，挂在
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`${label} timeout(${timeoutMs}ms)`))
            }, timeoutMs)
        }),
    ])
}

async function runBootStep(label: string, fn: () => Promise<void>) {
    const start = Date.now()
    try {
        await withTimeout(fn(), BOOT_TIMEOUT_MS, label)
        console.log(`[boot] ${label} done in ${Date.now() - start}ms`)
        return true
    } catch (err) {
        console.error(`[boot] ${label} failed`, err)
        return false
    }
}

setTimeout(async () => {
    await runBootStep('backend.init', async () => {
        await backend.init() // Desktop：初始化客户端功能
    })
    console.log('[boot] backend.mode', {
        type: backend.type,
        platform: backend.platform,
        release: backend.release,
        arch: backend.arch,
    })

    const option = useOptionStore()
    await runBootStep('option.init', async () => {
        await option.init() // 载入设置项
    })

    await runBootStep('win.init', async () => {
        await win.init() // 初始化窗口信息
    })
    console.log(
        `[boot] win.state withBar=${String(win.withBar)} margin=${String(
            win.margin,
        )} maximized=${String(win.maximized)} darkMode=${String(
            win.darkMode,
        )} vibrancy=${String(win.vibrancyMode)}`,
    )

    try {
        app.mount('#app')
        console.log('[boot] app.mount done')
    } catch (err) {
        console.error('[boot] app.mount failed', err)
    }
}, 0)
