<template>
	<ul class="update-record-git">
		<li v-for="item in info" :key="item.hash" class="ss-card">
			<header>
				<span :class="item.type" class="commit-type">
					<font-awesome-icon
						:icon="['fas', typeMap[item.type].icon]"
					/>
					{{ $t(typeMap[item.type].name) }}
				</span>
				<span class="commit-content">{{ item.content }}</span>
			</header>
			<hr />
			<div>
				<a
					class="commit-hash"
					:href="`${baseUrl}/commit/${item.hash}`"
					target="_blank"
				>
					{{ item.hash.slice(0, 7) }}
				</a>
				<span class="commit-info">
					{{ item.author }}
					{{ formatPassDate(Date.now() - item.date * 1000) }}
				</span>
			</div>
		</li>
		<span class="more">
			前往<a :href="`${baseUrl}/commits`" target="_blank">仓库</a
			>查看更多更新纪录
		</span>
	</ul>
</template>

<script setup lang="ts">
import info from 'virtual:update-record'

const baseUrl = `https://github.com/${import.meta.env.VITE_APP_REPO_NAME}`
/**
 * 将时间戳转换为人类可读的格式
 * @param time 时间戳，单位为毫秒
 * @returns
 */
function formatPassDate(time: number) {
	if (time > 365 * 24 * 60 * 60 * 1000) {
		return `${Math.floor(time / (365 * 24 * 60 * 60 * 1000))}年前`
	} else if (time > 30 * 24 * 60 * 60 * 1000) {
		return `${Math.floor(time / (30 * 24 * 60 * 60 * 1000))}月前`
	} else if (time > 24 * 60 * 60 * 1000) {
		return `${Math.floor(time / (24 * 60 * 60 * 1000))}天前`
	} else if (time > 60 * 60 * 1000) {
		return `${Math.floor(time / (60 * 60 * 1000))}小时前`
	} else if (time > 60 * 1000) {
		return `${Math.floor(time / (60 * 1000))}分钟前`
	} else {
		return `${Math.floor(time / 1000)}秒前`
	}
}

const typeMap: Record<
	(typeof info)[0]['type'],
	{
		icon: string
		name: string
	}
> = {
	feat: {
		icon: 'lightbulb',
		name: '特性',
	},
	fix: {
		icon: 'bug',
		name: '修复',
	},
	docs: {
		icon: 'book',
		name: '文档',
	},
	style: {
		icon: 'palette',
		name: '样式',
	},
	refactor: {
		icon: 'hammer',
		name: '重构',
	},
	perf: {
		icon: 'tachometer-alt',
		name: '优化',
	},
	test: {
		icon: 'vial',
		name: '测试',
	},
	ci: {
		icon: 'diagram-project',
		name: 'CI',
	},
	chore: {
		icon: 'wrench',
		name: '杂项',
	},
	revert: {
		icon: 'undo',
		name: '撤回',
	},
	unknown: {
		icon: 'question-circle',
		name: '未知',
	},
}
</script>
