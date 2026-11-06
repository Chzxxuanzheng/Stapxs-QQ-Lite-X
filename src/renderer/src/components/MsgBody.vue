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
	<div :id="'chat-' + data.uuid" ref="msgMain" :class="{
		message: true,
		left: direction === 'left',
		right: direction === 'right',
		selected: selected,
		'without-avatar': withoutAvatar,
	}">
		<img v-if="direction === 'left'" v-hide="!showAvatar" v-user-tooltip="() => data.sender" v-menu.prevent="(event) => $emit('showUserMenu', event, data.sender)
			" class="avatar" :src="data.sender.face" :alt="data.sender.name"
			@dblclick="$emit('senderDoubleClick', data.sender)" />
		<div v-if="direction === 'right'" class="message-space" />
		<div :class="{
			'message-body': true,
			special: special,
			'hide-face': !showAvatar,
		}">
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
				<div v-if="data.icon && showIcon && direction === 'right'" :class="{
					rotate: data.icon.rotate,
					icon: true,
					left: true,
				}">
					<div @click="data.iconClick">
						<font-awesome-icon :style="{ color: data.icon.color }" :title="data.icon.desc"
							:aria-label="data.icon.desc" :icon="['fas', data.icon.icon]" />
					</div>
				</div>
				<div v-menu.prevent="(event) => $emit('showMsgMenu', event, data)" v-move="moveOptions" :class="{
					main: true,
					'not-exist': !data.exist && dimNonExistentMsg,
				}" @v-move-left.prevent="$emit('leftMove', data)" @v-move-right.prevent="$emit('rightMove', data)">
					<!-- 空消息 -->
					<span v-if="msgSpecialType === 'space'" class="msg-text" style="opacity: 0.5">
						{{ $t('空消息') }}
					</span>
					<!-- 超级表情 -->
					<div v-else-if="msgSpecialType === 'super-face'" class="msg-super-face" style="--height: 35vh">
						<LazyLottie :animation-link="(data.message[0] as FaceSeg).face!.superValue!"
							:title="(data.message[0] as FaceSeg).face!.description" />
					</div>
					<VideoSegComp v-else-if="msgSpecialType === 'video'" :seg="data.message[0] as VideoSeg" />
					<ForwardSegComp v-else-if="msgSpecialType === 'forward'" :seg="data.message[0] as ForwardSeg" />
					<!-- 卡片消息 -->
					<JsonSegComp v-else-if="msgSpecialType === 'json'" :seg="data.message[0] as JsonSeg" />
					<XmlSegComp v-else-if="msgSpecialType === 'xml'" :seg="data.message[0] as XmlSeg" />
					<!-- 常规消息 -->
					<template v-else>
						<div v-for="(item, index) in data.message" :key="data.uuid + '-m-' + index" :class="{
							'msg-inline': item.inline,
						}">
							<div v-if="item.type === undefined" />
							<span v-else-if="isDebugMsg" class="msg-text">
								{{ item }}
							</span>
							<template v-else-if="item instanceof TxtSeg">
								<template v-for="(data, id) in item.praseMsg" :key="id">
									<span v-if="data.type === 'txt'" class="msg-text">{{ data.content }}</span>
									<a v-else
										@click="openLink(data.content.startsWith('http') ? data.content : `https://${data.content}`)"
										class="link msg-text">
										{{ data.content }}
									</a>
								</template>
							</template>
							<div v-else-if="item instanceof MdSeg" v-once :id="getMdHTML(
								item.content,
								'msg-md-' + data.uuid,
							)
								" class="msg-md" />
							<ImgSegComp v-else-if="
								item instanceof MfaceSeg ||
								item instanceof ImgSeg
							" :pos="getSegPos(item)" :seg="item" @image-loaded="
								(height) => emit('imageLoaded', height)
							" />
							<template v-else-if="item instanceof FaceSeg">
								<EmojiFace :emoji="item.face" class="msg-face" />
							</template>
							<template v-else-if="item instanceof AtSeg">
								<a v-user-tooltip="() => getAtMember(item.user_id)
									" :class="{
										'msg-at': true,
										atme:
											item.user_id ===
											runtimeData.loginInfo?.uin &&
											showToMe,
									}">
									{{ item.plaintext(data) }}
								</a>
							</template>
							<template v-else-if="item instanceof AtAllSeg">
								<a :class="{
									'msg-at': true,
									atme: showToMe,
								}">
									@{{ $t('全体成员') }}
								</a>
							</template>
							<div v-else-if="item instanceof FileSeg" class="msg-file">
								<div>
									<div>
										<a>
											<font-awesome-icon :icon="['fas', 'file']" />
											{{
												data.session?.type == 'group'
													? $t('群文件')
													: $t('离线文件')
											}}
										</a>
										<p>{{ item.name }}</p>
									</div>
									<i>{{ item.formatSize }}</i>
								</div>
								<div>
									<font-awesome-icon v-if="
										item.download_percent === undefined
									" :icon="['fas', 'angle-down']" @click="item.download()" />
									<svg v-else-if="
										item.download_percent !==
										undefined &&
										item.download_percent < 100
									" class="download-bar" xmlns="http://www.w3.org/2000/svg">
										<circle cx="50%" cy="50%" r="40%" stroke-width="15%" ill="none"
											stroke-linecap="round" />
										<circle cx="50%" cy="50%" r="40%" stroke-width="15%" fill="none"
											:stroke-dasharray="item.download_percent ===
												undefined
												? '0,10000'
												: `${(Math.floor(2 * Math.PI * 25) * item.download_percent) / 100},10000`
												" />
									</svg>
									<font-awesome-icon v-else :icon="['fas', 'check']" />
								</div>
								<div v-if="item.fileView" class="file-view">
									<img v-if="
										[
											'jpg',
											'jpeg',
											'png',
											'gif',
											'bmp',
											'webp',
										].includes(item.fileView.ext)
									" :alt="item.name" :src="item.fileView.url" />
									<video v-else-if="
										[
											'mp4',
											'avi',
											'mkv',
											'flv',
										].includes(item.fileView.ext)
									" playsinline controls muted autoplay>
										<source :src="item.fileView.url" :type="'video/' + item.fileView.ext" />
										现在还有不支持 video tag 的浏览器吗？
									</video>
									<span v-else-if="
										['txt', 'md'].includes(
											item.fileView.ext,
										) &&
										item.size &&
										item.size < 2000000
									" class="txt">
										<a>&gt; {{ item.name }} -
											{{ $t('文件预览') }}</a>
										{{ getTxtUrl(item.fileView)
										}}{{ item.fileView.txt }}
									</span>
								</div>
							</div>
							<div v-else-if="item instanceof ReplySeg" v-tooltip="msgPrevTooltip(
								data.session?.getMsgById(item.id)
									? [
										data.session!.getMsgById(
											item.id,
										)!,
									]
									: $t('加载消息失败'),
							)
								" class="msg-reply" @click="scrollToMsg(item.id)">
								<font-awesome-icon :icon="['fas', 'reply']" />
								<a :class="getRepMsg(item.id) ? '' : 'msg-unknown'
									" style="cursor: pointer">
									{{
										getRepMsg(item.id) ??
										$t('（查看回复消息）')
									}}
								</a>
							</div>
							<div v-else-if="item.type == 'poke'" v-once>
								<font-awesome-icon class="poke-hand" style="margin-right: 5px"
									:icon="['fas', 'fa-hand-point-up']" />
								{{ $t('戳了戳你') }}
							</div>
							<div v-else-if="item instanceof ErrorSeg" class="msg-unknown">
								( {{ $t('加载失败') }} )
							</div>
							<span v-else class="msg-unknown">
								{{ `（${$t('不支持的消息')}: ${item.type}）` }}
							</span>
						</div>
					</template>
					<!-- 链接预览框 -->
					<MsgLinkPreview v-if="data.linkPreview" :info="data.linkPreview" />
				</div>
				<div v-if="data.icon && showIcon && direction === 'left'" :class="{
					rotate: data.icon.rotate,
					icon: true,
				}">
					<div @click="data.iconClick">
						<font-awesome-icon :style="{ color: data.icon.color }" :title="data.icon.desc"
							:aria-label="data.icon.desc" :icon="['fas', data.icon.icon]" />
					</div>
				</div>
			</div>
		</div>
		<img v-if="direction === 'right'" v-hide="!showAvatar" v-menu.prevent="(event) => $emit('showUserMenu', event, data.sender)
			" v-user-tooltip="() => data.sender" class="avatar" :src="data.sender.face" :alt="data.sender.name"
			@dblclick="$emit('senderDoubleClick', data.sender)" />
		<div v-if="data.emojis && Object.keys(data.emojis).length > 0" class="emoji-like">
			<div class="emoji-space" />
			<div class="emoji-like-body">
				<TransitionGroup name="emoji-like">
					<template v-for="(info, id) in data.emojis as Record<
						string,
						number[]
					>" :key="'respond-' + data.uuid + '-' + id">
						<div :class="{
							'me-send': info.includes(
								runtimeData.loginInfo?.uin,
							),
						}" @click="$emit('emojiClick', id as string, data)">
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
				<template v-for="info in exInfo" :key="data.uuid + '-exinfo-' + info">
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
import MsgPrevTooltip from './tooltip/MsgPrevTooltip.vue'
import ImgSegComp from './msg-component/ImgSegComp.vue'
import EmojiFace from './EmojiFace.vue'

import markdownit from 'markdown-it'
import { Role } from '@renderer/function/adapter/enmu'
import { popInfo } from '@renderer/function/base'
import { MenuEventData } from '@renderer/function/elements/information'
import Emoji from '@renderer/function/model/emoji'
import { Msg, SelfMsg } from '@renderer/function/model/msg'
import {
	AtAllSeg,
	AtSeg,
	ErrorSeg,
	FaceSeg,
	FileSeg,
	ForwardSeg,
	ImgSeg,
	JsonSeg,
	MdSeg,
	MfaceSeg,
	ReplySeg,
	Seg,
	TxtSeg,
	VideoSeg,
	XmlSeg,
} from '@renderer/function/model/seg'
import { IUser, Member } from '@renderer/function/model/user'
import {
	openLink,
	scrollToMsg as scrollToMsgFunc,
} from '@renderer/function/utils/appUtil'
import { getTrueLang } from '@renderer/function/utils/systemUtil'
import {
	vHide,
	vMenu,
	vMove,
	VMoveOptions,
	vUserRole,
	vTooltip,
} from '@renderer/function/utils/vcmd'
import { defineComponent, provide, useTemplateRef } from 'vue'
import LazyLottie from './LazyLottie.vue'
import { vUserTooltip } from '@renderer/function/tooltip'
import { VueCompData } from '@renderer/function/elements/vueComp'
import JsonSegComp from './msg-component/JsonSegComp.vue'
import XmlSegComp from './msg-component/XmlSegComp.vue'
import useRuntimeData from '@renderer/state/runtimeData'
import { getCm } from '@renderer/function/utils/baseUtil'
import VideoSegComp from './msg-component/VideoSegComp.vue'
import MsgLinkPreview from './msg-component/MsgLinkPreview.vue'
import ForwardSegComp from './msg-component/ForwardSegComp.vue'

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

let msgSpecialType: 'space' | 'normally' | 'super-face' | 'json' | 'xml' | 'forward' | 'video' =
	'normally'

if (data.message.length === 0) {
	msgSpecialType = 'space'
} else if (data.message.length === 1) {
	const seg = data.message[0]
	if (seg instanceof FaceSeg && seg.face?.hasSuper) {
		msgSpecialType = 'super-face'
	} else if (seg instanceof JsonSeg) {
		msgSpecialType = 'json'
	} else if (seg instanceof XmlSeg) {
		msgSpecialType = 'xml'
	} else if (seg instanceof ForwardSeg) {
		msgSpecialType = 'forward'
	} else if (seg instanceof VideoSeg) {
		msgSpecialType = 'video'
	}
}

provide('message-content', data)
//#endregion
//#region == 工具函数 ================================================================
function getAtMember(id: number): IUser | number {
	const user = data.session?.getUserById(id)
	if (user) return user
	else return id
}
function msgPrevTooltip(
	msgs: Msg[] | string,
): VueCompData<typeof MsgPrevTooltip> {
	return {
		comp: MsgPrevTooltip,
		props: {
			msgs,
		},
	}
}
function getSegPos(seg: Seg): 'alone' | 'top' | 'middle' | 'bottom' {
	const msg = data.message
	if (msg.length === 1) return 'alone'
	const index = msg.indexOf(seg)
	if (index === 0) return 'top'
	if (index === msg.length - 1) return 'bottom'
	return 'middle'
}
//#endregion
//#region == 暴露给下面的script =======================================================
defineExpose({
	setupEmit: emit,
	setupProps: {
		data,
		selected,
	},
})
//#endregion
</script>

<script lang="ts">
export default defineComponent({
	name: 'MsgBody',
	data() {
		const runtimeData = useRuntimeData()
		return {
			md: markdownit({ breaks: true }),
			isMe: false,
			isDebugMsg: runtimeData.sysConfig.debug_msg,
			pageViewInfo: undefined as { [key: string]: any } | undefined,
			getVideo: false,
			trueLang: getTrueLang(),
			// 互动相关
			msgMove: {
				move: 0,
				onScroll: 'none' as 'none' | 'touch' | 'wheel',
				touchLast: null as null | TouchEvent,
			},
		}
	},
	mounted() {
		const runtimeData = useRuntimeData()
		// 初始化 isMe 参数
		this.isMe =
			Number(runtimeData.loginInfo?.uin) ===
			Number(this.data.sender.user_id)
	},
	methods: {
		/**
		 * 滚动到指定消息
		 * @param message_id 消息 id
		 */
		scrollToMsg(message_id: string) {
			if (!this.data.session) return
			const msg = this.data.session.getMsgById(message_id)
			if (!msg) {
				popInfo.info(this.$t('定位消息失败'))
				return
			}
			scrollToMsgFunc(msg, true)
		},

		/**
		 * 尝试在消息列表中寻找这条被回复的消息，获取消息内容
		 * @param message_id
		 */
		getRepMsg(message_id: string): string | null {
			const runtimeData = useRuntimeData()
			const list = runtimeData.nowChat!.messageList.filter((item) => {
				if (!(item instanceof Msg)) return false
				return item.message_id === message_id
			})
			if (list.length !== 1) return null
			const msg = list[0]
			if (!(msg instanceof Msg)) return null
			return msg.preMsg
		},

		/**
		 * 下载 txt 文件并获取文件内容
		 * @param url 链接
		 */
		getTxtUrl(view: any) {
			const url = view.url
			// 保存文件为 Blob
			fetch(url)
				.then((r) => r.blob())
				.then((blob) => {
					// 读取文件内容并返回文本
					const reader = new FileReader()
					reader.readAsText(blob, 'utf-8')
					reader.onload = function () {
						// 只取前 300 字，超出部分加上 ……
						const txt = reader.result as string
						view.txt =
							txt.length > 300 ? txt.slice(0, 300) + '…' : txt
					}
				})
		},

		getMdHTML(str: string, id: string) {
			const html = this.md.render(str)
			const div = document.createElement('div')
			div.innerHTML = html
			// 二次处理 img；img 拥有这样的 alt：cornerRadius=100 #48px #48px
			const imgs = div.getElementsByTagName('img')
			for (let i = 0; i < imgs.length; i++) {
				const img = imgs[i]
				const alt = img.getAttribute('alt')
				if (alt) {
					const size = alt.split('#')
					if (size.length == 3) {
						img.style.width = size[1]
						img.style.height = size[2]
					}
				}
			}
			// 二次处理 a；去除 href
			const links = div.getElementsByTagName('a')
			for (let i = 0; i < links.length; i++) {
				const link = links[i]
				const href = link.getAttribute('href')
				if (href) {
					link.setAttribute('data-link', href)
					link.setAttribute('href', '')
					link.onclick = (e) => {
						e.preventDefault()
						openLink(href)
					}
				}
			}

			const body = document.getElementById(id)
			if (body) {
				body.innerHTML = ''
				body.appendChild(div)
			}

			return id
		},
	},
})
</script>