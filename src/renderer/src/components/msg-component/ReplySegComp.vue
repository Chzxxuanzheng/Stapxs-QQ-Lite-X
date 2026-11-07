<script setup lang="ts">
import { ReplySeg } from '@renderer/function/model/seg'
import { vTooltip } from '@renderer/function/utils/vcmd'
import MsgPrevTooltip from '@renderer/components/tooltip/MsgPrevTooltip.vue'
import { Msg } from '@renderer/function/model/msg'
import { VueCompData } from '@renderer/function/elements/vueComp.js'
import { computed } from 'vue'
import { popInfo } from '@renderer/function/base.js'
import { scrollToMsg } from '@renderer/function/utils/appUtil.js'
import app from '@renderer/main.js'
import { useCurrentMsg } from '@renderer/function/composable/inject/useCurrentMsg.js'

const { seg } = defineProps<{
	seg: ReplySeg
}>()

const $t = app.config.globalProperties.$t

const msg = useCurrentMsg()

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

const replyMsg = computed(() => msg?.session?.getMsgById(seg.id))

/**
 * 滚动到指定消息
 * @param message_id 消息 id
 */
function scrollToReplyMsg() {
	if (!replyMsg.value) {
		popInfo.info($t('定位消息失败'))
		return
	}

	scrollToMsg(replyMsg.value, true)
}
</script>

<template>
	<div
		v-tooltip="
			() => msgPrevTooltip(replyMsg ? [replyMsg] : $t('加载消息失败'))
		"
		class="msg-reply"
		@click="scrollToReplyMsg()"
		:class="{ 'msg-inline': seg.inline }"
	>
		<font-awesome-icon :icon="['fas', 'reply']" />
		<span :class="{ 'msg-unknown': !replyMsg }" style="cursor: pointer">
			{{ replyMsg?.plaintext() ?? $t('（查看回复消息）') }}
		</span>
	</div>
</template>
