<!--
 - @FileDescription: 设置页面（账号子页面）
 - @Author: Stapxs
 - @Date: 2022/9/29
          2022/12/9
 - @Version: 1.0 - 初始版本
             1.5 - 重构为 ts 版本，代码格式优化
-->

<template>
	<div class="opt-page">
		<template v-if="runtimeData.selfInfo">
			<div class="ss-card account-info">
				<img
					:src="runtimeData.selfInfo.face"
					:alt="'[' + $t('头像') + ']'"
				/>
				<div>
					<div>
						<span>{{ runtimeData.loginInfo?.nickname }}</span>
						<span>{{ runtimeData.loginInfo?.uin }}</span>
					</div>
					<span>{{ runtimeData.selfInfo.longNick }}</span>
				</div>
				<font-awesome-icon
					:icon="['fas', 'right-from-bracket']"
					@click="exitConnect"
				/>
			</div>
			<div class="ss-card">
				<header>{{ $t('账号设置') }}</header>
				<div class="opt-item">
					<font-awesome-icon :icon="['fas', 'address-card']" />
					<div>
						<span>{{ $t('昵称') }}</span>
						<span>{{ $t('就只是个名字而已 ……') }}</span>
					</div>
					<input
						v-model="selfNick"
						class="ss-input"
						style="width: 150px"
						type="text"
						@keyup="setNick"
					/>
				</div>
				<div class="opt-item">
					<font-awesome-icon :icon="['fas', 'pen']" />
					<div>
						<span>{{ $t('签名') }}</span>
						<span>{{ $t('啊吧啊吧（智慧的眼神）') }}</span>
					</div>
					<input
						v-model="selfSign"
						class="ss-input"
						style="width: 150px"
						type="text"
						@keyup="setLNick"
					/>
				</div>
			</div>
		</template>
		<template v-else>
			<div class="ss-card account-not-login">
				<font-awesome-icon :icon="['fas', 'fish']" />
				<span>{{ $t('还没有连接到 协议段 耶') }}</span>
				<button class="ss-button" @click="goLogin">
					{{ $t('去连接') }}
				</button>
			</div>
		</template>
		<div v-if="Object.keys(implBar).length > 0" class="ss-card">
			<header>{{ $t('适配器信息') }}</header>
			<div class="l10n-info">
				<font-awesome-icon :icon="['fas', 'robot']" />
				<div>
					<span
						>{{ nowAdapter.name }}
						<a>{{ nowAdapter.version }}</a>
					</span>
					<span>{{ $t('这是你连接的 QQ Bot 的相关信息') }}</span>
				</div>
			</div>
			<component :is="implBar" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { AdapterInterface } from '@renderer/function/adapter/interface'
import { popInfo } from '@renderer/function/base'
import { User } from '@renderer/function/model/user'
import { openLoginPan } from '@renderer/function/utils/systemUtil'
import { i18n } from '@renderer/main'
import useRuntimeData from '@renderer/state/runtimeData'
import { computed, markRaw, shallowRef, watch } from 'vue'

const runtimeData = useRuntimeData()

const nowAdapter = computed(() => runtimeData.nowAdapter as AdapterInterface)
const implBar = computed(() => {
	return markRaw(runtimeData.nowAdapter?.optInfo?.() ?? {})
})

const emit = defineEmits<{
	closePopBox: []
}>()

const selfNick = shallowRef<string>('')
const selfSign = shallowRef<string>('')

function $t(value: string, option: any = {}) {
	return i18n.global.t(value, option)
}

updateSelfInfo()
watch(
	() => runtimeData.selfInfo,
	() => {
		updateSelfInfo()
	},
)

function updateSelfInfo() {
	if (runtimeData.selfInfo) {
		selfNick.value = runtimeData.selfInfo.nickname?.toString() ?? ''
		selfSign.value = runtimeData.selfInfo.longNick?.toString() ?? ''
	} else {
		selfNick.value = ''
		selfSign.value = ''
	}
}

/**
 * 断开连接
 */
function exitConnect() {
	runtimeData.sysConfig.auto_connect = false
	runtimeData.nowAdapter?.close()
	runtimeData.reset()
	goLogin()
}

function goLogin() {
	// 打开登陆弹窗
	openLoginPan()
	// 关闭自己
	emit('closePopBox')
}

/**
 * 设置昵称
 * @param event 事件
 */
async function setNick(event: KeyboardEvent) {
	if (event.key === 'Enter' && selfNick.value !== '') {
		if (!runtimeData.nowAdapter?.setNickname) {
			popInfo.error($t('当前适配器不支持设置昵称'))
			return
		}

		const re = await runtimeData.nowAdapter?.setNickname(selfNick.value)

		if (re) {
			popInfo.info($t('检查更新结果ing'))
			await refreshSelfInfo()
		} else {
			popInfo.error($t('个性签名设置失败'))
		}
	}
}

/**
 * 设置签名
 * @param event 事件
 */
async function setLNick(event: KeyboardEvent) {
	if (event.key === 'Enter' && selfSign.value !== '') {
		if (!runtimeData.nowAdapter?.setSign) {
			popInfo.error($t('当前适配器不支持设置个性签名'))
			return
		}
		const re = await runtimeData.nowAdapter?.setSign(selfSign.value)
		if (re) {
			popInfo.info($t('检查更新结果ing'))
			await refreshSelfInfo()
		} else {
			popInfo.error($t('个性签名设置失败'))
		}
	}
}

async function refreshSelfInfo() {
	if (!runtimeData.nowAdapter) {
		popInfo.error($t('连接中断...'))
		return
	}
	if (!runtimeData.loginInfo) {
		popInfo.error($t('未登录...'))
		return
	}
	const selfInfo = await runtimeData.nowAdapter.getUserInfo(
		runtimeData.loginInfo.uin,
		false,
	)
	if (!selfInfo) {
		popInfo.error($t('检查更新失败'))
		return
	}
	if (selfInfo) {
		runtimeData.selfInfo = new User(selfInfo)
		runtimeData.loginInfo.nickname = selfInfo.nickname?.toString() ?? ''
		popInfo.info($t('设置成功'))
	} else {
		popInfo.error($t('设置失败'))
	}
}
</script>
