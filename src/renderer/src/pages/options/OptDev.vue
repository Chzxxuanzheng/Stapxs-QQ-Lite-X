<!--
 * @FileDescription: 设置页面（开发者子页面）
 * @Author: Stapxs
 * @Date: 2022/09/28
 * @Version: 1.0
-->

<template>
	<div class="opt-page">
		<div class="ss-card">
			<header>{{ $t('兼容选项') }}</header>
			<div class="tip">
				{{
					$t(
						'这儿是兼容性相关的高级选项，这些选项通常会自动识别，如果出现了不正确的情况你也可以手动调整。',
					)
				}}
			</div>
			<div
				class="opt-item"
				:class="{ changed: !option.checkDefault('proxyUrl') }"
			>
				<font-awesome-icon :icon="['fas', 'route']" />
				<div>
					<span>{{ $t('自定义跨域服务') }}</span>
					<span>{{
						$t('如果你需要使用跨域服务，请在这里输入服务地址')
					}}</span>
				</div>
			</div>
			<div class="tip cors">
				<input
					v-model.trim="runtimeData.sysConfig.proxyUrl"
					class="ss-input"
					type="text"
					name="proxyUrl"
				/>
				<br />
				<div
					:style="{
						color: 'var(--color-red)',
						height: illegalProxyUrl ? '1rem' : '0px',
						'font-size': illegalProxyUrl ? '1rem' : '0px',
						'margin-bottom': illegalProxyUrl ? '10px' : '0px',
						transition: 'all 0.2s',
					}"
				>
					<font-awesome-icon :icon="['fas', 'xmark']" />
					{{ $t('代理地址不包含\{url\}') }}
				</div>
				{{
					$t(
						'当应用需要获取腾讯的数据时，可能会被浏览器当作恶意操作阻止。为了访问这些资源，你可以使用桌面端，它自带跨域功能。',
					)
				}}
				<br />
				{{
					$t(
						'如果你要在web端使用跨域，请填写跨域服务器地址，格式如下：',
					)
				}}
				<br />
				<span> https://cors-proxy.example.com/proxy?url={url} </span>
				<br />
				<br />
				{{ $t('其中{url}会被替换为实际url。') }}
				<br />
				{{
					$t(
						'跨域服务器你可以在网上寻找公益跨域服务器，但可能存在安全隐患。强烈建议你自己搭建跨域服务器，问问AI就能解决。',
					)
				}}
				<br />
				<div>
					<div>
						<font-awesome-icon
							:icon="['fas', 'fa-circle']"
							:style="{
								color: runtimeData.tags.canCors
									? 'var(--color-green)'
									: 'var(--color-red)',
							}"
						/>
						<template v-if="runtimeData.tags.canCors">
							{{ $t('测试成功') }}
						</template>
						<template v-else>
							{{ $t('测试失败') }}
						</template>
					</div>
				</div>
			</div>
		</div>

		<div class="ss-card">
			<header>{{ $t('开发者选项') }}</header>
			<div class="opt-item">
				<div
					:class="{
						changed: !option.checkDefault('log_level'),
					}"
				/>
				<font-awesome-icon :icon="['fas', 'book']" />
				<div>
					<span>{{ $t('日志等级') }}</span>
					<span>{{ $t('ReferenceError: moYu is not defined') }}</span>
				</div>
				<div class="select-wrapper">
					<select
						v-model="runtimeData.sysConfig.log_level"
						name="log_level"
						title="log_level"
					>
						<option value="err">
							{{ $t('错误') }}
						</option>
						<option value="debug">
							{{ $t('调试') }}
						</option>
						<option value="info">
							{{ $t('基本') }}
						</option>
						<option value="all">
							{{ $t('全部') }}
						</option>
					</select>
				</div>
			</div>
			<!-- TODO 这个输入框确实不好用...不知道用啥输入框合适...等那天都啥api统计齐全了直接做成复选框 -->
			<!-- <div class="opt-item">
                <div :class="{changed: !option.checkDefault('api_log')}" />
                <font-awesome-icon :icon="['fas', 'right-left']" />
                <div>
                    <span>{{ $t('通信过滤器') }}</span>
                    <span>{{ $t('输入你要过滤的api日志, 输入all表示全都输出, ex: send_msg, get_message') }}</span>
                </div>
                <input v-model="runtimeData.sysConfig.api_log"
                    class="ss-input" style="width: 150px"
                    type="text" name="api_log" @keyup="save">
            </div> -->
			<div class="opt-item">
				<div
					:class="{
						changed: !option.checkDefault('debug_msg'),
					}"
				/>
				<font-awesome-icon :icon="['fas', 'robot']" />
				<div>
					<span>{{ $t('禁用消息渲染') }}</span>
					<span>
						<a style="cursor: pointer" @click="sendAbab">{{
							$t('点击进行 CAPTCHA 验证')
						}}</a>
					</span>
				</div>
				<Switch v-model="runtimeData.sysConfig.debug_msg" />
			</div>
		</div>
		<div class="ss-card">
			<header>{{ $t('调试') }}</header>
			<div class="opt-item">
				<font-awesome-icon :icon="['fas', 'envelope']" />
				<div>
					<span>{{ $t('应用消息测试') }}</span>
					<span>{{ $t('#$&*#$= ……') }}</span>
				</div>
				<input
					v-model="appmsg_text"
					class="ss-input"
					style="width: 150px"
					type="text"
					@keyup="sendTestAppmsg"
				/>
			</div>
			<div v-if="runtimeData.tags.dev" class="opt-item">
				<font-awesome-icon :icon="['fas', 'trash']" />
				<div>
					<span>{{ $t('移除未使用的配置') }}</span>
					<span>{{ $t('sudo rm -rf /etc') }}</span>
				</div>
				<button
					style="width: 100px; font-size: 0.8rem"
					class="ss-button"
					@click="rmNeedlessOption"
				>
					{{ $t('执行') }}
				</button>
			</div>
			<div class="opt-item">
				<font-awesome-icon :icon="['fas', 'face-grin-wink']" />
				<div>
					<span>{{ $t('打开欢迎窗口') }}</span>
					<span>{{ $t('Welcome to use Stapxs QQ Lite X') }}</span>
				</div>
				<button
					style="width: 100px; font-size: 0.8rem"
					class="ss-button"
					@click="openWelcomeWindow"
				>
					{{ $t('执行') }}
				</button>
			</div>
			<div class="opt-item">
				<font-awesome-icon :icon="['fas', 'file-invoice']" />
				<div>
					<span>{{ $t('输出运行时') }}</span>
					<span>{{ $t('全都吐出来！') }}</span>
				</div>
				<button
					style="width: 100px; font-size: 0.8rem"
					class="ss-button"
					@click="printRuntime"
				>
					{{ $t('执行') }}
				</button>
			</div>
			<div class="opt-item">
				<font-awesome-icon :icon="['fas', 'screwdriver-wrench']" />
				<div>
					<span>{{ $t('输出调试信息') }}</span>
					<span>{{ $t('到底用的什么版本呢 ……') }}</span>
				</div>
				<button
					style="width: 100px; font-size: 0.8rem"
					class="ss-button"
					@click="printVersionInfo"
				>
					{{ $t('执行') }}
				</button>
			</div>
			<div class="opt-item">
				<font-awesome-icon :icon="['fas', 'magnifying-glass']" />
				<div>
					<span>{{ $t('调试模式') }}</span>
					<span>{{ $t('开发者阁下，你好👋') }}</span>
				</div>
				<Switch v-model="runtimeData.sysConfig.dev_mode" />
			</div>
		</div>
		<div class="ss-card">
			<header>{{ $t('维护与备份') }}</header>
			<div class="opt-item">
				<font-awesome-icon :icon="['fas', 'upload']" />
				<div>
					<span>{{ $t('导出设置项') }}</span>
					<span>{{
						$t('tar zcvf config.tar.gz /localStorage')
					}}</span>
				</div>
				<button
					style="width: 100px; font-size: 0.8rem"
					class="ss-button"
					@click="printSetUpInfo"
				>
					{{ $t('执行') }}
				</button>
			</div>
			<div class="opt-item">
				<font-awesome-icon :icon="['fas', 'download']" />
				<div>
					<span>{{ $t('导入设置项') }}</span>
					<span>{{ $t('tar zxvf cache.tar.gz /localStorage') }}</span>
				</div>
				<button
					style="width: 100px; font-size: 0.8rem"
					class="ss-button"
					@click="importSetUpInfo"
				>
					{{ $t('执行') }}
				</button>
			</div>
			<div class="opt-item">
				<font-awesome-icon :icon="['fas', 'trash-arrow-up']" />
				<div>
					<span>{{ $t('重置应用') }}</span>
					<span>{{ $t('sudo rm -rf /localStorage') }}</span>
				</div>
				<button
					style="width: 100px; font-size: 0.8rem"
					class="ss-button"
					@click="resetApp"
				>
					{{ $t('执行') }}
				</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Switch from '@renderer/components/Switch.vue'
import useOptionStore from '@renderer/state/option'
import { popInfo } from '@renderer/function/base'
import useRuntimeData from '@renderer/state/runtimeData'
import { BrowserInfo, detect } from 'detect-browser'
import app, { uptime } from '@renderer/main'
import { computed, shallowRef } from 'vue'
import driver from '@renderer/function/driver'
import {
	ensurePopBox,
	htmlPopBox,
	popBox,
} from '@renderer/function/utils/popBox'
import {
	copyToClipboard,
	getVersion,
} from '@renderer/function/utils/systemUtil'
import WelPan from '@renderer/components/popBox/WelPan.vue'

const option = useOptionStore()

const $t = app.config.globalProperties.$t
const runtimeData = useRuntimeData()
const appmsg_text = shallowRef('')

const illegalProxyUrl = computed(() => {
	if (!runtimeData.sysConfig.proxyUrl) return false
	if (!runtimeData.sysConfig.proxyUrl.includes('{url}')) return true
	return false
})

function sendTestAppmsg(event: KeyboardEvent) {
	if (event.key === 'Enter' && appmsg_text.value !== '') {
		popInfo.info(appmsg_text.value, false)
		appmsg_text.value = ''
	}
}

function sendAbab() {
	popInfo.info(app.config.globalProperties.$t('你不是人（逃'))
}

function printRuntime() {
	/* oxlint-disable no-console */
	console.log('=========================')
	console.log(runtimeData)
	console.log('=========================')
	/* oxlint-enable no-console */
}

async function printVersionInfo() {
	popInfo.info(app.config.globalProperties.$t('正在收集调试消息……'))

	const browser = detect() as BrowserInfo
	let info = '```\n'
	info +=
		'Debug Info - ' +
		new Date().toLocaleString() +
		'\n================================\n'
	const systemInfo = [
		['OS Name', browser.os],
		['Browser Name', browser.name],
		['Browser Version', browser.version],
	] as [key: string, value: any][]
	info += 'System Info:\n'
	info += createVersionInfo(systemInfo)

	const applicationInfo = [
		[
			'Uptime',
			Math.floor(((Date.now() - uptime) / 1000) * 100) / 100 + ' s',
		],
		['Package Version', getVersion()],
		[
			'Service Work',
			navigator.serviceWorker?.controller ? 'active' : 'inactive',
		],
	] as [key: string, value: any][]

	info += 'Application Info:\n'
	info += createVersionInfo(applicationInfo)

	const adapeterInfo = [
		[
			'status',
			!runtimeData.nowAdapter || driver.isConnected()
				? 'connected'
				: 'not connected',
		],
	] as [key: string, value: any][]

	if (!runtimeData.nowAdapter) adapeterInfo.push(['info', 'Not connected'])
	else {
		const data = await runtimeData.nowAdapter.getAdapterInfo()
		if (!data) adapeterInfo.push(['info', 'Get info failed'])
		else {
			for (const key in data) {
				adapeterInfo.push([key, data[key]])
			}
		}
	}
	info += 'Adapter Info:\n'
	info += createVersionInfo(adapeterInfo)

	const viewInfo = [
		['Doc Width', document.getElementById('app')?.offsetWidth + ' px'],
	] as [key: string, value: any][]

	info += 'View Info:\n'
	info += createVersionInfo(viewInfo)

	const networkInfo = [] as [key: string, value: any][]
	const testList = [
		['Github          ', 'https://api.github.com'],
		['Link API        ', 'https://api.stapxs.cn'],
	]
	for (const item of testList) {
		const start = Date.now()
		try {
			await fetch(item[1], { method: 'GET' })
			const end = Date.now()
			networkInfo.push([item[0], end - start + ' ms'])
		} catch {
			networkInfo.push([item[0], 'failed'])
		}
	}
	info += 'Network Info:\n'
	info += createVersionInfo(networkInfo)
	info += '```'
	// 构建 popBox 内容
	htmlPopBox('<textarea class="debug-info">' + info + '</textarea>', {
		svg: 'screwdriver-wrench',
		title: $t('调试信息'),
		button: [
			{
				text: app.config.globalProperties.$t('复制'),
				noClose: true,
				fun: () => {
					copyToClipboard(info)
						.then(() => popInfo.info($t('复制成功')))
						.catch(() => popInfo.error($t('复制失败')))
				},
			},
			{
				text: app.config.globalProperties.$t('确定'),
				master: true,
			},
		],
	})
}

function printSetUpInfo() {
	const json = JSON.stringify(option.rawConfigs)
	htmlPopBox(
		'<textarea style="width: calc(100% - 40px);min-height: 90px;background: var(--color-card-1);color: var(--color-font);border: 0;padding: 20px;border-radius: 7px;margin-top: -10px;">' +
			json +
			'</textarea>',
		{
			svg: 'upload',
			title: $t('导出设置项'),
			button: [
				{
					text: app.config.globalProperties.$t('复制'),
					noClose: true,
					fun: () => {
						copyToClipboard(json)
							.then(() => popInfo.info($t('复制成功')))
							.catch(() => popInfo.error($t('复制失败')))
					},
				},
				{
					text: app.config.globalProperties.$t('确定'),
					master: true,
				},
			],
		},
	)
}

function importSetUpInfo() {
	htmlPopBox(
		'<textarea id="importSetUpInfoTextArea" style="width: calc(100% - 40px);min-height: 90px;background: var(--color-card-1);color: var(--color-font);border: 0;padding: 20px;border-radius: 7px;margin-top: -10px;"></textarea>',
		{
			svg: 'download',
			title: $t('导入设置项'),
			button: [
				{
					text: app.config.globalProperties.$t('取消'),
				},
				{
					text: app.config.globalProperties.$t('确定'),
					master: true,
					fun: async () => {
						const input = document.getElementById(
							'importSetUpInfoTextArea',
						) as HTMLTextAreaElement
						if (input) {
							try {
								await option.loadAllFromString(input.value)
								location.reload()
							} catch {
								popInfo.error(
									app.config.globalProperties.$t(
										'导入设置项失败',
									),
								)
							}
						}
					},
				},
			],
		},
	)
}

async function resetApp() {
	const ensure = await ensurePopBox(
		$t(
			'确认要重置应用吗，重置应用将会失去所有设置内容（包括设置的置顶群组），但是可能可以解决一些因为浏览器缓存导致的奇怪问题。',
		),
	)

	if (!ensure) return

	// oxlint-disable-next-line no-restricted-globals
	localStorage.clear()
	const cookies = document.cookie.split(';')
	for (const cookie of cookies) {
		document.cookie = cookie
			.replace(/^ +/, '')
			.replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
	}
	location.reload()
}

// 查看配置文件
function rmNeedlessOption() {
	// const needless: string[] = []
	// for (const key of Object.keys(runtimeData.sysConfig)) {
	//     if (optDefault[key] === undefined) {
	//         needless.push(key)
	//     }
	// }
	// if (needless.length === 0) {
	//     new PopInfo().add(
	//         PopType.INFO,
	//         $t('没有需要删除的配置项'),
	//     )
	//     return
	// }
	// htmlPopBox(`
	//         <header>以下配置将被删除</header>
	//         <div style="color: var(--color-red);font-weight: 700;">
	//     ` + needless.join('<br>') + '</div>', {
	//     title: $t('删除无用配置'),
	//     button: [
	//         {
	//             text: $t('取消'),
	//             master: true,
	//         },
	//         {
	//             text: $t('确定'),
	//             fun: async () => {
	//                 // TODO 删除配置
	//             },
	//         },
	//     ],
	// })
}
function createVersionInfo(data: [key: string, value: any][]) {
	let info = ''
	for (const [key, value] of data) {
		info += `    ${key.padEnd(20)}-> ${value}\n`
	}
	return info
}

function openWelcomeWindow() {
	popBox({
		comp: WelPan,
		allowAutoClose: false,
	})
}
</script>
