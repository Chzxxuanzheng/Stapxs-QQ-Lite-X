<!-- 借鉴于：https://github.com/dottereldesign/react_theme-switcher -->
<template>
	<button
		id="theme-switcher-grid"
		class="theme-switcher-grid"
		aria-label="Switch theme"
		:title="$t(getTitle())"
		@click="handleClick"
	>
		<div
			id="sun"
			class="sun"
			:class="{
				dark: mode === 'dark',
				auto: mode === 'auto',
				light: mode === 'light',
			}"
			aria-hidden="true"
		>
			<label>A</label>
			<div id="moon-overlay" class="moon-overlay" aria-hidden="true" />
		</div>
		<div id="ball1" class="cloud-ball cloud-ball-left" aria-hidden="true" />
		<div
			id="ball2"
			class="cloud-ball cloud-ball-middle"
			aria-hidden="true"
		/>
		<div
			id="ball3"
			class="cloud-ball cloud-ball-right"
			aria-hidden="true"
		/>
		<div id="ball4" class="cloud-ball cloud-ball-top" aria-hidden="true" />
		<div id="star1" class="star" aria-hidden="true" />
		<div id="star2" class="star" aria-hidden="true" />
		<div id="star3" class="star" aria-hidden="true" />
		<div id="star4" class="star" aria-hidden="true" />
	</button>
</template>

<script setup lang="ts">
const mode = defineModel<'light' | 'auto' | 'dark'>()

function getTitle(): string {
	switch (mode.value) {
		case 'light':
			return '亮色模式'
		case 'auto':
			return '跟随系统'
		case 'dark':
			return '暗色模式'
	}
	throw new Error('未知的亮暗模式')
}

function handleClick() {
	switch (mode.value) {
		case 'light':
			mode.value = 'auto'
			break
		case 'auto':
			mode.value = 'dark'
			break
		case 'dark':
			mode.value = 'light'
			break
	}
}
</script>

<style>
:root {
	--bg-color-light: #f0f0e8;
	--bg-color-dark: #1c2135;
	--border-color-light: #1c2135;
	--border-color-dark: #f0f0e8;
	--sun-color: #fabc1c;
	--moon-color: #fffdf2;
	--day-bg-color: #0dbdf6;
	--night-bg-color: #272a30;
	--cloud-color: #fffdf2;
	--star-color: #fffdf2;
}
</style>

<style scoped>
.theme-switcher-grid {
	display: grid;
	grid-template-columns: repeat(54, 1px);
	grid-template-rows: repeat(24, 1px);
	min-width: 45px;
	min-height: 25px;
	max-width: 45px;
	gap: 0;
	position: relative;
	background-color: var(--day-bg-color);
	border-radius: 49px;
	border: 0px solid var(--border-color-light);
	cursor: pointer;
	transition:
		background-color 0.8s ease,
		border-color 0.8s ease;
	appearance: none;
	padding: 0;
	overflow: hidden;
}

.dark .theme-switcher-grid {
	background-color: var(--night-bg-color);
	border-color: var(--border-color-dark);
}

.sun {
	position: absolute;
	border-radius: 50%;
	transition:
		background-color 0.8s ease,
		left 0.8s ease;
	height: 20px;
	width: 20px;
	transform: translate(-50%, -50%);
	background-color: var(--sun-color);
	top: 50%;
	border: 0px;
}

.sun.light {
	left: 30%;
}

.sun.auto {
	left: 50%;
}

.sun.dark {
	left: 70%;
}

.sun > label {
	position: absolute;
	opacity: 0;
	top: 50%;
	left: 50%;
	color: var(--color-font);
	z-index: 2;
	transform: translate(-50%, -50%);
	transition: opacity 0.8s ease;
}

.sun.auto > label {
	opacity: 1;
}

.dark .theme-switcher-grid .sun {
	background-color: var(--moon-color);
}

.moon-overlay {
	position: absolute;
	border-radius: 50%;
	width: 18px;
	height: 18px;
	transform: translate(-50%, -50%);
	top: 50%;
	left: -50%;
	transition:
		left 0.2s ease,
		background-color 0.8s ease;
	z-index: 1;
	background-color: var(--day-bg-color);
}

.dark .theme-switcher-grid .moon-overlay {
	display: block;
	left: 35%;
	background-color: var(--night-bg-color);
}

.cloud-ball {
	background-color: var(--cloud-color);
	border-radius: 50%;
	width: 9px;
	height: 9px;
	position: absolute;
	transition: all 0.8s ease;
	z-index: 2;
}

#ball1 {
	top: calc((8 / 24 + 0.2) * 100%);
	left: calc((12 / 54 + 0.3) * 100%);
}

#ball2 {
	top: calc((8 / 24 + 0.2) * 100%);
	left: calc((17 / 54 + 0.3) * 100%);
}

#ball3 {
	top: calc((8 / 24 + 0.2) * 100%);
	left: calc((22 / 54 + 0.3) * 100%);
}

#ball4 {
	top: calc((6 / 24 + 0.2) * 100%);
	left: calc((17 / 54 + 0.3) * 100%);
}

.dark .theme-switcher-grid #ball1 {
	top: calc((16 / 24) * 100%);
	left: calc((16 / 54) * 100%);
	width: 2px;
	height: 2px;
}

.dark .theme-switcher-grid #ball2 {
	top: calc((3 / 24) * 100%);
	left: calc((22 / 54) * 100%);
	width: 2px;
	height: 2px;
}

.dark .theme-switcher-grid #ball3 {
	top: calc((10 / 24) * 100%);
	left: calc((29 / 54) * 100%);
	width: 2px;
	height: 2px;
}

.dark .theme-switcher-grid #ball4 {
	top: calc((5 / 24) * 100%);
	left: calc((34 / 54) * 100%);
	width: 2px;
	height: 2px;
}

.star {
	background-color: var(--star-color);
	width: 1px;
	height: 1px;
	position: absolute;
	opacity: 0;
	transition: opacity 0.8s ease;
}

#star1 {
	top: calc((7 / 24) * 100%);
	left: calc((10 / 54) * 100%);
	border-radius: 50%;
}

#star2 {
	top: calc((9 / 24) * 100%);
	left: calc((16 / 54) * 100%);
	border-radius: 50%;
}

#star3 {
	top: calc((13 / 24) * 100%);
	left: calc((23 / 54) * 100%);
	border-radius: 50%;
}

#star4 {
	top: calc((18 / 24) * 100%);
	left: calc((29 / 54) * 100%);
	border-radius: 50%;
}

.dark .theme-switcher-grid #star1,
.dark .theme-switcher-grid #star2,
.dark .theme-switcher-grid #star3,
.dark .theme-switcher-grid #star4 {
	opacity: 1;
}
</style>
