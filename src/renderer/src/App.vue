<template>
    <!-- 顶栏 -->
    <div v-if="win.withBar" class="top-bar" name="appbar">
        <div class="space" />
        <div class="controller">
            <div class="min" @click="win.minimize()">
                <font-awesome-icon :icon="['fas', 'minus']" />
            </div>
            <div class="max" @click="win.switchMaximize()">
                <font-awesome-icon :icon="['far', 'square']" />
            </div>
            <div class="close" @click="win.close()">
                <font-awesome-icon :icon="['fas', 'xmark']" />
            </div>
        </div>
    </div>
    <!-- 拖拽区域 -->
    <div v-if="backend.platform == 'darwin'" class="controller mac-controller" />
    <div id="base-app" ref="base-app">
        <div class="main-body" :style="{
            '--side-bar-width': runtimeData.sysConfig.side_bar_width + 'px',
        }">
            <SideBar />
            <div class="main-box">
                <Chat v-if="driver.isConnected() && runtimeData.nowChat" ref="chat"
                    v-model="runtimeData.nowChat.inputMsg" :chat="runtimeData.nowChat" />
                <!-- 背景 -->
                <div v-if="!runtimeData.tags.vibrancy || !runtimeData.nowChat" v-hide="runtimeData.tags.noLogin"
                    class="main-box-bg">
                    <div class="ss-card choice-chat">
                        <template v-if="runtimeData.nowChat">
                            <font-awesome-icon :icon="['fas', 'angles-right']" />
                            <span>(っ≧ω≦)っ</span>
                            <span>{{ $t('别划了别划了被看见了啦') }}</span>
                        </template>
                        <template v-else>
                            <font-awesome-icon :icon="['fas', 'inbox']" />
                            <span>{{ $t('选择联系人开始聊天') }}</span>
                        </template>
                    </div>
                </div>
            </div>
        </div>

        <!-- 通知列表 -->
        <TransitionGroup class="app-msg" name="appmsg" tag="div">
            <div v-for="msg in popList" :key="'appmsg-' + msg.id">
                <div><font-awesome-icon :icon="['fas', msg.svg]" /></div>
                <a>{{ msg.text }}</a>
                <div v-if="!msg.autoClose" @click="popInfo.remove(msg.id)">
                    <font-awesome-icon :icon="['fas', 'xmark']" />
                </div>
            </div>
        </TransitionGroup>

        <!-- 全局搜索栏 -->
        <GlobalSessionSearchBar />
        <Viewer ref="viewer" />

        <!-- 弹窗列表 -->
        <PopBoxes />
        <!-- 菜单 -->
        <ContextMenus />
        <!-- 提示工具 -->
        <Tooltips />
        <div id="mobile-css" />
    </div>
    <div class="bg-blur" :style="{
        backdropFilter: `blur(${runtimeData.sysConfig.background_img_blur}px)`,
    }" />
</template>

<script setup lang="ts">
import Umami from '@stapxs/umami-logger-typescript'
import * as App from './function/utils/appUtil'

import { logger, popInfo, popList } from '@renderer/function/base'
import { i18n, uptime } from '@renderer/main'
import {
    nextTick,
    onMounted,
    provide,
    shallowReactive,
    shallowRef,
    useTemplateRef,
    watch,
} from 'vue'
import driver from '@renderer/function/driver'
import { Notify } from '@renderer/function/notify'
import { ensurePopBox } from '@renderer/function/utils/popBox'
import { getVersion, openLoginPan } from '@renderer/function/utils/systemUtil'

import GlobalSessionSearchBar from '@renderer/components/GlobalSessionSearchBar.vue'
import Viewer from '@renderer/components/Viewer.vue'
import { vHide } from '@renderer/function/utils/vcmd'
import {
    useBackHoldup,
    useFrame,
    useKeyboard,
} from '@renderer/function/utils/vuse'
import Chat from '@renderer/pages/Chat.vue'
import SideBar from '@renderer/pages/SideBar.vue'
import { backend } from '@renderer/runtime/backend'
import win from '@renderer/runtime/win'
import ContextMenus from '@renderer/components/menu/ContextMenus.vue'
import Tooltips from '@renderer/components/tooltip/Tooltips.vue'
import PopBoxes from '@renderer/components/popBox/PopBoxes.vue'
import useRuntimeData from './state/runtimeData'

//#region == 定义变量 ===================================================
const fps = shallowReactive({
    last: Date.now(),
    ticks: 0,
    value: 0,
})
const hasHandledPostLoginGuide = shallowRef(false)
const $t = i18n.global.t
const runtimeData = useRuntimeData()
//#endregion

//#region == 组件实例注册 ===============================================
const viewer = useTemplateRef('viewer')
const baseApp = useTemplateRef('base-app')
provide('viewer', viewer)
//#endregion

//#region == 更新标题 ===================================================
const titleList = [
    '也试试 Icalingua Plus Plus 吧！',
    '点击阅读《社交功能限制提醒》',
    '登录失败，Code 45',
    '你好世界！',
    '这只是个普通的彩蛋！',
]
if (import.meta.env.DEV) {
    document.title = 'Stapxs QQ Lite X(Dev)'
} else {
    const title = titleList[Math.floor(Math.random() * titleList.length)]
    if (backend.platform == 'web') {
        document.title = title + '- Stapxs QQ Lite X'
    } else {
        document.title = title
        backend.call(undefined, 'win:setTitle', false, title)
    }
}
//#endregion

//#region == 全局监听 ===================================================
// moYu彩蛋
window.moYu = () => {
    return '\x75\x6e\x64\x65\x66\x69\x6e\x65\x64'
}
// 页面加载完成后
onMounted(init)
window.onbeforeunload = () => {
    logger.system(
        '开发者阁下—— 唔，阁下离开的太匆忙了！让我来帮开发者阁下收拾下东西吧。',
    )
    new Notify().clear()
    runtimeData.nowAdapter?.close()
    runtimeData.nowAdapter = undefined
}

useKeyboard('f12', () => {
    if (!runtimeData.tags.dev) return
    backend.call(undefined, 'win:openDevTools', false)
})

useFrame(() => {
    if (!baseApp.value) return
    baseApp.value.scrollTop = 0
})

function getHomeState() {
    if (runtimeData.tags.noLogin) return 'login'
    if (driver.isConnected()) {
        return runtimeData.nowChat ? 'chat' : 'chat-empty'
    }
    return runtimeData.nowChat ? 'chat-stale' : 'offline-home'
}

async function logLaunchState() {
    await nextTick()
    console.log(
        `[home] state=${getHomeState()} noLogin=${String(
            runtimeData.tags.noLogin,
        )} connected=${String(driver.isConnected())} nowChat=${String(
            Boolean(runtimeData.nowChat),
        )} withBar=${String(win.withBar)} margin=${String(win.margin)}`,
    )
}

watch(
    () => runtimeData.tags.noLogin,
    async (isNoLogin, oldValue) => {
        if (isNoLogin === oldValue) return
        await logLaunchState()
        if (oldValue === true && isNoLogin === false) {
            if (!hasHandledPostLoginGuide.value) {
                hasHandledPostLoginGuide.value = true
                console.log('[guide] trigger post-login welcome flow')
                setTimeout(() => {
                    App.checkOpenTimes()
                }, 0)
            }
        }
    },
)
//#endregion

//#region == 方法函数 ===================================================
/**
 * 初始化
 */
async function init() {
    if (import.meta.env.DEV)
        // eslint-disable-next-line
        console.log(
            '[ SSystem Bootloader Complete took ' +
            (new Date().getTime() - uptime) +
            'ms, welcome to sar-dos on stapxs-qq-lite.su ]',
        )
    else
        // eslint-disable-next-line
        console.log(
            '[ SSystem Bootloader Complete took ' +
            (new Date().getTime() - uptime) +
            'ms, welcome to ssqq on stapxs-qq-lite.user ]',
        )

    // AMAP：初始化高德地图
    window._AMapSecurityConfig = import.meta.env.VITE_APP_AMAP_SECRET

    //#region == 初始化功能 =====================================
    App.createMenu() // Electron：创建菜单
    App.createIpc() // Electron：创建 IPC 通信
    // 加载开发者相关功能
    if (import.meta.env.DEV) {
        document.title = 'Stapxs QQ Lite X (Dev)'
        // FPS 检查
        rafLoop()
    }

    if (import.meta.env.DEV) {
        logger.debug(
            'stapxs-qq-lite.su:$/mnt/boot/dawnHunt/bin/core --pour /mnt/app/bin/main',
            true,
        )
        logger.system(
            '[ dawnHuntCore Version: 1.0 Beta, dawnHuntDB: 2025-04-24 ]',
        )
    } else {
        logger.debug('stapxs-qq-lite.user:$/mnt/app/bin/main', true)
    }
    logger.debug('系统配置' + runtimeData.sysConfig)

    // 基础初始化完成
    logger.system(
        '欢迎回来，开发者。Stapxs QQ Lite X 正处于 ' +
        (import.meta.env.DEV ? 'development' : 'production') +
        ' 模式。正在为您加载更多功能。',
    )
    // 加载移动平台特性
    App.loadMobile()
    // 服务发现
    backend.call('Onebot', 'sys:findService', false)
    backend.call('OneBot', 'sys:frontLoaded', false)
    //#endregion

    //#region == popstate监听 ==================================
    let askFlag = false
    const exit = useBackHoldup(async () => {
        if (askFlag) exit()
        else {
            askFlag = true
            // 离开提醒
            const ensure = await ensurePopBox(
                $t('离开 Stapxs QQ Lite X？'),
                $t('离开'),
            )
            if (ensure) exit()
            askFlag = false
        }
        return true
    })
    //#endregion

    //#region == 加载 Umami 统计功能 ============================
    if (!runtimeData.sysConfig.close_ga) {
        if (import.meta.env.DEV) {
            logger.system(
                '开发者，由于 Stapxs QQ Lite X 运行在调试模式下，分析组件并未初始化 …… 系统将无法捕获开发者阁下的访问状态，请悉知。',
            )
        } else {
            const config = {
                baseUrl: import.meta.env.VITE_APP_MU_ADDRESS,
                websiteId: import.meta.env.VITE_APP_MU_ID,
            } as any
            // 给页面添加一个来源域名方便在 electron 中获取
            if (!backend.isWeb()) {
                config.hostName = backend.type + '.stapxs.cn'
            }
            Umami.initialize(config)
            // 上报一些应用基础信息
            App.sendIdentifyData({
                app_version:
                    import.meta.env.VITE_APP_CLIENT_TAG + ',' + getVersion(),
                os_version: backend.release,
                os_arch: backend.arch,
            })
        }
    }
    //#endregion

    //#region == 公告弹窗 ======================================
    openLoginPan() // 打开登录面板
    App.checkUpdate() // 检查更新
    App.checkNotice() // 检查公告
    await logLaunchState()
    //#endregion

    if (new Date().getMonth() == 3 && new Date().getDate() == 1)
        document.getElementById('connect_btn')?.classList.add('afd')
}

/**
 * 刷新页面 fps 数据
 * @param timestamp 时间戳
 */
function rafLoop() {
    fps.ticks += 1
    //每30帧统计一次帧率
    if (fps.ticks >= 30) {
        const now = Date.now()
        const diff = now - fps.last
        const fpsValue = Math.round(1000 / (diff / fps.ticks))
        fps.last = now
        fps.ticks = 0
        fps.value = fpsValue
    }
    requestAnimationFrame(rafLoop)
}
//#endregion
</script>

<style scoped>
/* 应用通知动画 */
.appmsg-move,
.appmsg-enter-active,
.appmsg-leave-active {
    transition: all 0.2s;
}

.appmsg-leave-active {
    position: absolute;
}

.appmsg-enter-from,
.appmsg-leave-to {
    transform: translateX(-20px);
    opacity: 0;
}

/* 标题栏变更动画 */
.appbar-enter-active,
.appbar-leave-active {
    transition: all 0.2s;
}

.appbar-enter-from,
.appbar-leave-to {
    transform: translateY(-60px);
}
</style>
