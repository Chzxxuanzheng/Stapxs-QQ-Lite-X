<!--
 - @FileDescription: 设置页面（群/好友设置页面）
 - @Author: Stapxs
 - @Date: 2023/2/7
 - @Version: 1.0 - 初始版本
 -           2.0 - 重构为setup
-->

<template>
	<div class="info-pan-set" style="padding: 0">
		<!-- 公用设置 -->
		<!-- 群设置 -->
		<template v-if="chat instanceof GroupSession">
			<div
				v-if="
					chat.getMe().role == 'owner' || chat.getMe().role == 'admin'
				"
				class="opt-item"
			>
				<font-awesome-icon :icon="['fas', 'pen']" />
				<div>
					<span>{{ $t('群聊名称') }}</span>
					<span>{{ $t('“你们真是害人不浅呐你们这个群”') }}</span>
				</div>
				<input
					v-model="nowChatName"
					class="ss-input"
					style="width: 150px"
					type="text"
					@keyup="setGroupName"
				/>
			</div>
			<div class="opt-item">
				<font-awesome-icon :icon="['fas', 'note-sticky']" />
				<div>
					<span>{{ $t('我的群昵称') }}</span>
					<span>{{ $t('￡爺↘僞ηι慹著彡') }}</span>
				</div>
				<input
					v-model="meCard"
					class="ss-input"
					style="width: 150px"
					type="text"
					@change="
						meCard !== chat.getMe().card?.toString()
							? emit('update_member_card', chat.getMe(), meCard)
							: undefined
					"
				/>
			</div>
			<div class="opt-item">
				<font-awesome-icon :icon="['fas', 'bell']" />
				<div>
					<span>{{ $t('通知群消息') }}</span>
					<span>{{ $t('快来水群快来水群！') }}</span>
				</div>
				<label class="ss-switch">
					<input
						:value="chat.notice"
						type="checkbox"
						name="opt_dark"
						@change="setGroupNotice"
					/>
					<div>
						<div />
					</div>
				</label>
			</div>

			<button
				class="ss-button"
				style="width: calc(100% - 60px); margin: 10px 30px 0 30px"
				@click="leaveGroup()"
			>
				{{ $t('退出群聊') }}
			</button>
		</template>
	</div>
</template>

<script setup lang="ts">
import { GroupSession } from '@renderer/function/model/session'
import { Member } from '@renderer/function/model/user'
import useRuntimeData from '@renderer/state/runtimeData'
import { reloadUsers } from '@renderer/function/utils/appUtil'
import { delay } from '@renderer/function/utils/systemUtil'
import app from '@renderer/main'

import { popInfo } from '@renderer/function/base'
import { ensurePopBox, waitPopBox } from '@renderer/function/utils/popBox'
import { shallowRef, watch } from 'vue'

//#region == 声明变量 ================================================================
const { $t } = app.config.globalProperties
const runtimeData = useRuntimeData()
const { chat } = defineProps<{
	chat: GroupSession
}>()
const emit = defineEmits<{
	update_member_card: [mem: Member, value: string]
}>()

const meCard = shallowRef(chat.getMe().card?.toString() ?? '')
const nowChatName = shallowRef(chat.showName ?? '')
//#endregion

//#region == 变量更新 ================================================================
watch(
	() => chat.showName,
	(newName) => {
		nowChatName.value = newName ?? ''
	},
)
watch(
	() => chat.getMe().card,
	(newCard) => {
		meCard.value = newCard?.toString() ?? ''
	},
)
//#endregion

//#region == 方法函数 ================================================================
/**
 * 设置群消息通知
 * @param event 输入事件
 */
function setGroupNotice(event: Event) {
	const status = (event.target as HTMLInputElement).checked
	if (!(chat instanceof GroupSession)) return
	chat.setNotice(status)
}

/**
 * 设置群名
 * @param event 按键事件
 */
async function setGroupName(event: KeyboardEvent) {
	if (!chat) return
	if (event.key === 'Enter') {
		if (!runtimeData.nowAdapter?.setGroupName) {
			popInfo.info($t('当前适配器不支持设置群名称'))
			return
		}
		await runtimeData.nowAdapter.setGroupName(chat, nowChatName.value)

		await checkSetChatInfoResult()
	}
}

/**
 * 退出群聊
 */
async function leaveGroup() {
	const ensure = await ensurePopBox($t('确定要退出群聊吗？'))

	if (!ensure) return

	if (!runtimeData.nowAdapter?.leaveGroup) {
		popInfo.info($t('当前适配器不支持退出群聊'))
		return
	}
	await runtimeData.nowAdapter.leaveGroup(chat)

	await checkSetChatInfoResult()
}

async function checkSetChatInfoResult() {
	const done = waitPopBox($t('正在确认操作……'))
	await delay(1000)
	await reloadUsers(false)
	done()
}
//#endregion
</script>

<style scoped>
.opt-item:hover input[type='text'] {
	background: var(--color-card-2);
	transition: background 0.2s;
}
</style>
