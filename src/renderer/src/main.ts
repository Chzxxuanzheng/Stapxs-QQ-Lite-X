import App from '@renderer/App.vue'

import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'

import { faSquare } from '@fortawesome/free-regular-svg-icons'

import VueAMap, { initAMapApiLoader } from '@vuemap/vue-amap'
import '@vuemap/vue-amap/dist/style.css'

import '@renderer/assets/css/style.css'
import '@renderer/assets/css/chat.css'
import '@renderer/assets/css/doc.css'
import '@renderer/assets/css/msg.css'
import '@renderer/assets/css/options.css'
import '@renderer/assets/css/sys_notice.css'
import '@renderer/assets/css/view.css'
import '@renderer/assets/css/color.css'

import {
	getPortableFileLang,
	getVersion,
} from '@renderer/function/utils/systemUtil'
import win from '@renderer/runtime/win'
import useOptionStore from '@renderer/state/option'

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

const day = 1000 * 3600 * 24

export const nowTimes = Math.floor(uptime / day)

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
/* oxlint-disable no-console */
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
setTimeout(async () => {
	// 加载设置项
	const option = useOptionStore()
	await option.init() // 载入设置项
	await win.init() // 初始化窗口信息
	app.mount('#app')
}, 0)
