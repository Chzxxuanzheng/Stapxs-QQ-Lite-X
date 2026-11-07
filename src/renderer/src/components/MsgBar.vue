<!--
 * @FileDescription: 消息栏，用于绘制 MsgBody 和 NoticeBody
 * @Author: Mr.Lee
 * @Date: 2025/07/07
 * @Version: 1.0
-->
<template>
	<TransitionGroup
		:name="runtimeData.sysConfig.opt_fast_animation ? '' : 'msglist'"
		:class="{
			'disable-interaction':
				!config.allowInteraction || multiselect?.active,
		}"
		tag="div"
	>
		<template v-for="(message, index) in msgs">
			<!-- 时间戳 -->
			<NoticeBody
				v-if="
					message.time &&
					isShowTime(
						msgs.at(index - 1)?.time?.time,
						message.time.time,
					)
				"
				:key="
					'notice-time-' + (message.time.time / (4 * 60)).toFixed(0)
				"
				:data="SystemNotice.time(message.time.time)"
			/>
			<!-- [已删除]消息 -->
			<NoticeBody
				v-if="
					!runtimeData.sysConfig.dont_parse_delete &&
					message instanceof Msg &&
					message.isDelete
				"
				:key="'delete-' + message.uuid"
				:data="SystemNotice.delete()"
			/>
			<!-- 消息体 -->
			<MsgBody
				v-else-if="message instanceof Msg"
				:key="'msg-' + message.uuid"
				:msg="message"
				:multiselect-state="multiselect"
				:config="config"
				@click="msgClick(message)"
				@image-loaded="(arg) => $emit('imageLoaded', arg)"
				@left-move="(arg) => $emit('leftMove', arg)"
				@right-move="(arg) => $emit('rightMove', arg)"
				@sender-double-click="(arg) => $emit('senderDoubleClick', arg)"
				@emoji-click="(id, msg) => $emit('emojiClick', id, msg)"
			/>
			<!-- 其他通知消息 -->
			<NoticeBody
				v-else-if="message instanceof Notice"
				:id="message.uuid"
				:key="'notice-' + index"
				:data="message"
			/>
		</template>
	</TransitionGroup>
</template>
<script setup lang="ts">
import MsgBody from '@renderer/components/MsgBody.vue'
import NoticeBody from '@renderer/components/NoticeBody.vue'

import { Message } from '@renderer/function/model/message'
import { Msg } from '@renderer/function/model/msg'
import { Notice, SystemNotice } from '@renderer/function/model/notice'
import { IUser } from '@renderer/function/model/user'
import { isShowTime } from '@renderer/function/utils/msgUtil'
import useRuntimeData from '@renderer/state/runtimeData'
import useMsgsConfigState, {
	MsgsConfig,
} from '@renderer/function/composable/scopedState/msgsConfig'
import { MultiselectState } from '@renderer/function/composable/scopedState/multiselect'

const {
	msgs,
	config = useMsgsConfigState({}),
	multiselectState: multiselect,
} = defineProps<{
	msgs: Message[]
	config?: MsgsConfig
	multiselectState?: MultiselectState
}>()

const emit = defineEmits<{
	imageLoaded: [height: number]
	leftMove: [msg: Msg]
	rightMove: [msg: Msg]
	senderDoubleClick: [user: IUser]
	emojiClick: [id: string, msg: Msg]
}>()

const runtimeData = useRuntimeData()

defineExpose({
	getConfig,
	getMultiselectState,
})

function msgClick(msg: Msg) {
	if (multiselect?.active) multiselect.toggleSelect(msg)
}

function getConfig(): MsgsConfig {
	return config
}

function getMultiselectState(): MultiselectState | undefined {
	return multiselect
}
</script>
<style scoped>
/* 消息动画 */
.msglist-move {
	transition: all 0.3s;
}

.msglist-enter-active {
	transition: all 0.4s;
}

.msglist-leave-active {
	transition: all 0.2s;
}

.msglist-enter-from {
	transform: translateX(-20px);
	opacity: 0;
}

.msglist-leave-to {
	opacity: 0;
}

.disable-interaction :deep(*) {
	pointer-events: none;
}
.disable-interaction {
	pointer-events: auto;
}
.disable-interaction > div {
	pointer-events: auto;
}
</style>
