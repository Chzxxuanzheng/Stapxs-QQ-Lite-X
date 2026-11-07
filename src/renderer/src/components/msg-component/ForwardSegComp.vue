<script setup lang="ts">
import { VueCompData } from '@renderer/function/elements/vueComp'
import { Msg } from '@renderer/function/model/msg'
import { ForwardSeg } from '@renderer/function/model/seg'
import MsgPrevTooltip from '@renderer/components/tooltip/MsgPrevTooltip.vue'
import { popInfo } from '@renderer/function/base.js'
import app from '@renderer/main.js'
import { vTooltip } from '@renderer/function/utils/vcmd'
import { useMergePan } from '@renderer/function/composable/inject/useMergePan.js'

const { seg } = defineProps<{
	seg: ForwardSeg
}>()

const $t = app.config.globalProperties.$t

const mergePan = useMergePan()

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

function openMerge() {
	if (!seg.id) {
		popInfo.error($t('请先等发送完成...'))
		return
	}
	if (!mergePan?.value) return
	mergePan.value.openMergeMsg(seg)
}
</script>

<template>
	<section
		v-tooltip="msgPrevTooltip(seg.content ?? $t('加载消息中...'))"
		class="msg-forward"
		@click="openMerge"
		:class="{ 'msg-inline': seg.inline }"
	>
		<header>{{ $t('合并转发消息') }}</header>
		<div v-if="!seg.content" class="content loading">
			<font-awesome-icon :icon="['fas', 'spinner']" />
			{{ $t('加载中') }}
		</div>
		<div v-else-if="!seg.id" class="content loading">
			<font-awesome-icon :icon="['fas', 'spinner']" />
			{{ $t('发送中') }}
		</div>
		<div v-else-if="seg.content.length > 0" class="content">
			<span v-for="(i, id) in seg.content.slice(0, 3)" :key="id">
				{{ i.sender.name }}: {{ i.plaintext() }}
			</span>
		</div>
		<div v-else class="content">
			{{ $t('加载失败') }}
		</div>
		<footer v-if="seg.content !== undefined">
			{{ $t('查看 {count} 条转发消息', { count: seg.content.length }) }}
		</footer>
		<footer v-else>
			{{ $t('聊天记录') }}
		</footer>
	</section>
</template>
