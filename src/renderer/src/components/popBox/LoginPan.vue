<template>
	<div class="login-pan-card">
		<div class="setting" @click="openOptions">
			<font-awesome-icon :icon="['fas', 'gear']" />
		</div>
		<Icon animation />
		<p>{{ $t('连接到 协议端') }}</p>
		<form @submit.prevent @submit="connect">
			<label class="input">
				<font-awesome-icon :icon="['fas', 'link']" />
				<input
					id="sev_address"
					v-model="loginInfo.address"
					:placeholder="$t('连接地址')"
					class="ss-input"
					autocomplete="off"
				/>
			</label>
			<label class="input">
				<font-awesome-icon :icon="['fas', 'lock']" />
				<input
					id="access_token"
					v-model="loginInfo.token"
					:placeholder="$t('连接密钥')"
					class="ss-input"
					type="password"
					autocomplete="off"
				/>
			</label>
			<div style="display: flex">
				<label class="default">
					<input
						id="in_"
						v-model="runtimeData.sysConfig.auto_save_password"
						type="checkbox"
						name="save_password"
						@click="savePassword"
					/>
					<a>{{ $t('记住密码') }}</a>
				</label>
				<div style="flex: 1" />
				<label class="default" style="justify-content: flex-end">
					<input
						v-model="runtimeData.sysConfig.auto_connect"
						type="checkbox"
						name="auto_connect"
						@click="saveAutoConnect"
					/>
					<a>{{ $t('自动连接') }}</a>
				</label>
			</div>
			<button
				id="connect_btn"
				class="ss-button"
				type="submit"
				:disabled="isLogging"
				@mousemove="afd"
			>
				<template v-if="!isLogging">
					{{ $t('连接') }}
				</template>
				<template v-else>
					<font-awesome-icon :icon="['fas', 'spinner']" spin />
				</template>
			</button>
		</form>
		<a @click="howToConnect">{{ $t('如何连接') }}</a>
	</div>
</template>

<script setup lang="ts">
import driver from '@renderer/function/driver'
import { login } from '@renderer/function/login'
import useRuntimeData from '@renderer/state/runtimeData'
import { noticePopBox, popBox } from '@renderer/function/utils/popBox'
import { i18n } from '@renderer/main'
import { computed, shallowReactive, shallowRef } from 'vue'
import Icon from '@renderer/components/Icon.vue'
import HowToConnect from '@renderer/components/popBox/doc/HowToConnect.vue'
import Options from '@renderer/pages/Options.vue'
const loginInfo = shallowReactive({
	address: '',
	token: '',
})
const runLoginFunc = shallowRef(false)
const isLogging = computed(() => {
	if (runLoginFunc.value) return true
	return driver.isConnecting()
})

const emit = defineEmits<{
	closePopBox: []
}>()

const runtimeData = useRuntimeData()
const $t = i18n.global.t

// 加载密码保存和自动连接
loginInfo.address = runtimeData.sysConfig.address
if (runtimeData.sysConfig.auto_save_password) {
	loginInfo.token = runtimeData.sysConfig.saved_password
}

// 自动登陆
if (runtimeData.sysConfig.auto_connect) connect()

/**
 * 发起连接
 */
async function connect() {
	const main = async () => {
		const re = await login(loginInfo.address, loginInfo.token)
		if (!re) return

		// 保存登陆地址密码
		runtimeData.sysConfig.address = loginInfo.address
		if (runtimeData.sysConfig.auto_save_password)
			runtimeData.sysConfig.saved_password = loginInfo.token

		// 移除未登陆状态
		runtimeData.tags.noLogin = false

		// 关闭弹窗
		emit('closePopBox')
	}

	runLoginFunc.value = true
	await main()
	runLoginFunc.value = false
}

/**
 * 保存密码
 * @param event 事件
 */
function savePassword(event: Event) {
	const sender = event.target as HTMLInputElement
	const value = sender.checked
	if (value) {
		runtimeData.sysConfig.auto_save_password = true
		// 创建提示弹窗
		noticePopBox(
			$t(
				'连接密钥将以明文存储在浏览器 Cookie 中，请确保设备安全以防止密钥泄漏。',
			),
		)
	} else {
		// 清除保存的密码
		runtimeData.sysConfig.auto_save_password = false
		runtimeData.sysConfig.saved_password = ''
	}
}

/**
 * 保存自动连接
 * @param event 事件
 */
function saveAutoConnect(event: PointerEvent) {
	if (!(event.target as HTMLInputElement).checked) return
	// 开启自动连接时，强制开启保存密码
	runtimeData.sysConfig.auto_save_password = true
}

/**
 * 阅读如何连接
 */
function howToConnect() {
	popBox({
		title: $t('如何连接？'),
		comp: HowToConnect,
		svg: 'book',
		button: [
			{
				master: true,
				text: $t('确定'),
			},
		],
	})
}

/**
 * 打开设置
 */
function openOptions() {
	popBox({
		comp: Options,
	})
}

function afd(event: MouseEvent) {
	// 只在愚人节时生效
	if (new Date().getMonth() == 3 && new Date().getDate() == 1) {
		const sender = event.target as HTMLButtonElement
		// 获取文档整体宽高
		const docWidth = document.documentElement.clientWidth
		const docHeight = document.documentElement.clientHeight
		// 获取按钮宽高
		const senderWidth = sender.offsetWidth
		const senderHeight = sender.offsetHeight
		// 获取鼠标位置
		const mouseX = event.clientX
		const mouseY = event.clientY
		// 在宽高里随机抽一个位置，不能超出文档，不能让按钮在鼠标下
		let x, y
		do {
			x = Math.floor(Math.random() * docWidth)
			y = Math.floor(Math.random() * docHeight)
		} while (
			x + senderWidth > docWidth ||
			y + senderHeight > docHeight ||
			(x < mouseX &&
				x + senderWidth > mouseX &&
				y < mouseY &&
				y + senderHeight > mouseY)
		)
		// 设置按钮位置
		sender.style.left = x + 'px'
		sender.style.top = y + 'px'
	}
}
</script>
