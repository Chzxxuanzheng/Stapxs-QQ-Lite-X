<!--
 * @FileDescription: 侧边栏系统按钮
 * @Author: Mr.Lee
 * @Date: 2025/09/18
 * @Version: 1.0
-->

<template>
	<div
		class="side-bar-button"
		:class="{
			active: active,
		}"
	>
		<div />
		<font-awesome-icon :icon="['fas', svg]" />
		<div>
			<div>
				<p>{{ name }}</p>
			</div>
			<div>
				<a>{{ desc }}</a>
				<div />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const { name, desc, svg, active } = defineProps<{
	name: string
	desc: string
	svg: string
	active: boolean
}>()
</script>
