<!--
 * @FileDescription: 图片消息消息组件
 * @Author: Mr.Lee
 * @Date: 2026/01/02
 * @Version: 1.0 - 初始版本
 * @Description: 图片消息的单独组件，主要用于处理图片加载完成后的消息尺寸刷新问题
-->

<template>
    <div
        :class="['msg-img', pos, type, state]"
        :style="{
            '--height': `${heightStyle}px`,
            '--width': `${widthStyle}px`,
        }"
    >
        <font-awesome-icon
            v-if="state === 'loading'"
            :icon="['fas', 'spinner']"
            spin
        />
        <img
            v-else-if="state === 'loaded'"
            :alt="seg.summary"
            :title="seg.summary"
            :src="src"
            @click="imgClick"
        />
        <div v-else class="fail-load">
            <font-awesome-icon :icon="['fas', 'face-frown']" />
            {{ $t('加载图片失败') }}
            <a :href="src" target="_blank">{{ $t('预览图片') }}</a>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ImgSeg, MfaceSeg } from '@renderer/function/model/seg'
import { useViewportUnits } from '@renderer/function/utils/vuse'
import { computed, inject, shallowRef, TemplateRef, watch } from 'vue'
import Viewer from '../Viewer.vue'

const state = shallowRef<'loading' | 'loaded' | 'error'>('loading')

const src = computed(() => {
    return getUrl(seg.imgData.src)
})

const viewer: TemplateRef<undefined | InstanceType<typeof Viewer>> =
    inject('viewer')!

const { vh } = useViewportUnits()
const width = shallowRef(35)
const height = shallowRef(35)

const heightStyle = computed(() => height.value * vh.value)
const widthStyle = computed(() => width.value * vh.value)

const { seg, pos } = defineProps<{
    seg: ImgSeg | MfaceSeg
    pos: 'alone' | 'top' | 'middle' | 'bottom'
}>()

let type: 'image' | 'face' | 'mface' | 'long-image' = 'image'
if (seg instanceof ImgSeg) {
    type = seg.isFace ? 'face' : 'image'
} else {
    type = 'mface'
}

const img = new Image()
img.onload = () => {
    state.value = 'loaded'
    // 更新宽高
    if (seg instanceof ImgSeg && !seg.width) {
        seg.setSize(img.width, img.height)
        recalcSize()
    }
}

img.onerror = () => {
    state.value = 'error'
}

/**
 * 初始化图片尺寸信息
 */
function init() {
    img.src = src.value
    if (seg instanceof MfaceSeg) {
        // 商场表情
        type = 'mface'
    } else {
        if (seg.isFace) type = 'face'
        if (seg.width) {
            // 信息完整的图片
            const imgWidth = seg.width!
            const imgHeight = seg.height!
            const hwRate = imgHeight / imgWidth
            if (hwRate > 3) {
                // 长图特殊处理
                type = 'long-image'
            } else if (imgHeight <= vh.value * 35) {
                width.value = imgWidth / vh.value
                height.value = imgHeight / vh.value
            }
        }
    }
}

/**
 * 当图片信息不全时，补全信息，重新计算图片尺寸
 */
function recalcSize() {
    if (!(seg instanceof ImgSeg)) throw new Error('Only ImgSeg can recalc size')
    if (!seg.width) throw new Error('Image size info is missing')

    const hwRate = seg.height! / seg.width!
    width.value = height.value / hwRate

    if (hwRate > 3) type = 'long-image'
}

/**
 * 图片点击
 * @param img
 */
function imgClick() {
    viewer.value?.open(seg.imgData)
}

watch(
    () => seg.imgData.src,
    () => {
        init()
    },
    { immediate: true },
)

function getUrl(url: string) {
    if (url.startsWith('http')) return url
    if (url.startsWith('base64://')) {
        return url.replace('base64://', 'data:image/png;base64,')
    }
    throw new Error('Unsupported image url format:' + url)
}
</script>
