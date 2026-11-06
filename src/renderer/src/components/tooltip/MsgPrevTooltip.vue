<!--
 * @FileDescription: 消息预览框
 * @Author: Mr.Lee
 * @Date: 2025/09/12
 *        2026/01/01
 * @Version: 1.0
 *           2.0 重构为提示工具组件
-->
<template>
	<div ref="body" class="msg-preview ss-card">
		<template v-if="typeof msgs === 'string'">
			{{ msgs }}
		</template>
		<MsgBar
			v-else
			show-avatar
			:msgs="msgs"
			:can-interaction="false"
			:ex-info="[]"
		/>
	</div>
</template>

<script setup lang="ts">
import { Msg } from '@renderer/function/model/msg'
import MsgBar from '../MsgBar.vue'

const { msgs } = defineProps<{
	msgs: Msg[] | string
}>()
</script>

<style scoped>
.msg-preview :deep(*) {
	pointer-events: none !important;
}
.tooltip-enter-active,
.tooltip-leave-active {
	transition:
		opacity 0.2s,
		transform 0.2s;
	transform-origin: top;
}
.tooltip-enter-from,
.tooltip-leave-to {
	opacity: 0;
	transform: scaleY(0) translate(-20px, calc(-100% - 0.8rem));
}
.tooltip-enter-to,
.tooltip-leave-from {
	opacity: 1;
	transform: scaleY(1) translate(-20px, calc(-100% - 0.8rem));
}
</style>
