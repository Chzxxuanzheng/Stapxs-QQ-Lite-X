<script setup lang="ts">
import Viewer from '@renderer/components/Viewer.vue';
import { Img } from '@renderer/function/model/img';
import { LinkInfo } from '@renderer/function/utils/linkViewUtil';
import { inject } from 'vue';

const { info } = defineProps<{
	info: LinkInfo & { type: 'og' }
}>()

const viewer = inject<InstanceType<typeof Viewer>>('viewer')

/**
 * 图片点击
 * @param img
 */
function imgClick(img: string) {
	if (!viewer) return
	viewer.open(new Img(img))
}
</script>

<template>
	<div class="msg-link-view og" :class="{ large: info.large }">
		<hr class="bar" />
		<div>
			<img v-if="info.img !== undefined" alt="预览图片" title="查看图片" :src="info.img.url"
				@click="imgClick(info.img.raw)" />
			<div class="body">
				<p v-if="info.site">
					{{ info.site }}
				</p>
				<span>
					{{ info.title }}
				</span>
				<span>{{ info.desc }}</span>
			</div>
		</div>
	</div>
</template>