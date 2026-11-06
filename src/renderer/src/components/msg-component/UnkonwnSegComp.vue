<script setup lang="ts">
import { Seg } from '@renderer/function/model/seg'

const { seg: _seg } = defineProps<{
	seg: Seg
}>()
</script>

<template>
	<div class="msg-inline">{{ `(${$t('不支持的消息')}: ${seg.type})` }}</div>
</template>
