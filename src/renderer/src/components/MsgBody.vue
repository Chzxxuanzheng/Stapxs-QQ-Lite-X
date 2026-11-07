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
		:id="'chat-' + data.uuid"
		ref="msgMain"
		:class="{
			message: true,
			left: direction === 'left',
			right: direction === 'right',
			selected: selected,
			'without-avatar': withoutAvatar,
		}"
	>
		<img
			v-if="direction === 'left'"
			v-hide="!showAvatar"
			v-user-tooltip="() => data.sender"
			v-menu.prevent="(event) => emit('showUserMenu', event, data.sender)"
			class="avatar"
			:src="data.sender.face"
			:alt="data.sender.name"
			@dblclick="emit('senderDoubleClick', data.sender)"
		/>
		<div v-if="direction === 'right'" class="message-space" />
		<div
			:class="{
				'message-body': true,
				special: special,
				'hide-face': !showAvatar,
			}"
		>
			<div class="message-info">
				<!-- 一帮头衔之类的 -->
				<template v-if="data.sender instanceof Member && showAvatar">
					<span v-user-role="data.sender.role">
						<template v-if="data.sender.role === Role.Bot">
							<font-awesome-icon :icon="['fas', 'robot']" />
						</template>
						<template v-if="data.sender.level">
							{{ 'Lv.' + data.sender.level }}
						</template>
						<template v-if="data.sender.title">
							{{
								data.sender.title.replace(
									/[\u202A-\u202E\u2066-\u2069]/g,
									'',
								)
							}}
						</template>
					</span>
				</template>
				<a v-if="showAvatar" class="sender-name">
					{{ data.sender.name }}
				</a>
			</div>
			<div class="message-content">
				<div
					v-if="data.icon && showIcon && direction === 'right'"
					:class="{
						rotate: data.icon.rotate,
						icon: true,
						left: true,
					}"
				>
					<div @click="data.iconClick">
						<font-awesome-icon
							:style="{ color: data.icon.color }"
							:title="data.icon.desc"
							:aria-label="data.icon.desc"
							:icon="['fas', data.icon.icon]"
						/>
					</div>
				</div>
				<div
					v-menu.prevent="(event) => emit('showMsgMenu', event, data)"
					v-move="moveOptions"
					:class="{
						main: true,
						'not-exist': !data.exist && dimNonExistentMsg,
					}"
					@v-move-left.prevent="emit('leftMove', data)"
					@v-move-right.prevent="emit('rightMove', data)"
				>
					<!-- 空消息 -->
					<span
						v-if="data.message.length === 0"
						class="msg-space"
						style="opacity: 0.5"
					>
						{{ $t('空消息') }}
					</span>
					<!-- 常规消息 -->
					<Segs
						:segs="data.message"
						:show-to-me="showToMe"
						@imageLoaded="(height) => emit('imageLoaded', height)"
					/>
					<!-- 链接预览框 -->
					<MsgLinkPreview
						v-if="data.linkPreview"
						:info="data.linkPreview"
					/>
				</div>
				<div
					v-if="data.icon && showIcon && direction === 'left'"
					:class="{
						rotate: data.icon.rotate,
						icon: true,
					}"
				>
					<div @click="data.iconClick">
						<font-awesome-icon
							:style="{ color: data.icon.color }"
							:title="data.icon.desc"
							:aria-label="data.icon.desc"
							:icon="['fas', data.icon.icon]"
						/>
					</div>
				</div>
			</div>
		</div>
		<img
			v-if="direction === 'right'"
			v-hide="!showAvatar"
			v-menu.prevent="(event) => emit('showUserMenu', event, data.sender)"
			v-user-tooltip="() => data.sender"
			class="avatar"
			:src="data.sender.face"
			:alt="data.sender.name"
			@dblclick="emit('senderDoubleClick', data.sender)"
		/>
		<div
			v-if="data.emojis && Object.keys(data.emojis).length > 0"
			class="emoji-like"
		>
			<div class="emoji-space" />
			<div class="emoji-like-body">
				<TransitionGroup name="emoji-like">
					<template
						v-for="(info, id) in data.emojis as Record<
							string,
							number[]
						>"
						:key="'respond-' + data.uuid + '-' + id"
					>
						<div
							:class="{
								'me-send':
									runtimeData.loginInfo &&
									info.includes(runtimeData.loginInfo?.uin),
							}"
							@click="emit('emojiClick', id as string, data)"
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
					v-for="info in exInfo"
					:key="data.uuid + '-exinfo-' + info"
				>
					<a v-if="info === 'msgId'">
						msgId: {{ data.message_id }}
					</a>
					<a v-if="info === 'time'">
						time: {{ data.time?.format('year') }}
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
import { provide, useTemplateRef } from 'vue'
import { vUserTooltip } from '@renderer/function/tooltip'

import useRuntimeData from '@renderer/state/runtimeData'
import { getCm } from '@renderer/function/utils/baseUtil'
import MsgLinkPreview from '@renderer/components/msg-component/MsgLinkPreview.vue'
import app from '@renderer/main.js'
import Segs from '@renderer/components/msg-component/Segs.vue'

//#region == 声明变量 ================================================================
const {
	data,
	selected,
	showIcon = true,
	dimNonExistentMsg = true,
	special = false,
	showToMe = true,
	direction = 'left',
	showAvatar = true,
	exInfo = ['time', 'msgId'],
	withoutAvatar = false,
} = defineProps<{
	data: Msg | SelfMsg
	selected?: boolean
	/**
	 * 显示消息icon（如发送中，发送失败）
	 */
	showIcon?: boolean
	/**
	 * 淡化不存在的消息（如正在发送中消息）
	 */
	dimNonExistentMsg?: boolean
	/**
	 * 特殊消息（如自己发的消息等）
	 */
	special?: boolean
	/**
	 * @我自己时高亮
	 */
	showToMe?: boolean
	/**
	 * 消息对齐方向（左侧/右侧）
	 */
	direction?: 'left' | 'right'
	/**
	 * 显示头像
	 * 设置为 false 时隐藏头像。
	 * 想移除头像占位请使用 withoutAvatar 选项
	 * 如果设为 true 不显示头像，请检查 withoutAvatar 选项
	 */
	showAvatar?: boolean
	/**
	 * 移除头像占位
	 * 设置为 true 时移除头像占位
	 */
	withoutAvatar?: boolean
	/**
	 * 显示时间
	 */
	exInfo?: ('time' | 'msgId')[]
}>()

const emit = defineEmits<{
	leftMove: [msg: Msg]
	rightMove: [msg: Msg]
	senderDoubleClick: [user: IUser]
	showMsgMenu: [event: MenuEventData, msg: Msg]
	showUserMenu: [event: MenuEventData, user: IUser]
	emojiClick: [id: string, msg: Msg]
	imageLoaded: [height: number]
}>()

const msgMain = useTemplateRef<HTMLDivElement>('msgMain')

const runtimeData = useRuntimeData()

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

provide('message-content', data)

const $t = app.config.globalProperties.$t
//#endregion

//#region == 工具函数 ================================================================

//#endregion
</script>
