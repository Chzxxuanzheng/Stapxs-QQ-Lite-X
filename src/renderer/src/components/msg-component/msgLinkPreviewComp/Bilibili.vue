<script setup lang="ts">
import { LinkInfo } from '@renderer/function/utils/linkViewUtil';
import { getTrueLang } from '@renderer/function/utils/systemUtil';

const { info } = defineProps<{
	info: LinkInfo & { type: 'bilibili' }
}>()

const trueLang = getTrueLang()

const formatNum = (num: number) => {
	if (num > 10000) return (num / 10000).toFixed(1) + ' w'
	if (num / 1000 >= 1) return (num / 1000).toFixed(1) + ' k'
	return num.toString()
}
</script>

<template>
	<div class="msg-link-view bilibili">
		<div class="user">
			<img :src="info.owner.face.url" :alt="info.owner.name" />
			<span>{{ info.owner.name }}</span>
			<span class="time">{{
				Intl.DateTimeFormat(trueLang, {
					year: 'numeric',
					month: 'numeric',
					day: 'numeric',
					hour: 'numeric',
					minute: 'numeric',
				}).format(info.publicDate,)
			}}</span>
		</div>
		<img :src="info.pic.url" :alt="'[' + $t('封面') + ']'" />
		<span class="title">{{ info.title }}</span>
		<span class="desc">{{ info.desc }}</span>
		<div class="data">
			<font-awesome-icon :icon="['fas', 'play']" />
			{{ formatNum(info.view) }}
			<font-awesome-icon :icon="['fas', 'coins']" />
			{{ formatNum(info.coin) }}
			<font-awesome-icon :icon="['fas', 'star']" />
			{{ formatNum(info.favorite) }}
			<font-awesome-icon :icon="['fas', 'thumbs-up']" />
			{{ formatNum(info.like) }}
		</div>
	</div>
</template>