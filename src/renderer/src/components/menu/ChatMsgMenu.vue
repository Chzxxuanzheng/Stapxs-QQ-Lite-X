<template>
	<div data-animation-name="chat-menu">
		<div
			v-if="session instanceof GroupSession"
			v-show="!runtimeData.sysConfig.close_respond"
			class="ss-card respond"
			:class="{
				open: unfoldResponse,
			}"
		>
			<div
				@wheel="
					!unfoldResponse
						? (($event.currentTarget as HTMLElement).scrollLeft +=
								$event.deltaY)
						: ''
				"
			>
				<EmojiFace
					v-for="num in Emoji.responseId"
					:key="'respond-' + num"
					:emoji="Emoji.get(num)"
					@click="changeRespond(String(num), msg)"
				/>
			</div>
			<font-awesome-icon
				:icon="['fas', 'angle-up']"
				@click="unfoldResponse = true"
			/>
		</div>
		<span id="anchor" @click.stop />
		<div class="ss-card msg-menu-body">
			<div v-if="menuDisplay.add" @click="forwardSelf()">
				<div><font-awesome-icon :icon="['fas', 'plus']" /></div>
				<a>{{ $t('+ 1') }}</a>
			</div>
			<div v-if="menuDisplay.reply" @click="menuReplyMsg(true)">
				<div><font-awesome-icon :icon="['fas', 'message']" /></div>
				<a>{{ $t('回复') }}</a>
			</div>
			<div v-if="menuDisplay.forward" @click="showForWard()">
				<div><font-awesome-icon :icon="['fas', 'share']" /></div>
				<a>{{ $t('转发') }}</a>
			</div>
			<div v-if="menuDisplay.select" @click="intoMultipleSelect()">
				<div><font-awesome-icon :icon="['fas', 'circle-check']" /></div>
				<a>{{ $t('多选') }}</a>
			</div>
			<div v-if="menuDisplay.copy" @click="copyMsg">
				<div><font-awesome-icon :icon="['fas', 'clipboard']" /></div>
				<a>{{ $t('复制') }}</a>
			</div>
			<div v-if="menuDisplay.copySelect" @click="copySelectMsg">
				<div><font-awesome-icon :icon="['fas', 'code']" /></div>
				<a>{{ $t('复制选中文本') }}</a>
			</div>
			<div v-if="menuDisplay.copyImg" @click="copyImg">
				<div>
					<font-awesome-icon :icon="['fas', 'object-ungroup']" />
				</div>
				<a>{{ $t('复制图片') }}</a>
			</div>
			<div v-if="menuDisplay.downloadImg != false" @click="downloadImg">
				<div><font-awesome-icon :icon="['fas', 'floppy-disk']" /></div>
				<a>{{ $t('下载图片') }}</a>
			</div>
			<div v-if="menuDisplay.recall" @click="recallMsg">
				<div><font-awesome-icon :icon="['fas', 'xmark']" /></div>
				<a>{{ $t('撤回') }}</a>
			</div>
			<div v-if="menuDisplay.reedit" @click="reedit">
				<div><font-awesome-icon :icon="['fas', 'pencil']" /></div>
				<a>{{ $t('重新编辑') }}</a>
			</div>
			<div v-if="menuDisplay.delete" @click="deleteMsg">
				<div>
					<font-awesome-icon
						:icon="['fas', 'fa-trash']"
						style="color: var(--color-red)"
					/>
				</div>
				<a>{{ $t('删除') }}</a>
			</div>
			<div v-if="menuDisplay.dev" @click="consoleLogMsg">
				<div>
					<font-awesome-icon :icon="['fas', 'screwdriver-wrench']" />
				</div>
				<a>{{ $t('调试信息') }}</a>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { popInfo } from '@renderer/function/base'
import { MenuEventData } from '@renderer/function/elements/information'
import Emoji from '@renderer/function/model/emoji'
import { Msg } from '@renderer/function/model/msg'
import { GroupSession, Session } from '@renderer/function/model/session'
import { downloadFile } from '@renderer/function/utils/appUtil'
import { sendMsgRaw, singleForward } from '@renderer/function/utils/msgUtil'
import { copyToClipboard } from '@renderer/function/utils/systemUtil'
import app from '@renderer/main'
import { shallowReactive, shallowRef } from 'vue'
import EmojiFace from '@renderer/components/EmojiFace.vue'
import useRuntimeData from '@renderer/state/runtimeData'
import { ensurePopBox } from '@renderer/function/utils/popBox'

//#region == 变量声明 ==================================================

const {
	session,
	msg,
	eventData,
	changeRespondFunc,
	replyMsgFunc,
	intoMultiselectFunc,
} = defineProps<{
	session?: Session
	msg: Msg
	eventData: MenuEventData
	changeRespondFunc?: (id: string, msg: Msg) => void
	replyMsgFunc?: (msg: Msg) => void
	intoMultiselectFunc: (msg: Msg) => void
}>()

const emit = defineEmits<{
	close: [arg?: any]
}>()

const runtimeData = useRuntimeData()

const $t = app.config.globalProperties.$t
const unfoldResponse = shallowRef<boolean>(false)

const selectCache = shallowRef<string>('')
const imgUrl = shallowRef<string>('')

const menuDisplay = shallowReactive({
	recall: false,
	reply: true,
	copySelect: false,
	forward: true,
	add: true,
	copyImg: false,
	dev: false,
	delete: true,
	downloadImg: false,
	select: true,
	copy: true,
	reedit: false,
})
//#endregion

init()

//#region == 方法 =====================================================
function init(): void {
	// 撤回
	menuDisplay.recall = msg.canRecall()
	// 重新编辑
	menuDisplay.reedit =
		msg.canRecall() && msg.sender.user_id === runtimeData.loginInfo?.uin

	// 消息不存在,但还可以多选和转发(x)
	if (!msg.exist) {
		// 已被撤回的自己的消息只显示复制
		menuDisplay.reply = false
		menuDisplay.recall = false
	}

	const selection = document.getSelection()
	const textBody = selection?.anchorNode?.parentElement
	const textMsg = null as HTMLElement | null
	const targetDom = eventData.target

	if (
		textMsg &&
		textMsg.id == targetDom.id &&
		textBody &&
		textBody.className.includes('msg-text') &&
		selection.focusNode == selection.anchorNode
	) {
		// 用于判定是否选中了 msg-text 且开始和结束是同一个 Node（防止跨消息复制）
		selectCache.value = selection.toString()
		if (selectCache.value.length > 0) {
			menuDisplay.copySelect = true
		}
	}
	// 不能转发卡片消息
	// TODO: 有卡片签名的客户端适配
	if (msg.hasCard()) {
		// 如果包含以上消息类型，不能转发
		menuDisplay.forward = false
		menuDisplay.add = false
	}

	// 图片相关
	if (targetDom instanceof HTMLImageElement && targetDom.src.length > 0) {
		// 右击图片需要显示的内容，这边特例设置为链接
		imgUrl.value = (targetDom as HTMLImageElement).src
		if (runtimeData.tags.canCors) menuDisplay.copyImg = true
	}

	// 开发者工具
	menuDisplay.dev = runtimeData.tags.dev

	// 要求会话的
	if (!session) {
		menuDisplay.add = false
		menuDisplay.reply = false
		menuDisplay.delete = false
	}
}

/**
 * 设置表情回应
 * @param id 表情id
 * @param respondedMsg 消息
 */
function changeRespond(id: string, respondedMsg: Msg) {
	changeRespondFunc!(id, respondedMsg)
	emit('close')
}

/**
 * +1
 */
function forwardSelf() {
	sendMsgRaw(
		session!,
		msg.message.map((item) => item.copy()),
	)
	emit('close')
}
/**
 * 回复
 * @param closeMenu 是否关闭消息菜单
 */
function menuReplyMsg(closeMenu = true) {
	replyMsgFunc!(msg)
	// 关闭消息菜单
	if (closeMenu) {
		emit('close')
	}
}
/**
 * 转发
 */
function showForWard() {
	singleForward([msg])
	emit('close')
}
/**
 * 多选
 */
function intoMultipleSelect() {
	intoMultiselectFunc(msg)
	emit('close')
}
/**
 * 复制选中的消息
 */
function copyMsg() {
	copyToClipboard(msg.plaintext())
		.then(() => popInfo.info($t('复制成功')))
		.catch(() => popInfo.error($t('复制失败')))

	emit('close')
}
/**
 * 复制缓存的选中的文本
 */
function copySelectMsg() {
	if (selectCache.value === '') return

	copyToClipboard(selectCache.value)
		.then(() => popInfo.info($t('复制成功')))
		.catch(() => popInfo.error($t('复制失败')))

	emit('close')
}
/**
 * 复制图片
 */
async function copyImg() {
	if (!menuDisplay.downloadImg) return

	// 关闭菜单
	emit('close')

	// 类型白名单
	const typeWhiteList = ['image/png', 'image/svg+xml']

	// 获取图片数据
	const response = await fetch(imgUrl.value)
	let blob = await response.blob()

	// 乱七八糟浏览器不一定支持的格式统统转png
	if (!typeWhiteList.includes(blob.type)) {
		// 创建 canvas 来转换格式
		const img = new Image()
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d')

		await new Promise((resolve, reject) => {
			img.onload = resolve
			img.onerror = reject
			img.src = URL.createObjectURL(blob)
		})

		canvas.width = img.width
		canvas.height = img.height
		ctx?.drawImage(img, 0, 0)

		// 转换为 PNG blob
		blob = await new Promise((resolve) => {
			canvas.toBlob((re) => {
				resolve(re as Blob)
			}, 'image/png')
		})

		URL.revokeObjectURL(img.src)
	}
	const item = new ClipboardItem({ [blob.type]: blob })
	try {
		await copyToClipboard([item])
		popInfo.info($t('复制成功'))
	} catch {
		/**/
	}
}
/**
 * 下载选中的图片
 */
function downloadImg() {
	emit('close')
	downloadFile(
		imgUrl.value,
		'img.png',
		() => undefined,
		() => undefined,
	)
}
/**
 * 撤回消息
 */
async function recallMsg() {
	if (!runtimeData.nowAdapter?.recallMsg) {
		popInfo.error($t('当前适配器不支持撤回消息'))
		return
	}

	// 关闭消息菜单
	emit('close')

	await runtimeData.nowAdapter.recallMsg(msg as Msg)
}
/**
 * 重新编辑消息
 */
async function reedit() {
	if (!runtimeData.nowAdapter?.recallMsg) {
		popInfo.error($t('当前适配器不支持重新编辑消息'))
		return
	}

	// 关闭消息菜单
	emit('close')

	if (!(msg instanceof Msg)) {
		popInfo.error($t('消息数据异常'))
		return
	}

	if (!msg.session) {
		popInfo.error($t('获取消息会话失败'))
		return
	}

	msg.session.inputMsg.reeditFromMsg(msg)

	await runtimeData.nowAdapter.recallMsg(msg)
}
/**
 * 删除消息
 */
async function deleteMsg() {
	emit('close')

	if (!(await ensurePopBox($t('要删除这条消息吗？')))) return
	session!.removeMsg(msg)
}
function consoleLogMsg() {
	// oxlint-disable-next-line no-console
	console.log(msg)
}
//#endregion
</script>
