<template>
	<button
		class="switch-button"
		:class="{ on: value }"
		@click="value = !value"
	>
		<div class="ball" />
	</button>
</template>

<script setup lang="ts">
const value = defineModel<boolean>()
</script>

<style scoped>
.switch-button {
	position: relative;
	min-width: 45px;
	min-height: 25px;
	background-color: var(--color-card-1);
	border: none;
	border-radius: 25px;
	transition: background-color 0.4s ease;
}

.switch-button.on {
	background-color: var(--color-main);
}

.ball {
	width: 13px;
	height: 13px;
	transform: translate(-50%, -50%);
	position: absolute;
	border: 4px solid var(--color-font-r);
	border-radius: 20px;
	background-color: var(--color-main);
	left: 13px;
	box-shadow: 0 0 5px var(--color-shader);
	transition: left 0.4s ease;
}

.switch-button.on > .ball {
	left: calc(100% - 13px);
}
</style>
