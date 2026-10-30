<!--
 * @FileDescription: 图片消息消息组件
 * @Author: Mr.Lee
 * @Date: 2026/01/02
 * @Version: 1.2 - 按一次性组件精简状态；占位尺寸规则下沉到 CSS
 * @Description: 图片消息的单独组件，主要用于处理图片加载完成后的消息尺寸刷新问题
-->

<template>
    <div ref="rootRef" :class="['msg-img', pos, type, state]" :style="boxStyle">
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
            :width="naturalWidth || undefined"
            :height="naturalHeight || undefined"
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
import {
    computed,
    inject,
    nextTick,
    shallowRef,
    TemplateRef,
    useTemplateRef,
} from 'vue'
import Viewer from '../Viewer.vue'

const { seg, pos } = defineProps<{
    seg: ImgSeg | MfaceSeg
    pos: 'alone' | 'top' | 'middle' | 'bottom'
}>()

const emit = defineEmits<{
    imageLoaded: [height: number]
}>()

const rootRef = useTemplateRef<HTMLDivElement>('rootRef')

const viewer: TemplateRef<undefined | InstanceType<typeof Viewer>> =
    inject('viewer')!

/**
 * 本组件是一次性的：seg / pos 挂载后不会再被替换，所以资源地址只在 setup
 * 阶段解析一次即可，不需要 computed 去追踪 props。
 */
const src = getUrl(seg.imgData.src)

/** 图片的真实像素尺寸，用于在图片解码完成前就锁定占位盒子 */
const naturalWidth = shallowRef(seg instanceof ImgSeg ? (seg.width ?? 0) : 0)
const naturalHeight = shallowRef(seg instanceof ImgSeg ? (seg.height ?? 0) : 0)

function initType(): 'image' | 'face' | 'mface' | 'long-image' {
    if (seg instanceof MfaceSeg) return 'mface'
    if (seg.isFace) return 'face'
    const w = naturalWidth.value
    const h = naturalHeight.value
    return w > 0 && h / w > 3 ? 'long-image' : 'image'
}

/** 只有会真正变化的两项才需要响应式：渲染分支与 class 切换 */
const state = shallowRef<'loading' | 'loaded' | 'error'>(
    src ? 'loading' : 'error',
)
const type = shallowRef<'image' | 'face' | 'mface' | 'long-image'>(initType())

/**
 * 只把原始像素尺寸以 CSS 变量形式下发给样式表，
 * 占位盒子的 width / aspect-ratio / 兜底尺寸全部由 msg.css 决定。
 * PS: 之前只下发 --width / --height 但样式里除表情外并没有消费它们，
 *     导致图片加载完成前盒子没有任何尺寸约束、塌陷成 icon 大小，
 *     图片就绪后又被撑开，是整个聊天列表高度突变的直接原因。
 */
const boxStyle = computed(() => {
    if (type.value !== 'image') return undefined
    const w = naturalWidth.value
    const h = naturalHeight.value
    if (!(w > 0 && h > 0)) return undefined
    return { '--img-w': `${w}`, '--img-h': `${h}` }
})

/**
 * 初始化图片尺寸信息
 */
function init() {
    const img = new Image()
    img.onload = () => {
        // 加载前的高度，用于让父级纠正滚动位置
        const beforeHeight = rootRef.value?.getBoundingClientRect().height ?? 0

        const w = img.naturalWidth || img.width
        const h = img.naturalHeight || img.height
        if (w > 0 && h > 0) {
            naturalWidth.value = w
            naturalHeight.value = h
            // 回填尺寸元数据，供其它图片组件复用，避免重复探测
            if (seg instanceof ImgSeg && !seg.width) {
                try {
                    seg.setSize(w, h)
                } catch {
                    // 尺寸已被其它实例设置，忽略即可
                }
            }
            if (h / w > 3) {
                // 长图特殊处理
                type.value = 'long-image'
            }
        }

        state.value = 'loaded'

        // 通知父级图片撑开的高度，用于纠正滚动位置
        nextTick(() => {
            const afterHeight =
                rootRef.value?.getBoundingClientRect().height ?? 0
            emit('imageLoaded', afterHeight - beforeHeight)
        })
    }

    img.onerror = () => {
        state.value = 'error'
    }

    img.src = src
}

init()

/**
 * 图片点击
 */
function imgClick() {
    viewer.value?.open(seg.imgData)
}

function getUrl(url: string): string {
    if (!url) return ''
    if (url.startsWith('http')) return url
    if (url.startsWith('data:')) return url
    if (url.startsWith('base64://')) {
        return url.replace('base64://', 'data:image/png;base64,')
    }
    throw new Error('Unsupported image url format:' + url)
}
</script>
