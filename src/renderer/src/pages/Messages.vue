<!--
 * @FileDescription: 消息列表页面
 * @Author: Stapxs
 * @Date:
 *      2022/08/14
 *      2022/12/14
 *      2025/08/02
 * @Version:
 *      1.0 - 初始版本
 *      1.5 - 重构为 ts 版本，代码格式优化
 *      2.0 - 重构为 setup 语法，将右键菜单栏拆分出去
-->

<template>
    <div>
        <div style="margin-top: 15px" />
        <header v-show="sideBarState === 'open'" class="side-bar-header">
            <div>
                <span>{{ $t('消息') }}</span>
                <div style="flex: 1" />
                <font-awesome-icon
                    :icon="['fas', 'clock-rotate-left']"
                    @click="openHistory"
                />
                <font-awesome-icon
                    :icon="['fas', 'compress-arrows-alt']"
                    @click="foldAllBox"
                />
                <font-awesome-icon
                    :icon="['fas', 'trash-can']"
                    @click="cleanList"
                />
            </div>
        </header>
        <TransitionGroup
            is="div"
            id="message-list-body"
            name="onmsg"
            tag="div"
            class="session-body-container side-bar-list"
        >
            <!-- 群收纳盒 -->
            <BoxBody
                v-if="runtimeData.sysConfig.bubble_sort_user"
                key="inMessage-bubble-box"
                v-menu.prevent="
                    (event) =>
                        openFriendMenu(
                            event.x,
                            event.y,
                            'message',
                            undefined,
                            BubbleBox.instance,
                        )
                "
                :data="markRaw(BubbleBox.instance)"
                from="message"
                @user-click="
                    (session) => changeSession(session, BubbleBox.instance)
                "
            />
            <!-- 其他消息 -->
            <template v-for="item in showSessionList">
                <FriendBody
                    v-if="item instanceof Session"
                    :key="'inMessage-' + item.id"
                    v-menu.prevent="
                        (event) =>
                            openFriendMenu(event.x, event.y, 'message', item)
                    "
                    :data="item"
                    from="message"
                    @click="changeSession(item)"
                />
                <BoxBody
                    v-else-if="item instanceof SessionBox"
                    :key="'inMessage-box-' + item.id"
                    ref="sessionBoxes"
                    v-menu.prevent="
                        (event) =>
                            openFriendMenu(
                                event.x,
                                event.y,
                                'message',
                                undefined,
                                item,
                            )
                    "
                    :data="item"
                    from="message"
                    @user-click="(session) => changeSession(session, item)"
                />
            </template>
        </TransitionGroup>
    </div>
</template>

<script setup lang="ts">
import FriendBody from '@renderer/components/FriendBody.vue'

import { library } from '@fortawesome/fontawesome-svg-core'
import useRuntimeData from '@renderer/state/runtimeData'
import { markRaw, onMounted, shallowRef, useTemplateRef, watch } from 'vue'

import {
    faCheckToSlot,
    faGripLines,
    faThumbTack,
    faTrashCan,
} from '@fortawesome/free-solid-svg-icons'
import BoxBody from '@renderer/components/BoxBody.vue'
import { BubbleBox, SessionBox } from '@renderer/function/model/box'
import { Message } from '@renderer/function/model/message'
import { Session } from '@renderer/function/model/session'
import { changeSession } from '@renderer/function/utils/msgUtil'
import { vMenu } from '@renderer/function/utils/vcmd'
import { openFriendMenu } from '@renderer/function/utils/contextMenu'
import { popBox } from '@renderer/function/utils/popBox'
import History from '@renderer/components/popBox/History.vue'
import app from '@renderer/main'

const { sideBarState } = defineProps<{
    sideBarState: 'fold' | 'open'
}>()

const showSessionList = shallowRef<(Session | SessionBox)[]>([])
const runtimeData = useRuntimeData()
// 旧群收纳盒的东西
const sessionBoxes =
    useTemplateRef<InstanceType<typeof BoxBody>[]>('sessionBoxes')

onMounted(() => {
    library.add(faCheckToSlot, faThumbTack, faTrashCan, faGripLines)
    refreshSessionList()
    // 刷新会话列表时用
    watch(() => Session.sessionList.length, refreshSessionList)
    watch(() => SessionBox.alwaysTopBoxes.size, refreshSessionList)
    watch(() => Session.alwaysTopSessions.size, refreshSessionList)
    Session.afterNewMessageHook.push((_: Session, _1: Message) => {
        refreshSessionList()
    })
})

/**
 * 刷新会话列表
 */
function refreshSessionList() {
    // 时间排序算法
    const sort = (a: Session | SessionBox, b: Session | SessionBox) => {
        // 置顶最优先
        if (a.alwaysTop && !b.alwaysTop) return -1
        if (!a.alwaysTop && b.alwaysTop) return 1
        // 按照时间戳降序
        if (a.preMessage?.time && !b.preMessage?.time) return -1
        if (!a.preMessage?.time && b.preMessage?.time) return 1
        if (a.preMessage?.time && b.preMessage?.time) {
            return b.preMessage.time.time - a.preMessage.time.time
        }
        // 按照名称首字母排序
        return a.showNamePy.localeCompare(b.showNamePy)
    }

    // 拼装置顶列表和主列表
    const mainList: (Session | SessionBox)[] = []
    const alwaysTop = [
        ...Session.alwaysTopSessions,
        ...SessionBox.alwaysTopBoxes,
    ]
    // 过滤走群收纳盒
    const putBox: Set<SessionBox> = new Set([BubbleBox.instance])

    for (const session of Session.activeSessions) {
        // 过滤掉已经置顶的会话
        if (session.alwaysTop) continue

        // 查询收纳盒
        if (session.boxes.length > 0) {
            // 如果有收纳盒，把收纳盒塞进列表里
            for (const box of session.boxes) {
                // 如果收纳盒是置顶的，就放到置顶列表里

                // 过滤已经有的收纳盒
                if (box.alwaysTop) continue
                if (putBox.has(box)) continue

                putBox.add(box)
                mainList.push(box)
            }
        } else {
            // 如果没有收纳盒，直接放入主列表
            mainList.push(session)
        }
    }
    showSessionList.value = [...alwaysTop.sort(sort), ...mainList.sort(sort)]
}

/**
 * 折叠全部收纳盒
 */
function foldAllBox() {
    if (!sessionBoxes.value) return
    for (const item of sessionBoxes.value) {
        if (!item) continue
        item.closeBox()
    }
}

/**
 * 历史记录
 */
function openHistory() {
    popBox({
        comp: History,
        svg: 'clock-rotate-left',
        title: app.config.globalProperties.$t('历史记录'),
    })
}

// /**
//  * TODO:系统通知点击事件
//  */
// function systemNoticeClick() {
//     if (runtimeData.tags.openSideBar) {
//         openLeftBar()
//     }
//     const back = {
//         type: 'user',
//         id: -10000,
//         name: '系统消息',
//     }
//     emit('userClick', back)
//     runtimeData.sysConfig.chatview_name = 'SystemNotice'
//     runOpt('chatview_name', 'SystemNotice')
// }

/**
 * 清空消息列表
 */
function cleanList() {
    // 卸载非置顶会话
    for (const item of Session.activeSessions) {
        if (item.id === runtimeData.nowChat?.id) continue
        item.unactive()
    }
}
</script>
<style>
.onmsg-enter-active,
.onmsg-leave-active,
.onmsg-move {
    transition: transform 0.4s;
}

.menu div.item > a {
    font-size: 0.9rem !important;
}
.menu div.item > svg {
    margin: 3px 10px 3px 0 !important;
    font-size: 1rem !important;
}

.msg-menu-bg {
    background: transparent !important;
}

@media (max-width: 700px) {
    .menu {
        width: 140px !important;
    }
}
</style>
