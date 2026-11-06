<script setup lang="ts">
import { AtAllSeg } from '@renderer/function/model/seg'

const { seg: _seg, showToMe = true } = defineProps<{
	seg: AtAllSeg
	showToMe?: boolean
}>()
</script>

<template>
	<span
		:class="{
			'msg-at': true,
			atme: showToMe,
			'msg-inline': seg.inline,
		}"
	>
		@{{ $t('全体成员') }}
	</span>
</template>
