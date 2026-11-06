<script setup lang="ts">
import { SuperFaceSeg } from '@renderer/function/model/seg';
import LazyLottie from '../LazyLottie.vue';

const { seg } = defineProps<{
	seg: SuperFaceSeg
}>()
</script>

<template>
	<div class="msg-super-face" style="--height: 35vh">
		<LazyLottie :animation-link="seg.face!.superValue!" :title="seg.face!.description" />
	</div>
</template>