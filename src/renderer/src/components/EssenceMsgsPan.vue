<!--
 * @FileDescription: 精华消息面板
 * @Author: Mr.Lee
 * @Date: 2025/09/28
 * @Version: 1.0
-->
<template>
	<div class="ss-card jin-pan">
		<div>
			<font-awesome-icon :icon="['fas', 'message']" />
			<span>{{ $t('精华消息') }}</span>
			<font-awesome-icon
				class="reload"
				:icon="['fas', 'rotate-right']"
				@click="session.loadEssenceMsgs(false)"
			/>
			<font-awesome-icon
				class="close"
				:icon="['fas', 'xmark']"
				@click="emit('close')"
			/>
		</div>
		<div class="jin-pan-body">
			<template v-if="!session.essenceMsgLoaded">
				<div class="jin-pan-load">
					<font-awesome-icon :icon="['fas', 'spinner']" />
				</div>
			</template>
			<template v-else-if="session.essenceMsgs.length === 0">
				<div class="jin-pan-nomsg">
					<font-awesome-icon :icon="['fas', 'face-smile']" />
					<span>{{ $t('空空如也') }}</span>
				</div>
			</template>
			<template v-else>
				<div
					v-for="(item, index) in session.essenceMsgs"
					:key="'jin-' + index"
				>
					<div>
						<img :src="item.sender.face" :alt="item.sender.name" />
						<div>
							<a>{{ item.sender.name }}</a>
							<span
								>{{ item.time?.format() }}
								{{ $t('发送') }}</span
							>
						</div>
						<span>{{
							$t('{time}，由 {name} 设置', {
								time: item.operatorTime?.format(),
								name: item.operator.name,
							})
						}}</span>
					</div>
					<div class="context">
						<template
							v-for="(seg, indexc) in item.message"
							:key="'jinc-' + index + '-' + indexc"
						>
							<span v-if="seg instanceof TxtSeg">{{
								seg.text
							}}</span>
							<EmojiFace
								v-if="seg instanceof FaceSeg"
								:emoji="seg.face"
								class="msg-face"
							/>
							<img
								v-if="seg instanceof ImgSeg"
								:src="seg.src"
								:alt="'[' + $t('图片') + ']'"
								@click="viewImg(seg)"
							/>
						</template>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import { FaceSeg, ImgSeg, TxtSeg } from '@renderer/function/model/seg'
import { GroupSession } from '@renderer/function/model/session'
import EmojiFace from './EmojiFace.vue'
import { watchEffect, inject, TemplateRef } from 'vue'
import Viewer from './Viewer.vue'

const viewer: TemplateRef<undefined | InstanceType<typeof Viewer>> =
	inject('viewer')!

const { session } = defineProps<{
	session: GroupSession
}>()
const emit = defineEmits<{
	close: []
}>()

watchEffect(() => {
	if (!session.essenceMsgLoaded) session.loadEssenceMsgs()
})

function viewImg(seg: ImgSeg): void {
	if (!viewer.value) return
	viewer.value.open(seg.imgData)
}
</script>
