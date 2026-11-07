<template>
	<TransitionGroup name="pop-box">
		<template v-for="(pop, index) in popBoxList" :key="'pop-box-' + pop.id">
			<div
				v-hide="index !== popBoxList.length - 1"
				class="pop-box-background"
			/>
			<PopBox v-model="pop.data.model" :props="pop" />
		</template>
	</TransitionGroup>
</template>
<script setup lang="ts">
import { popBoxList } from '@renderer/function/utils/popBox'
import PopBox from '@renderer/components/popBox/PopBox.vue'
import { vHide } from '@renderer/function/utils/vcmd'
</script>
