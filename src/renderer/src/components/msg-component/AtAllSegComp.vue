<script setup lang="ts">
import { AtAllSeg } from '@renderer/function/model/segs'

const { seg: _seg, showToMe = true } = defineProps<{
	seg: AtAllSeg
	showToMe?: boolean
}>()
</script>

<template>
	<span class="msg-at msg-inline" :class="{ atme: showToMe }">
		@{{ $t('全体成员') }}
	</span>
</template>
