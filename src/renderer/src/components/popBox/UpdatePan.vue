<template>
	<div class="update-info">
		<span>{{ updated ? $t('更新记录') : $t('新版本') }}</span>
		<a>{{ version }}</a>
		<div class="title">
			<img :src="user.avatar" />
			<a :href="user.url">{{ user.name }}</a>
			<span>
				{{
					Intl.DateTimeFormat(getTrueLang(), {
						year: 'numeric',
						month: 'short',
						day: 'numeric',
					}).format(new Date(date))
				}}
			</span>
		</div>
		<div class="info">
			<span>{{ info.title }}</span>
			<div>
				<div
					v-for="(item, index) in info.content"
					:key="'changelog-' + index"
				>
					<span>{{ item.text }}</span>
					<div v-if="item.issue" class="log-issue">
						<span> -&gt; </span>
						<div />
						<a
							@click="
								openLink(
									`https://github.com/Chzxxuanzheng/Stapxs-QQ-Lite-X/issues/${item.issue}`,
									true,
								)
							"
							>#{{ item.issue }}</a
						>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import {
	getTrueLang,
	gitmojiToEmoji,
} from '@renderer/function/utils/systemUtil'
import { openLink } from '@renderer/function/utils/appUtil'

export default defineComponent({
	name: 'UpdatePan',
	props: ['version', 'date', 'user', 'message', 'updated'],
	data() {
		return {
			openLink,
			getTrueLang,
			info: {
				title: '' as string,
				content: [] as { [key: string]: string }[],
			},
		}
	},
	mounted() {
		const updateInfo = this.message.split('\n')
		this.info.title = updateInfo[0]
		for (let i = 1; i < updateInfo.length; i++) {
			const item = { text: '' } as { [key: string]: string }
			let text = updateInfo[i]
			if (text.startsWith(':')) {
				const end = text.substring(1).indexOf(':')
				const name = text.substring(0, end + 2)
				const emj = gitmojiToEmoji(name)
				if (emj != undefined) {
					text = text.replace(name, emj)
				}
			}
			// 匹配 issue 编号
			const regexIssue = /<- #(\d+)/
			const matchIssue = text.match(regexIssue)
			if (matchIssue) {
				const issueId = matchIssue[1]
				text = text.replace(regexIssue, '') // 删除 issue 编号
				item.issue = issueId
			}
			const regexHash = /[a-f0-9]{40}/
			const matchHash = text.match(regexHash)
			if (matchHash) {
				const hash = matchHash[0]
				// 保留前 7 位
				text = text.replace(hash, hash.substring(0, 7))
			}
			item.text = text
			this.info.content.push(item)
		}
	},
})
</script>

<style scoped>
.log-issue {
	cursor: pointer;
	display: inline-flex;
	flex-direction: row;
	align-items: center;
}
.log-issue > div {
	width: calc(0.8rem - 6px);
	height: calc(0.8rem - 6px);
	border-radius: 100%;
	outline: 3px solid var(--color-issue-close);
	margin: 0 5px;
}
.log-issue > a {
	text-decoration: underline;
	color: var(--color-issue-close);
}
</style>
