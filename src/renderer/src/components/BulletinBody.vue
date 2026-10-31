<!--
 * @FileDescription: 公告列表项模板
 * @Author: Stapxs
 * @Date: 2022-12-01
 * @Version: 1.0
-->

<script setup lang="ts">
import { Ann } from '@renderer/function/model/ann'
import { openLink } from '@renderer/function/utils/appUtil'
import { parseUrlFromMsg } from '@renderer/function/utils/baseUtil'
import { computed, inject, nextTick, onMounted, shallowRef } from 'vue'

const { data, index } = defineProps<{
	data: Ann,
	index: number
}>()

const viewer = inject('viewer')

const showAll = shallowRef(false)
const needShow = shallowRef(true)

const parsedMsg = computed(()=>parseUrlFromMsg(data.content))

onMounted(()=>{
	nextTick(()=>{
		const tab1 = document.getElementById('info-pan-notices')
            const tab2 = document.getElementById('info-pan-member')
            const pan = document.getElementById('bulletins-msg-' + index)
            if (pan && tab1 && tab2) {
                // PS：display none 不渲染无法获取实际高度
                tab1.click()
                const maxHeight = Number(
                    getComputedStyle(pan).maxHeight.replace('px', ''),
                )
                const height = pan.offsetHeight
                tab2.click()
                needShow.value = height == maxHeight
            }
	})
})
</script>


<template>
    <div class="base" @click="showAll = !showAll">
        <header>
            <font-awesome-icon :icon="['fas', 'bookmark']" />
            <span>{{ $t('公告') }}</span>
            <div style="flex: 1" />
            <span>{{ data.time.format() }}</span>
        </header>
        <div
            :id="'bulletins-msg-' + index"
            :class="{
                body: true,
                all: showAll,
            }"
        >
			<div class="bulletin-content">
				<template v-for="(data, id) in parsedMsg" :key="id">
					<span v-if="data.type === 'txt'">{{ data.content }}</span>
					<a v-else @click="openLink(data.content.startsWith('http') ? data.content : `https://${data.content}`)" class="link">
						{{ data.content }}
					</a>
				</template>
			</div>
            <img
                v-if="data.img"
                :alt="'[' + $t('图片') + ']'"
                :src="data.img"
                :class="{
                    img: true,
                    all: showAll,
                }"
                @click.stop="(viewer as any)?.open(data.imgData!)"
            />
        </div>
        <span v-show="needShow && !showAll">{{ $t('点击展开') }}</span>
        <div class="info">
            <img :src="data.sender.face" :alt="data.sender.name" />
            <a>{{ data.sender.name }}</a>
            <div />
            <span v-if="data.read !== undefined">{{
                $t('{readNum} 人已读 | {isRead}', {
                    isRead: data.read ? $t('已读') : $t('未读'),
                    readNum: data.readNum,
                })
            }}</span>
        </div>
    </div>
</template>