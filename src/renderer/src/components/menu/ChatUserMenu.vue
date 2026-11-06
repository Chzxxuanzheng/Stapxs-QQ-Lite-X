<template>
	<div data-animation-name="chat-menu">
		<div class="ss-card msg-menu-body" @click.stop>
			<div v-if="menuDisplay.at" @click="setAt">
				<div><font-awesome-icon :icon="['fas', 'at']" /></div>
				<a>{{ $t('提及') }}</a>
			</div>
			<div v-if="menuDisplay.poke" @click="sendPoke">
				<div>
					<font-awesome-icon :icon="['fas', 'fa-hand-point-up']" />
				</div>
				<a>{{ $t('戳一戳') }}</a>
			</div>
			<div v-if="menuDisplay.remove" @click="removeUser">
				<div><font-awesome-icon :icon="['fas', 'trash-can']" /></div>
				<a>{{ $t('移出群聊') }}</a>
			</div>
			<!-- TODO <div v-if="menuDisplay.menuSelectedUser instanceof Member" v-if="menuDisplay.config"
				@click="openChatInfoPan();
						infoRef?.openMoreConfig(menuDisplay.menuSelectedUser);
						closeUserMenu();">
				<div><font-awesome-icon :icon="['fas', 'cog']" /></div>
				<a>{{ $t('成员设置') }}</a>
			</div> -->
		</div>
	</div>
</template>

<script setup lang="ts">
import { popInfo } from '@renderer/function/base'
import { GroupSession, Session } from '@renderer/function/model/session'
import { IUser, Member } from '@renderer/function/model/user'
import { ensurePopBox } from '@renderer/function/utils/popBox'
import app from '@renderer/main'
import { shallowReactive } from 'vue'
import useRuntimeData from '@renderer/state/runtimeData'

//#region == 变量声明 ============================================
const menuDisplay = shallowReactive({
	at: false,
	poke: false,
	remove: false,
})
const $t = app.config.globalProperties.$t
const { user, session, sendPokeFunc, setAtFunc } = defineProps<{
	session: Session
	user: IUser
	sendPokeFunc: (member: Member) => void
	setAtFunc: (user: IUser) => void
}>()
const emit = defineEmits<{
	close: [arg?: any]
}>()
const runtimeData = useRuntimeData()

init()
//#endregion

//#region == 函数定义 ============================================
function init() {
	let canAdmin: boolean
	if (!(session instanceof GroupSession)) canAdmin = false
	else if (!(user instanceof Member)) canAdmin = false
	else if (user.user_id === runtimeData.loginInfo?.uin) canAdmin = false
	else if (user.canBeAdmined(session.getMe().role)) canAdmin = true
	else canAdmin = false

	if (canAdmin) {
		// 自己、私聊或者没有权限的时候不显示移除
		menuDisplay.remove = true
	}

	// 原来私聊不能@
	if (session instanceof GroupSession) menuDisplay.at = true

	// 戳一戳
	menuDisplay.poke = true

	// 群成员设置
	if (canAdmin) {
		// menuDisplay.config = true
	}
}

function setAt() {
	setAtFunc(user)
	emit('close')
}

function sendPoke() {
	sendPokeFunc(user as Member)
	menuDisplay.poke = false
}

/**
 * 移出群聊
 */
async function removeUser() {
	const ensure = ensurePopBox(
		$t('真的要将 {user} 移出群聊吗', { user: user.name }),
	)

	if (!ensure) return

	emit('close')

	if (!runtimeData.nowAdapter?.kickMember) {
		popInfo.error($t('当前适配器不支持移除成员'))
		return
	}

	await runtimeData.nowAdapter.kickMember(
		session as GroupSession,
		user as Member,
	)
}
//#endregion
</script>
