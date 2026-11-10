<!--
 * @FileDescription: 公告列表项模板
 * @Author: Stapxs
 * @Date: 2022-12-01
 * @Version: 1.0
-->

<script setup lang="ts">
import { useViewer } from '@renderer/function/composable/inject/useViewer'
import { Ann } from '@renderer/function/model/ann'
import { openLink } from '@renderer/function/utils/appUtil'
import { parseUrlFromMsg } from '@renderer/function/utils/baseUtil'
import { computed, shallowRef } from 'vue'

const { data } = defineProps<{
	data: Ann
	index: number
}>()

const viewer = useViewer()

const showAll = shallowRef(false)
const needShow = shallowRef(true)

const parsedMsg = computed(() => parseUrlFromMsg(data.content))
</script>

<template>
	<section class="bulletin" @click="showAll = !showAll">
		<header>
			<font-awesome-icon :icon="['fas', 'bookmark']" />
			<span>{{ $t('公告') }}</span>
			<div class="space" />
			<span class="time">{{ data.time.format() }}</span>
		</header>
		<div class="body" :class="{ all: showAll }">
			<div class="content">
				<template v-for="(data, id) in parsedMsg" :key="id">
					<span v-if="data.type === 'txt'">{{ data.content }}</span>
					<a
						v-else
						@click="
							openLink(
								data.content.startsWith('http')
									? data.content
									: `https://${data.content}`,
							)
						"
						class="link"
					>
						{{ data.content }}
					</a>
				</template>
			</div>
			<img
				v-if="data.img"
				:alt="'[' + $t('图片') + ']'"
				:src="data.img"
				@click.stop="viewer?.open(data.imgData!)"
			/>
		</div>
		<button v-if="needShow && !showAll">{{ $t('点击展开') }}</button>
		<footer>
			<img :src="data.sender.face" :alt="data.sender.name" />
			<a>{{ data.sender.name }}</a>
			<span class="space" />
			<span v-if="data.read !== undefined" class="read-status">
				{{
					$t('{readNum} 人已读 | {isRead}', {
						isRead: data.read ? $t('已读') : $t('未读'),
						readNum: data.readNum,
					})
				}}
			</span>
		</footer>
	</section>
</template>
