<!--
 * @FileDescription: 联系人 / 消息列表项模板
 * @Author: Stapxs
 * @Date: 2022/08/14
 *        2025/07/27
 * @Version: 1.0
 *           2.0 - 将会话重构为类 和 setup式（Mr.Lee）
-->

<template>
    <div
        :id="'user-' + data.id"
        class="side-bar-button"
        :class="{
            active: active,
            onmenu: onmenu,
            unmounted: from === 'message' && !data.isActive,
        }"
    >
        <div :class="{ new: data.showNotice && from === 'message' }" />
        <font-awesome-icon v-if="data.id == -10000" :icon="['fas', 'bell']" />
        <font-awesome-icon
            v-else-if="data.id == -10001"
            :icon="['fas', 'user-group']"
        />
        <img
            v-else
            loading="lazy"
            :title="data.showName"
            :alt="data.showName"
            :src="data.face"
        />
        <div>
            <div>
                <p>{{ data.showName }}</p>
                <div style="flex: 1" />
                <a v-if="data.preMessage?.time" class="time">
                    {{ data.preMessage?.time.format('hour') }}
                </a>
            </div>
            <div>
                <template v-if="from === 'message' && !data.inputMsg.isVoid">
                    <a class="highlight"> [{{ $t('草稿') }}] </a>
                    <a>{{ data.inputMsg.content }}</a>
                </template>
                <template v-else-if="from === 'message'">
                    <a
                        v-for="(item, index) in data.highlightInfo.slice(0, 2)"
                        :key="index"
                        class="highlight"
                    >
                        [{{ item }}]
                    </a>
                    <a>{{ data.preMessage?.preMsg }}</a>
                </template>
                <template v-else>
                    <div class="boxes-bar">
                        <template
                            v-for="belongBox in data.boxes"
                            :key="belongBox.id"
                        >
                            <BoxTag
                                v-if="belongBox.id !== BubbleBox.instance.id"
                                v-overflow-hide
                                :style="{ '--color': belongBox.color }"
                            >
                                {{ belongBox.showName }}
                            </BoxTag>
                        </template>
                    </div>
                </template>
                <div style="margin-left: 10px; display: flex">
                    <font-awesome-icon
                        v-if="data.alwaysTop"
                        :icon="['fas', 'thumbtack']"
                    />
                    <font-awesome-icon
                        v-if="shouldShowNotice()"
                        :icon="['fas', 'bell']"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    GroupSession,
    Session,
    UserSession,
} from '@renderer/function/model/session'
import { computed } from 'vue'

import { BubbleBox, SessionBox } from '@renderer/function/model/box'
import { vOverflowHide } from '@renderer/function/utils/vcmd'
import BoxTag from './BoxTag.vue'
import { friendMenuInfo } from '@renderer/function/utils/contextMenu'
import useRuntimeData from '@renderer/state/runtimeData'

const {
    data,
    from = 'message',
    box,
} = defineProps<{
    data: Session
    from?: 'message' | 'friend'
    box?: SessionBox
}>()

const runtimeData = useRuntimeData()

function shouldShowNotice(): boolean {
    if (!(data instanceof GroupSession)) return false
    if (runtimeData.sysConfig.group_notice_type === 'all') return false
    return data.notice
}
const active = computed(() => {
    if (from !== 'message') return false
    if (runtimeData.nowChat?.id !== data.id) return false
    return runtimeData.nowBox?.id === box?.id
})
const onmenu = computed(() => {
    if (active.value) return false
    if (!friendMenuInfo.session) return false
    if (friendMenuInfo.session.id !== data.id) return false
    return friendMenuInfo.box?.id === box?.id
})
</script>
