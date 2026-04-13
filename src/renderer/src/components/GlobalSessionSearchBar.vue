<!--
 * @FileDescription: 快速打开会话搜索栏
 * @Author: Mr.Lee
 * @Date:
 *      2025/08/19
 * @Version:
 *      1.0 - 初始版本
 * @Description:
 *      该组件用于在全局范围内快速搜索和选择会话。
 *      通过按下 Ctrl + E 快捷键打开搜索栏，用户可以输入关键词来过滤会话列表。
 *      支持上下键选择会话，回车键确认选择。
 *      被VSC的快捷键 Ctrl + E 激励创作的
-->
<template>
    <Teleport to="body">
        <Transition name="global-session-search-bar">
            <div
                v-if="show"
                class="mask-background"
                @click.stop.prevent="close"
            >
                <div ref="content" class="global-session-search-bar ss-card">
                    <input
                        ref="input"
                        v-search="searchInfo"
                        class="ss-input"
                        :placeholder="$t('搜索 ……')"
                        @focusout="close"
                    />
                    <template v-if="showSessions.length > 0">
                        <hr />
                        <div ref="sessionList">
                            <div
                                v-for="(session, key) in showSessions"
                                :key="key"
                                :class="{
                                    'session-item': true,
                                    selected: selectId === key,
                                }"
                                @click="choiceSession(session)"
                            >
                                <TinySessionBody
                                    ref="sessionItems"
                                    :session="session"
                                />
                                <span
                                    v-if="
                                        session.id === runtimeData.nowChat?.id
                                    "
                                >
                                    {{ $t('当前会话') }}
                                </span>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { Session } from '@renderer/function/model/session'
import { changeSession } from '@renderer/function/utils/msgUtil'
import { hasPopBox } from '@renderer/function/utils/popBox'
import { vSearch } from '@renderer/function/utils/vcmd'
import { useKeyboard } from '@renderer/function/utils/vuse'
import { backend } from '@renderer/runtime/backend'
import {
    computed,
    nextTick,
    shallowReactive,
    shallowRef,
    useTemplateRef,
    watchEffect,
} from 'vue'
import TinySessionBody from './TinySessionBody.vue'
import { fitScroll } from '@renderer/function/utils/appUtil'
import useRuntimeData from '@renderer/state/runtimeData'

//#region == 常量声明 ====================================================================
const show = shallowRef<boolean>(false)
const input = useTemplateRef<HTMLInputElement>('input')
const sessionList = useTemplateRef<HTMLElement>('sessionList')
const sessionItems =
    useTemplateRef<InstanceType<typeof TinySessionBody>[]>('sessionItems')
const selectId = shallowRef<number>(0)
const runtimeData = useRuntimeData()

const searchInfo = shallowReactive({
    originList: shallowReactive([] as Session[]),
    query: shallowReactive([] as Session[]),
    isSearch: false,
})

const showSessions = computed(() => {
    return searchInfo.isSearch ? searchInfo.query : searchInfo.originList
})
// 限制selectId的范围
watchEffect(() => {
    if (selectId.value < 0) selectId.value = showSessions.value.length - 1
    if (selectId.value >= showSessions.value.length) selectId.value = 0

    // 出界滚动
    const container = sessionList.value
    const item = sessionItems.value?.[selectId.value]?.$el
    if (!container || !item) return
    nextTick(() => fitScroll(container, item))
})
//#endregion

//#region == 方法函数 ====================================================================
/**
 * 打开搜索栏
 */
function open() {
    init()
    show.value = true
    selectId.value = 0

    // 聚焦输入框
    nextTick(() => {
        input.value?.focus()
    })
}

/**
 * 关闭搜索栏
 */
function close() {
    show.value = false
    selectId.value = 0
}

/**
 * 初始化搜索框
 */
function init() {
    const sessionAtTopBox = (session: Session) => {
        return session.boxes.find((box) => box.alwaysTop) !== undefined
    }
    searchInfo.originList = shallowReactive(
        [...Session.sessionList].sort((a: Session, b: Session) => {
            // 置顶最优先
            if (a.alwaysTop && !b.alwaysTop) return -1
            if (!a.alwaysTop && b.alwaysTop) return 1
            // 收纳盒置顶次之
            if (sessionAtTopBox(a) && !sessionAtTopBox(b)) return -1
            if (!sessionAtTopBox(a) && sessionAtTopBox(b)) return 1
            // 按照时间戳降序
            if (a.preMessage?.time && !b.preMessage?.time) return -1
            if (!a.preMessage?.time && b.preMessage?.time) return 1
            if (a.preMessage?.time && b.preMessage?.time) {
                return b.preMessage.time.time - a.preMessage.time.time
            }
            // 群组优先
            if (a.type === 'group' && b.type !== 'group') return -1
            if (b.type === 'group' && a.type !== 'group') return 1
            // 按照名称首字母排序
            return a.showNamePy.localeCompare(b.showNamePy)
        }),
    )

    searchInfo.query = shallowReactive([])
    searchInfo.isSearch = false
    selectId.value = 0
}

/**
 * 选择会话
 * @param session 被选择的会话
 */
function choiceSession(session: Session) {
    changeSession(session)
    close()
}

/**
 * 根据id选择会话
 * @param id
 */
function choiceSessionById(id: number) {
    if (id < 0 || id >= showSessions.value.length) return
    choiceSession(showSessions.value[id])
}
//#endregion

//#region == 按键监听 ====================================================================
// 开启
useKeyboard('ctrl+e', () => {
    //开启
    if (show.value) return
    if (!runtimeData.nowAdapter) return
    if (hasPopBox()) return

    // macOS 使用 Command + E
    if (backend.platform === 'darwin') return
    open()
    return true
})
useKeyboard('meta+e', () => {
    //开启
    if (show.value) return
    if (!runtimeData.nowAdapter) return
    if (hasPopBox()) return

    // macOS 使用 Command + E
    if (backend.platform !== 'darwin') return
    open()
    return true
})
// 关闭
useKeyboard('escape', () => {
    if (!show.value) return
    close()
    return true
})
// 下
useKeyboard('ArrowDown', () => {
    if (!show.value) return
    selectId.value++
    return true
})
// 上
useKeyboard('ArrowUp', () => {
    if (!show.value) return
    selectId.value--
    return true
})
// 确认
useKeyboard('Enter', () => {
    if (!show.value) return
    choiceSessionById(selectId.value)
    return true
})
//#endregion
</script>
