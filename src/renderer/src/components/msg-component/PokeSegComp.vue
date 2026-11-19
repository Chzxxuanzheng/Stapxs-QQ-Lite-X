<script setup lang="ts">
import { PokeSeg } from '@renderer/function/model/segs'

const { seg: _seg } = defineProps<{
	seg: PokeSeg
}>()
</script>

<template>
	<div v-once class="msg-poke">
		<font-awesome-icon
			class="poke-hand"
			style="margin-right: 5px"
			:icon="['fas', 'fa-hand-point-up']"
		/>
		{{ $t('戳了戳你') }}
	</div>
</template>
