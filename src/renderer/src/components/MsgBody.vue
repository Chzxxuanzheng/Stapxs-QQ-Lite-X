<!--
 * @FileDescription: 消息模板
 * @Author: Stapxs
 * @Date:
 *      2022/08/03
 *      2022/12/12
 * @Version:
 *      1.0 - 初始版本
 *      1.5 - 重构为 ts 版本，代码格式优化
-->

<template>
	<div
		:id="'chat-' + msg.uuid"
		ref="msgMain"
		:class="{
			message: true,
			left: direction === 'left',
			right: direction === 'right',
			selected: selected,
			'without-avatar': config.withoutAvatar,
		}"
	>
		<img
			v-if="direction === 'left'"
			v-hide="!config.showAvatar"
			v-user-tooltip="() => msg.sender"
			v-menu.prevent="(event) => config.userMenu(event, msg.sender)"
			class="avatar"
			:src="msg.sender.face"
			:alt="msg.sender.name"
			@dblclick="emit('senderDoubleClick', msg.sender)"
		/>
		<div v-if="direction === 'right'" class="message-space" />
		<div
			:class="{
				'message-body': true,
				special: special,
				'hide-face': !config.showAvatar,
			}"
		>
			<div class="message-info">
				<!-- 一帮头衔之类的 -->
				<template
					v-if="msg.sender instanceof Member && config.showAvatar"
				>
					<span v-user-role="msg.sender.role">
						<template v-if="msg.sender.role === Role.Bot">
							<font-awesome-icon :icon="['fas', 'robot']" />
						</template>
						<template v-if="msg.sender.level">
							{{ 'Lv.' + msg.sender.level }}
						</template>
						<template v-if="msg.sender.title">
							{{
								msg.sender.title.replace(
									/[\u202A-\u202E\u2066-\u2069]/g,
									'',
								)
							}}
						</template>
					</span>
				</template>
				<a v-if="config.showAvatar" class="sender-name">
					{{ msg.sender.name }}
				</a>
			</div>
			<div class="message-content">
				<div
					v-if="msg.icon && config.showIcon && direction === 'right'"
					:class="{
						rotate: msg.icon.rotate,
						icon: true,
						left: true,
					}"
				>
					<div @click="msg.iconClick">
						<font-awesome-icon
							:style="{ color: msg.icon.color }"
							:title="msg.icon.desc"
							:aria-label="msg.icon.desc"
							:icon="['fas', msg.icon.icon]"
						/>
					</div>
				</div>
				<div
					v-menu.prevent="(event) => openMsgMenu(event)"
					v-move="moveOptions"
					:class="{
						main: true,
						'not-exist': !msg.exist && config.dimNonExistentMsg,
					}"
					@v-move-left.prevent="emit('leftMove', msg)"
					@v-move-right.prevent="emit('rightMove', msg)"
				>
					<!-- 空消息 -->
					<span
						v-if="msg.message.length === 0"
						class="msg-space"
						style="opacity: 0.5"
					>
						{{ $t('空消息') }}
					</span>
					<!-- 常规消息 -->
					<Segs
						:segs="msg.message"
						:show-to-me="config.showToMe"
						@imageLoaded="(height) => emit('imageLoaded', height)"
					/>
					<!-- 链接预览框 -->
					<MsgLinkPreview
						v-if="msg.linkPreview"
						:info="msg.linkPreview"
					/>
				</div>
				<div
					v-if="msg.icon && config.showIcon && direction === 'left'"
					:class="{
						rotate: msg.icon.rotate,
						icon: true,
					}"
				>
					<div @click="msg.iconClick">
						<font-awesome-icon
							:style="{ color: msg.icon.color }"
							:title="msg.icon.desc"
							:aria-label="msg.icon.desc"
							:icon="['fas', msg.icon.icon]"
						/>
					</div>
				</div>
			</div>
		</div>
		<img
			v-if="direction === 'right'"
			v-hide="!config.showAvatar"
			v-menu.prevent="(event) => config.userMenu(event, msg.sender)"
			v-user-tooltip="() => msg.sender"
			class="avatar"
			:src="msg.sender.face"
			:alt="msg.sender.name"
			@dblclick="emit('senderDoubleClick', msg.sender)"
		/>
		<div
			v-if="msg.emojis && Object.keys(msg.emojis).length > 0"
			class="emoji-like"
		>
			<div class="emoji-space" />
			<div class="emoji-like-body">
				<TransitionGroup name="emoji-like">
					<template
						v-for="(info, id) in msg.emojis as Record<
							string,
							number[]
						>"
						:key="'respond-' + msg.uuid + '-' + id"
					>
						<div
							:class="{
								'me-send':
									runtimeData.loginInfo &&
									info.includes(runtimeData.loginInfo?.uin),
							}"
							@click="emit('emojiClick', id as string, msg)"
						>
							<EmojiFace :emoji="Emoji.get(Number(id))" />
							<span>{{ info.length }}</span>
						</div>
					</template>
				</TransitionGroup>
			</div>
		</div>
		<div class="message-ex-info">
			<div v-if="direction === 'right'" class="space" />
			<div class="content">
				<template
					v-for="info in config.exInfo"
					:key="msg.uuid + '-exinfo-' + info"
				>
					<a v-if="info === 'msgId'"> msgId: {{ msg.message_id }} </a>
					<a v-if="info === 'time'">
						time: {{ msg.time?.format('year') }}
					</a>
				</template>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import EmojiFace from '@renderer/components/EmojiFace.vue'

import { Role } from '@renderer/function/adapter/enmu'
import { MenuEventData } from '@renderer/function/elements/information'
import Emoji from '@renderer/function/model/emoji'
import { Msg, SelfMsg } from '@renderer/function/model/msg'
import { IUser, Member } from '@renderer/function/model/user'
import {
	vHide,
	vMenu,
	vMove,
	VMoveOptions,
	vUserRole,
} from '@renderer/function/utils/vcmd'
import { computed, provide, shallowRef, useTemplateRef } from 'vue'
import { vUserTooltip } from '@renderer/function/tooltip'

import useRuntimeData from '@renderer/state/runtimeData'
import { getCm } from '@renderer/function/utils/baseUtil'
import MsgLinkPreview from '@renderer/components/msg-component/MsgLinkPreview.vue'
import app from '@renderer/main.js'
import Segs from '@renderer/components/msg-component/Segs.vue'
import useMsgsConfigState, {
	MsgsConfig,
} from '@renderer/function/composable/scopedState/msgsConfig'
import { MultiselectState } from '@renderer/function/composable/scopedState/multiselect'

const {
	msg,
	config = useMsgsConfigState({}),
	multiselectState,
} = defineProps<{
	msg: Msg | SelfMsg
	config?: MsgsConfig
	multiselectState?: MultiselectState
}>()

const emit = defineEmits<{
	leftMove: [msg: Msg]
	rightMove: [msg: Msg]
	senderDoubleClick: [user: IUser]
	emojiClick: [id: string, msg: Msg]
	imageLoaded: [height: number]
}>()

const msgMain = useTemplateRef<HTMLDivElement>('msgMain')
const menuTarget = shallowRef(false)

const runtimeData = useRuntimeData()

const special = computed(() => {
	if (!config.specialSelf) return false
	return msg.sender.user_id === runtimeData.loginInfo?.uin
})
const selected = computed(() => menuTarget.value || multiselectState?.has(msg))
const direction = computed(() => {
	if (special.value) return config.specialDirection
	else return config.direction
})

function openMsgMenu(eventData: MenuEventData) {
	menuTarget.value = true
	// 打开菜单
	config.msgMenu(eventData, msg).finally(() => {
		menuTarget.value = false
	})
}

const moveOptions: VMoveOptions<HTMLDivElement> = {
	moveHook: (_, move: number) => {
		const target = msgMain.value!
		target.style.transform = 'translateX(' + move + 'px)'
	},
	endHook: (_) => {
		const target = msgMain.value!

		target.style.transform = ''
		target.style.transition = 'all 0.3'
	},
	leftLimit: {
		value: getCm(),
		type: 'px',
	},
	rightLimit: {
		value: getCm(),
		type: 'px',
	},
	moveCondition: {
		minMove: {
			value: getCm(),
			type: 'px',
		},
	},
}

provide('message-content', msg)

const $t = app.config.globalProperties.$t
</script>
