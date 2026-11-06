<script setup lang="ts">
import { ErrorSeg } from '@renderer/function/model/seg';

const { seg: _seg } = defineProps<{
	seg: ErrorSeg
}>()
</script>

<template>
	<div class="msg-inline">( {{ $t('加载失败') }} ) </div>
</template>