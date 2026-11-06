<!--
 * @FileDescription: 可携带自定义水平分割线组件
 * @Author: Mr.Lee
 * @Date: 2025/09/26
-->

<template>
	<div class="custom-hr">
		<span />
		<slot />
		<span />
	</div>
</template>

<style scoped>
.custom-hr {
	display: flex;
	align-items: center;
	width: auto;
	--hr-color: var(--color-main);
	opacity: 0.8;
}
.custom-hr > :first-child,
.custom-hr > :last-child {
	flex: 1;
	border-bottom: var(--hr-color) 1px solid;
}
</style>
