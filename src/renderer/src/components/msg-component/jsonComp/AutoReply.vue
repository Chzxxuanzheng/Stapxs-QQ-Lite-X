<template>
	<div class="msg-json self-help" v-if="success">
		<p>{{ data.title }}</p>
		<span class="reply-buttons">
			<span
				v-for="(button, index) in data.button"
				:key="index"
				class="reply-button"
				@click="sendNotify(button.action_data)"
			>
				{{ button.name }}
			</span>
		</span>
		<div class="bottom-bar">
			<font-awesome-icon icon="square-poll-horizontal" />
			<span>{{ $t('自助问答') }}</span>
		</div>
	</div>
	<span v-else class="msg-unknown">{{
		'( ' + $t('加载失败') + ': ' + seg.id + ' )'
	}}</span>
</template>

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { logger } from '@renderer/function/base'
import { AtSeg, JsonSeg, TxtSeg } from '@renderer/function/model/seg'
import { sendMsgRaw } from '@renderer/function/utils/msgUtil'
import { useCurrentMsg } from '@renderer/function/utils/vuse'
import * as z from 'zod'

const { seg } = defineProps<{
	seg: JsonSeg
}>()
const msg = useCurrentMsg()

const autoReply = z
	.object({
		app: z.literal('com.tencent.autoreply'),
		meta: z.object({
			metadata: z.object({
				buttons: z.array(
					z.object({
						action: z.literal('notify'),
						action_data: z.string(),
						name: z.string(),
						slot: z.number(),
					}),
				),
				title: z.string(),
				type: z.string(),
			}),
		}),
	})
	.transform((o) => ({
		title: o.meta.metadata.title,
		button: o.meta.metadata.buttons.map((b) => ({
			name: b.name,
			action_data: b.action_data,
		})),
	}))
const json = JSON.parse(seg.data)
const parsedData = autoReply.safeParse(json)
const success = parsedData.success
const data = parsedData.data!
if (!success) {
	logger.error(parsedData.error, 'Card Parse Error')
}

function sendNotify(content: string) {
	if (!msg?.session) return
	sendMsgRaw(msg.session, [new AtSeg(2854196310), new TxtSeg(content)])
}
</script>

<style lang="css" scoped>
.reply-buttons {
	display: flex;
	flex-direction: column;
	margin: 1ch 2ch;
}
.reply-button {
	text-decoration: underline;
	cursor: pointer;
}
</style>
