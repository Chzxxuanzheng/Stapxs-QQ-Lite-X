import app from '@renderer/main'
import Umami from '@stapxs/umami-logger-typescript'
import FileDownloader from 'js-file-downloader'
import semver from 'semver'
import appInfo from '../../../../../package.json'

import { KeyboardInfo } from '@capacitor/keyboard'
import { logger, popInfo } from '@renderer/function/base'
import useRuntimeData from '@renderer/state/runtimeData'
import { hslToRgb, rgbToHsl } from '@renderer/function/utils/systemUtil'
import { defineAsyncComponent, h, markRaw } from 'vue'
import { GroupSession, Session, UserSession } from '../model/session'
import { Notify } from '../notify'
import { changeSession, sendMsgRaw } from './msgUtil'

/**
 * 滚动到目标消息（不自动加载）
 * @param msg 目标消息
 * @param showAnimation 是否显示动画
 * @param showHighlight 是否高亮显示
 * @returns 跳转是否成功
 */
export function scrollToMsg(
    msg: Message,
    showAnimation: boolean = true,
    showHighlight = true,
): boolean {
    const runtimeData = useRuntimeData()
    if (msg.session === undefined) return false
    if (msg.session !== runtimeData.nowChat) return false
    if (msg.session.isActive === false) return false

    const msgDom = document.getElementById(`chat-${msg.uuid}`)
    const panDom = document.getElementById('msgPan')

    if (!msgDom) return false
    if (!panDom) return false

    // 设置滚动动画
    if (showAnimation === false) panDom.style.scrollBehavior = 'unset'
    else panDom.style.scrollBehavior = 'smooth'

    const vh = window.innerHeight / 100
    panDom.scrollTop = msgDom.offsetTop - msgDom.offsetHeight - 20 * vh
    panDom.style.scrollBehavior = 'smooth'

    // 加高亮特效
    if (showHighlight) {
        msgDom.style.transition = 'background 1s'
        msgDom.style.background = 'rgba(0, 0, 0, 0.06)'
        setTimeout(() => {
            msgDom.style.background = 'unset'
            setTimeout(() => {
                msgDom.style.transition = 'background .3s'
            }, 1100)
        }, 3000)
    }
    return true
}

/**
 * 打开链接
 * @param url 链接
 */
export function openLink(url: string, external = false) {
    // 判断是不是 Electron，是的话打开内嵌 iframe
    if (backend.isDesktop()) {
        const runtimeData = useRuntimeData()
        if (!external && !runtimeData.sysConfig.close_browser) {
            url = ProxyUrl.proxy(url)
            htmlPopBox(`<iframe src="${url}" class="view-iframe"></iframe>`, {
                full: true,
                button: [
                    {
                        text: app.config.globalProperties.$t(
                            '请不要在内嵌页面中输入敏感信息，内嵌页面并不安全。',
                        ),
                        noClose: true,
                    },
                    {
                        text: app.config.globalProperties.$t('打开…'),
                        fun: () => {
                            const shell = window.electron?.shell
                            if (shell) shell.openExternal(url)
                            else
                                backend.call(
                                    '',
                                    'sys:openInBrowser',
                                    false,
                                    url,
                                )
                        },
                    },
                    {
                        text: app.config.globalProperties.$t('关闭'),
                        master: true,
                    },
                ],
            })
        } else {
            const shell = window.electron?.shell
            if (shell) {
                shell.openExternal(url)
            } else {
                backend.call('', 'sys:openInBrowser', false, url)
            }
        }
    } else {
        window.open(url)
    }
}

/**
 * 重新加载用户列表
 * @param useCache 是否使用缓存
 */
export async function reloadUsers(useCache: boolean = true) {
    const runtimeData = useRuntimeData()
    // 加载用户列表
    if (!driver.isConnected()) return
    if (!runtimeData.nowAdapter) return

    // 保存当前会话信息
    const nowChatId = runtimeData.nowChat?.id

    // 拉取新数据
    const task: Promise<void>[] = []
    let friendData: FriendData[] | undefined
    let groupData: GroupData[] | undefined
    // 加载群组列表
    task.push(
        (async () => {
            groupData = await runtimeData.nowAdapter!.getGroupList(useCache)
        })(),
    )
    // 加载好友列表
    task.push(
        (async () => {
            friendData = await runtimeData.nowAdapter!.getFriendList(useCache)
        })(),
    )
    // 等待所有任务完成
    await Promise.all(task)

    if (!groupData || !friendData) {
        popInfo.error(
            app.config.globalProperties.$t('加载用户列表失败，请稍后再试。'),
        )
        return
    }

    // 清除旧数据
    Session.clear()
    SessionBox.clear()

    // 生成新会话
    for (const item of groupData) {
        if (!GroupSession.getSessionById(item.group_id)) {
            new GroupSession(item.group_id, item.group_name, item.member_count)
        }
    }
    for (const item of friendData) {
        if (!UserSession.getSessionById(item.user_id)) {
            new UserSession(
                item.user_id,
                item.nickname,
                item.class_id,
                item.class_name,
                item.remark,
            )
        }
    }

    // 更新菜单
    updateMenu({
        parent: 'account',
        id: 'userList',
        action: 'label',
        value: app.config.globalProperties.$t('用户列表（{count}）', {
            count: Session.sessionList.length,
        }),
    })

    // 设置置顶列表
    for (const id of runtimeData.sysConfig.pin_sessions) {
        const session = Session.getSessionById(id)
        if (!session) {
            logger.debug('未找到置顶会话：' + id)
            continue
        }
        logger.debug('设置置顶会话：' + id)
        session.setAlwaysTop(true, false)
    }

    // 加载通知开关
    const noticeList = runtimeData.sysConfig.notice_group
    if (noticeList.length > 0) {
        for (const session of GroupSession.sessionList) {
            if (!noticeList.includes(session.id)) continue
            session.setNotice(true, false)
        }
    }

    // 加载收纳盒
    SessionBox.load()

    // 更新当前会话
    if (nowChatId) {
        const session = Session.getSessionById(nowChatId)
        if (!session?.isActive) await session?.activate()
        runtimeData.nowChat = session ? markRaw(session) : session
    }
}

/**
 * 通过用户和消息 ID 跳转到对应的消息
 * @param id
 * @param msgId
 */
export function jumpToSession(session: Session, msg?: Message) {
    if (!session.isActive) session.activate()
    const runtimeData = useRuntimeData()

    // 当前聊天已经打开，是没有焦点触发的消息通知；直接滚动到消息。
    if (runtimeData.nowChat === session) {
        if (msg) scrollToMsg(msg, true)
        return
    }

    changeSession(session)
    session.activate().then(() => {
        // 跳转到对应消息
        setTimeout(() => {
            if (msg) scrollToMsg(msg, true)
        }, 500)
    })
}

/**
 * 下载文件
 * @param url 文件链接
 * @param name 文件名
 * @param onprocess 下载中回调
 * @param oncancel 取消回调
 */
export function downloadFile(
    url: ProxyUrl | string,
    name: string,
    onprocess: (event: ProgressEvent & { [key: string]: any }) => undefined,
    oncancel: (event: ProgressEvent & { [key: string]: any }) => undefined,
) {
    if (url instanceof ProxyUrl) url = url.url
    
    if (backend.isWeb()) {
        new FileDownloader({
            url: url,
            autoStart: true,
            process: onprocess,
            nameCallback: function () {
                return name
            },
        }).catch((e) => logger.error(e as Error, '下载文件失败'))
    } else {
        backend.addListener(undefined, 'sys:downloadBack', (event, data) => {
            onprocess(data || event.payload)
        })
        backend.addListener(undefined, 'sys:downloadCancel', (event, data) => {
            oncancel(data || event.payload)
        })
        backend.call(undefined, 'sys:download', false, {
            downloadPath: url,
            fileName: name,
        })
    }
}

/**
* Windows：获取加载系统主题色        setTimeout(()=>{userInfoPanData.user = undefined}, 2000)

* @param color 颜色
*/
export function updateWinColor(color: string) {
    const process = window.electron?.process
    if (process && process.platform == 'win32') {
        const red = parseInt(color.substr(0, 2), 16)
        const green = parseInt(color.substr(2, 2), 16)
        const blue = parseInt(color.substr(4, 2), 16)
        // 平衡颜色亮度
        const hsl = rgbToHsl(red, green, blue)
        if (win.darkMode) {
            hsl[2] = 0.8
        } else {
            hsl[2] = 0.3
        }
        const finalColor = hslToRgb(hsl[0], hsl[1], hsl[2])
        document.documentElement.style.setProperty(
            '--color-main',
            'rgb(' +
                finalColor[0] +
                ',' +
                finalColor[1] +
                ',' +
                finalColor[2] +
                ')',
        )
    } else {
        document.documentElement.style.setProperty(
            '--color-main',
            '#' + color.substring(0, 6) + 'CF',
        )
    }
}
export async function loadWinColor() {
    // 获取系统主题色
    updateWinColor(await backend.call(undefined, 'sys:getWinColor', true))
}

/**
 * macOS：创建应用菜单
 */
export function createMenu() {
    const { $t } = app.config.globalProperties
    // MacOS：初始化菜单
    if (backend.isDesktop()) {
        // 初始化菜单
        const menuTitles = {} as { [key: string]: string }
        menuTitles.success = $t(
            '应用显示完成，应用初始化完成！欢迎使用 {name}！',
            {
                name: $t('Stapxs QQ Lite X'),
            },
        )

        menuTitles.title = $t('Stapxs QQ Lite X')
        menuTitles.about = $t('关于') + ' ' + $t('Stapxs QQ Lite X')
        menuTitles.update = $t('检查更新…')
        menuTitles.hide = $t('隐藏') + ' ' + $t('Stapxs QQ Lite X')
        menuTitles.hideOthers = $t('隐藏其他')
        menuTitles.unhide = $t('全部显示')
        menuTitles.quit = $t('退出') + ' ' + $t('Stapxs QQ Lite X')

        menuTitles.edit = $t('编辑')
        menuTitles.undo = $t('撤销')
        menuTitles.redo = $t('重做')
        menuTitles.cut = $t('剪切')
        menuTitles.copy = $t('复制')
        menuTitles.paste = $t('粘贴')
        menuTitles.selectAll = $t('全选')

        menuTitles.account = $t('账户')
        menuTitles.login = $t('连接')
        menuTitles.logout = $t('登出')
        menuTitles.userList = $t('用户列表（{count}）', {
            count: Session.sessionList.length,
        })
        menuTitles.flushUser = $t('刷新列表…')

        menuTitles.help = $t('帮助')
        menuTitles.doc = $t('帮助文档')
        menuTitles.feedback = $t('在 Github 上反馈问题')
        menuTitles.license = $t('许可协议')

        backend.call(undefined, 'sys:createMenu', false, menuTitles)
    }
}
export function updateMenu(config: {
    parent: string
    id: string
    action: string
    value: string
}) {
    // MacOS：更新菜单
    backend.call(undefined, 'sys:updateMenu', false, config)
}

/**
 * Electron：注册系统 IPC
 */
export function createIpc() {
    const runtimeData = useRuntimeData()
    // 服务发现
    backend.addListener(undefined, 'sys:serviceFound', (event, data) => {
        const info = data ?? event.payload
        setQuickLogin(info.address, info.port)
    })
    // bot 功能
    backend.addListener(undefined, 'bot:flushUser', () => {
        reloadUsers()
        popInfo.info(app.config.globalProperties.$t('刷新用户列表成功'))
    })
    backend.addListener(undefined, 'bot:logout', () => {
        runtimeData.sysConfig.auto_connect = false
        if (!runtimeData.nowAdapter) return
        runtimeData.nowAdapter.close()
    })
    backend.addListener(undefined, 'bot:quickReply', (event, data) => {
        const info = data ?? event.payload
        const session = Session.getSessionById(info.id)
        if (!session) return
        sendMsgRaw(session, [
            new ReplySeg(String(info.msg)),
            new TxtSeg(info.content),
        ])
        // 去消息列表内寻找，去除新消息标记
        session.setRead('sender')
    })
    // 应用功能
    backend.addListener(undefined, 'app:about', () => {
        popBox({
            title:
                app.config.globalProperties.$t('关于') +
                ' ' +
                app.config.globalProperties.$t('Stapxs QQ Lite X'),
            comp: AboutPan,
            props: { showUI: false },
            allowAutoClose: false,
        })
    })
    backend.addListener(undefined, 'sys:handleUri', (event, data) => {
        logger.info(JSON.stringify(data ?? event.payload))
    })
    backend.addListener(undefined, 'app:changeTab', (event, name) => {
        window.focus()
        document
            .getElementById('bar-' + (name ?? event.payload).toLowerCase())
            ?.click()
    })
    backend.addListener(undefined, 'app:openLink', (event, link) => {
        openLink(link ?? event.payload)
    })
    backend.addListener(undefined, 'app:error', (event, text) => {
        logger.error(null, text ?? event.payload)
    })
    backend.addListener(undefined, 'app:jumpChat', (event, data) => {
        const info = data ?? event.payload
        jumpToSession(info.userId, info.msgId)
        new Notify().closeAll(info.userId)
    })
    // 后端连接模式
    backend.addListener(undefined, 'onebot:onopen', (event, data) => {
        backendWs._onOpen(data ?? event.payload)
    })
    backend.addListener(undefined, 'onebot:onmessage', (event, message) => {
        backendWs._onMessage(message ?? event.payload)
    })
    backend.addListener(undefined, 'onebot:onclose', (event, data) => {
        backendWs._onClose(data ?? event.payload)
    })
}

/**
 * Capacitor：初始化移动平台
 */
export async function loadMobile() {
    const { $t } = app.config.globalProperties
    const runtimeData = useRuntimeData()
    // Capacitor：相关初始化
    if (backend.isMobile()) {
        // 注册回调监听
        backend.addListener('Onebot', 'onebot:event', (data) => {
            const msg = JSON.parse(data.data)
            switch (data.type) {
                case 'onopen':
                    backendWs._onOpen({
                        address: runtimeData.connectInfo.address!,
                    })
                    break
                case 'onmessage':
                    backendWs._onMessage(data.data)
                    break
                case 'onclose':
                    backendWs._onClose({
                        code: msg.code,
                        message: msg.message,
                    })
                    break
                case 'onerror': {
                    backendWs._onClose({
                        code: -1,
                        message: $t('连接失败') + ': ' + msg.type,
                    })
                    break
                }
                case 'onServiceFound':
                    setQuickLogin(msg.address, msg.port)
                    break
                default:
                    break
            }
        })
        // 通知
        const permission = await backend.call(
            'LocalNotifications',
            'checkPermissions',
            true,
        )
        const permissionStr = permission || permission.display
        if (permissionStr.indexOf('prompt') != -1) {
            await backend.call(
                'LocalNotifications',
                'requestPermissions',
                false,
            )
        } else if (permissionStr.indexOf('denied') != -1) {
            logger.error(null, '通知权限已被拒绝')
            logger.system('开发者阁下为什么要拒绝通知权限的请求呢？')
        } else {
            logger.debug('通知权限已开启')
            // 注册通知类型
            backend.call('LocalNotifications', 'registerActionTypes', false, {
                types: [
                    {
                        id: 'msgQuickReply',
                        actions: [
                            {
                                id: 'REPLY_ACTION',
                                title: '快速回复',
                                requiresAuthentication: true,
                                input: true,
                                inputButtonTitle: '发送',
                                inputPlaceholder: '输入回复内容……',
                            },
                        ],
                    },
                ] as ActionType[],
            })
            // 注册相关事件
            backend.addListener(
                'LocalNotifications',
                'localNotificationActionPerformed',
                (info) => {
                    const notification =
                        info.notification as LocalNotificationSchema
                    if (info.actionId == 'tap') {
                        // PS：通知被点击后会自动被关闭，所以这里不需要处理
                        jumpToSession(
                            notification.extra.userId,
                            notification.extra.msgId,
                        )
                    } else if (info.actionId == 'REPLY_ACTION') {
                        // 快速回复
                        const session = Session.getSessionById(
                            notification.extra.userId,
                        )
                        if (!session) return
                        sendMsgRaw(session, [
                            new ReplySeg(String(notification.extra.msgId)),
                            new TxtSeg(info.inputValue ?? ''),
                        ])
                        // 去消息列表内寻找，去除新消息标记
                        session.setRead('sender')
                    }
                },
            )
        }
        // 键盘
        backend.call('Keyboard', 'setAccessoryBarVisible', false, {
            isVisible: false,
        })
        backend.call('Keyboard', 'setResizeMode', false, { mode: 'none' })
        backend.addListener(
            'Keyboard',
            'keyboardWillShow',
            async (info: KeyboardInfo) => {
                const keyboardHeight = info.keyboardHeight

                // 调整输入框高度
                const sendMore = document.getElementById('send-more')
                if (sendMore && keyboardHeight > window.innerHeight / 3) {
                    sendMore.style.paddingBottom = '10px'
                }

                const safeArea = await backend.call(
                    'SafeArea',
                    'getSafeArea',
                    true,
                )
                const tabBar = document.getElementsByTagName('ul')[0]
                // iOS 26 后键盘背景是半透明的，不能让 webview 调整高度，会漏出背景的黑色
                // 干脆把所有的 iOS 版本处理方法都改为内部避让
                if (backend.platform == 'ios') {
                    const baseApp = document.getElementById('base-app')
                    if (safeArea && baseApp) {
                        baseApp.style.setProperty(
                            '--safe-area-bottom',
                            keyboardHeight - safeArea.bottom + 100 + 'px',
                        )
                    }
                    // 调整菜单高度
                    if (safeArea && tabBar) {
                        tabBar.style.setProperty(
                            'padding-bottom',
                            keyboardHeight - safeArea.bottom + 100 + 'px',
                            'important',
                        )
                    }
                }

                // 调整整个 HTML 的高度
                // PS：仅用于解决 Android 在全屏沉浸式下键盘遮挡问题
                const html = document.getElementsByTagName('html')[0]
                if (html && backend.platform == 'android') {
                    html.style.height = `calc(100% - ${keyboardHeight + safeArea.top}px)`
                }
            },
        )
        backend.addListener('Keyboard', 'keyboardWillHide', async () => {
            const sendMore = document.getElementById('send-more')
            if (sendMore) {
                sendMore.style.paddingBottom = 'var(--safe-area-bottom)'
            }
            if (backend.platform == 'ios') {
                const baseApp = document.getElementById('base-app')
                const safeArea = await backend.call(
                    'SafeArea',
                    'getSafeArea',
                    true,
                )
                if (safeArea && baseApp) {
                    baseApp.style.setProperty(
                        '--safe-area-bottom',
                        safeArea.bottom + 'px',
                    )
                }

                const tabBar = document.getElementsByTagName('ul')[0]
                if (tabBar) {
                    tabBar.style.paddingBottom = ''
                }
            }
            // 调整整个 HTML 的高度
            // PS：仅用于解决 Android 在全屏沉浸式下键盘遮挡问题
            const html = document.getElementsByTagName('html')[0]
            if (html && backend.platform == 'android') {
                html.style.height = 'calc(100%)'
            }
        })
        // 状态栏（Android）
        backend.call('NavigationBar', 'setTransparency', false, {
            isTransparent: true,
        })
        backend.call('StatusBar', 'setOverlaysWebView', false, {
            overlay: true,
        })
        backend.call('StatusBar', 'setBackgroundColor', false, {
            color: '#ffffff00',
        })
    }
}

import {
    ActionType,
    LocalNotificationSchema,
} from '@capacitor/local-notifications'
import AboutPan from '@renderer/components/popBox/AboutPan.vue'
import { backend } from '@renderer/runtime/backend'
import { FriendData, GroupData } from '../adapter/interface'
import driver, { backendWs } from '../driver'
import { NoticeBodyV3 } from '../elements/system'
import { SessionBox } from '../model/box'
import { Message } from '../model/message'
import { ProxyUrl } from '../model/proxyUrl'
import { htmlPopBox, popBox, PopBoxButton } from './popBox'
import WelPan from '@renderer/components/popBox/WelPan.vue'
import { ReplySeg, TxtSeg } from '../model/seg'
import win from '@renderer/runtime/win'
import SvgMedal from '@renderer/components/svg/SvgMedal.vue'
import { useLocalStorage } from './vuse'
/**
 * 初始化快速连接信息
 * @param address 地址
 * @param port 端口
 */
function setQuickLogin(address: string, port: number) {
    if (loginInfo.quickLogin != null)
        loginInfo.quickLogin.push({ address: address, port: port })
}

/**
 * 检查更新
 */
export function checkUpdate() {
    if (import.meta.env.DEV) return
    if (import.meta.env.VITE_HASH) testVersionCheck()
    else stableVersionCheck()
}

interface GhCommits {
    commit: {
        message: string
    }
    html_url: string
    sha: string
}

async function testVersionCheck() {
    const runtimeData = useRuntimeData()
    const url = `https://api.github.com/repos/${runtimeData.repoName}/commits/test`
    const data: GhCommits = await fetch(url).then((response) => response.json())
    const nowHash = import.meta.env.VITE_HASH
    const latestHash = data.sha.slice(0, 7)
    if (nowHash === latestHash) return
    showTestLog(data)
}

function stableVersionCheck() {
    // 获取最新的 release 信息d
    // TODO
    // const packageUrl =
    //     'https://api.github.com/repos/chzxxuanzheng/Stapxs-QQ-Lite-X/releases/latest'
    // fetch(packageUrl).then((response) => {
    //     if (response.ok) {
    //         response.json().then((data) => {
    //             showUpdateLog(data)
    //         })
    //     }
    // })
    // localStorage.setItem('version', appInfo.version)
}

/**
 * 展示更新弹窗
 * @param data 更新数据
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function showUpdateLog(data: any) {
    const appVersion = appInfo.version // 当前版本
    const cacheVersion = useLocalStorage<undefined | string>(
        'version',
        undefined,
    ) // 缓存版本
    // 这儿有两种情况：
    //    如果当前版本小于获取到的版本就是有更新
    //    如果缓存版本小于获取到的版本但是当前版本等于获取到的版本就是更新完成首次启动
    const latestVersion = data.tag_name.substring(1)

    if (semver.lt(appVersion, latestVersion)) {
        // 有更新
        // showReleaseLog(data, false)
    }
    if (
        cacheVersion.value &&
        semver.eq(appVersion, latestVersion) &&
        semver.lt(cacheVersion.value, latestVersion)
    ) {
        // 更新完成首次启动
        // showReleaseLog(data, true)
    }
}
// function showReleaseLog(data: any, isUpdated: boolean) {
//     const { $t } = app.config.globalProperties
//     let msg = data.body
//     // 处理 title，取开头到下一个 “\r\n” 之间的内容
//     const title = msg.split('\r\n')[0].substring(1)
//     // 处理 msg，取 “## 更新内容” 到下一个 “##” 之间的内容
//     const start = msg.indexOf('## 更新内容\r\n')
//     if (start != -1) {
//         msg = msg.substring(start + 9)
//         const end = msg.indexOf('##')
//         if (end != -1) {
//             msg = msg.substring(0, end)
//         }
//     }
//     msg = title + '\r\n' + msg
//     const info = {
//         version:
//             (isUpdated ? localStorage.getItem('version') + ' -> ' : '') +
//             data.tag_name.substring(1),
//         date: data.published_at,
//         user: {
//             name: data.author.login,
//             avatar: data.author.avatar_url,
//             url: data.author.html_url,
//         },
//         message: msg,
//         updated: isUpdated,
//     }
//     const buttonGoUpdate = !backend.isWeb()
//         ? [
//               {
//                   text: $t('知道了'),
//               },
//               {
//                   text: $t('下载更新…'),
//                   master: true,
//                   noClose: true,
//                   fun: () => openLink(data.html_url, true),
//               },
//           ]
//         : [
//               {
//                   text: $t('查看…'),
//                   noClose: true,
//                   fun: () => openLink(data.html_url),
//               },
//               {
//                   text: $t('刷新页面'),
//                   master: true,
//                   fun: () => location.reload(),
//               },
//           ]
//     popBox({
//         comp: UpdatePan,
//         props: toRaw(info),
//         button: isUpdated
//             ? [
//                   {
//                       text: $t('查看…'),
//                       noClose: true,
//                       fun: () => openLink(data.html_url, true),
//                   },
//                   {
//                       text: $t('知道了'),
//                       master: true,
//                   },
//               ]
//             : buttonGoUpdate,
//     })
// }
function showTestLog(data: GhCommits) {
    const { $t } = app.config.globalProperties
    const pages = () =>
        h('div', [
            h(
                'p',
                $t('新提交: {hash}', {
                    hash: data.sha.slice(0, 7),
                }),
            ),
            h(
                'div',
                {
                    style: 'background-color: var(--color-font-r); padding: 10px; border-radius: 10px; margin-top: -10px;',
                },
                [
                    h(
                        'span',
                        {
                            style: 'white-space: pre-wrap;',
                        },
                        data.commit.message,
                    ),
                ],
            ),
        ])
    const buttonGoUpdate = !backend.isWeb()
        ? [
              {
                  text: $t('知道了'),
              },
              {
                  text: $t('下载更新…'),
                  master: true,
                  noClose: true,
                  fun: () =>
                      openLink(
                          'https://github.com/Chzxxuanzheng/Stapxs-QQ-Lite-X/actions/workflows/build-electron.yml',
                          true,
                      ),
              },
          ]
        : [
              {
                  text: $t('查看…'),
                  noClose: true,
                  fun: () => openLink(data.html_url),
              },
              {
                  text: $t('刷新页面'),
                  master: true,
                  fun: () => location.reload(),
              },
          ]
    popBox({
        comp: pages,
        svg: 'bullhorn',
        title: $t('发现测试版本更新'),
        button: buttonGoUpdate,
    })
}

const openCheckList: ((times: number) => boolean)[] = []
/**
 * 显示使用次数弹窗
 */
export function checkOpenTimes() {
    if (import.meta.env.DEV) return // 开发环境不显示
    const times = useLocalStorage('times', 0)
    for (const func of openCheckList) {
        if (func(times.value)) break
    }
    times.value += 1
}

// 使用引导
openCheckList.push((_: number) => {
    const guide = useLocalStorage('guide', 0)
    const guideVersion = 1
    if (guide.value === guideVersion) return false

    // 首次打开，显示首次打开引导信息
    popBox({
        comp: WelPan,
        allowAutoClose: false,
    })
    guide.value = guideVersion
    return true
})

// 50次ad
openCheckList.push((times: number) => {
    const { $t } = app.config.globalProperties
    const runtimeData = useRuntimeData()
    const openTimes = times + 1
    if (runtimeData.sysConfig.close_ad) return false
    if (openTimes % 50 != 0) return false

    const pages = () =>
        h(
            'div',
            {
                style: 'display:flex;flex-direction:column;padding:10px 5%;align-items:center;',
            },
            [
                h(SvgMedal),
                h(
                    'span',
                    $t('好耶！Stapxs QQ Lite X 已经被打开 {times} 次了！', {
                        times: openTimes,
                    }),
                ),
                h('span', $t('真的不去点个 star 吗 ……')),
                h('span', $t('tip: 可以去设置里禁止该弹窗')),
            ],
        )
    popBox({
        title: $t('好耶'),
        svg: 'star',
        comp: pages,
        button: [
            {
                text: $t('不要'),
            },
            {
                text: $t('好喔'),
                master: true,
                fun: () => {
                    openLink(`https://github.com/${runtimeData.repoName}`)
                },
            },
        ],
    })

    return true
})

/**
 * 显示全局公告弹窗
 */
export function checkNotice() {
    let url = 'https://lib.stapxs.cn/download/stapxs-qq-lite/notice-config.json'
    if (import.meta.env.DEV) {
        url = 'notice_local.json'
    }
    const version = 3
    const fetchData = {
        time: Date.now().toString(),
    } as Record<string, string>
    fetch(url + '?' + new URLSearchParams(fetchData).toString())
        .then((response) => response.json())
        .then((data) => {
            // 获取已显示过的公告 ID
            const noticeShow = useLocalStorage<number[]>('notice_show', [])
            // 解析公告列表
            data.forEach((notice: any) => {
                if (
                    notice.version == version &&
                    (notice.client == import.meta.env.VITE_APP_CLIENT_TAG ||
                        notice.client == 'all')
                ) {
                    const noticeBody = notice as NoticeBodyV3
                    // 当前时间戳（毫秒）
                    const now = Date.now()
                    noticeBody.show_date.forEach((dateInterval: number[]) => {
                        if (dateInterval.length == 2) {
                            // 判断是否在时间区间内
                            if (
                                now >= dateInterval[0] &&
                                now <= dateInterval[1]
                            ) {
                                noticeBody.is_show = true
                            }
                        }
                    })
                    if (
                        noticeBody.is_important == true ||
                        (noticeBody.is_show &&
                            noticeBody.id &&
                            !noticeShow.value.includes(noticeBody.id))
                    ) {
                        // 加载公告弹窗列表
                        for (let i = 0; i < noticeBody.pops.length; i++) {
                            // 添加弹窗
                            const info = noticeBody.pops[i]
                            const button: PopBoxButton[] = [
                                {
                                    text:
                                        noticeBody.pops.length > 1 &&
                                        i != noticeBody.pops.length - 1
                                            ? app.config.globalProperties.$t(
                                                  '继续',
                                              )
                                            : info.button_text
                                              ? info.button_text
                                              : app.config.globalProperties.$t(
                                                    '确定',
                                                ),

                                    master: true,
                                    fun: () => {
                                        // 添加已读记录
                                        if (
                                            !noticeShow.value.includes(
                                                noticeBody.id,
                                            ) &&
                                            !noticeBody.is_important
                                        ) {
                                            noticeShow.value = [
                                                ...noticeShow.value,
                                                noticeBody.id,
                                            ]
                                        }
                                    },
                                },
                            ]
                            if (info.link_url) {
                                button.unshift({
                                    text: app.config.globalProperties.$t(
                                        '打开…',
                                    ),
                                    master: false,
                                    noClose: true,
                                    fun: () => {
                                        if (info.link_url) {
                                            openLink(info.link_url)
                                        }
                                    },
                                })
                            }
                            if (info.html) {
                                htmlPopBox(info.html, {
                                    title: info.title,
                                    button: button,
                                })
                            } else if (info.template) {
                                popBox({
                                    title: info.title,
                                    comp: defineAsyncComponent(
                                        () =>
                                            import(
                                                `@renderer/components/notice-component/${info.template}.vue`
                                            ),
                                    ),
                                    props: markRaw(info.template_data ?? {}),
                                    button: button,
                                })
                            } else {
                                logger.error(null, '未知的公告类型')
                            }
                        }
                    }
                }
            })
        })
}

/**
 * TODO：后端代理请求模式（暂未使用）
 * @param type 请求类型
 * @param url 地址
 * @param cookies Cookies
 * @param data 数据
 */
export function BackendRequest(
    type: 'GET' | 'POST',
    url: string,
    cookies: string[],
    data: any = undefined,
) {
    backend.call(undefined, 'sys:requestHttp', false, {
        type: type,
        url: url,
        cookies: JSON.stringify(cookies),
        data: data,
    })
}

/**
 * UM：统计事件统一上传方法
 * @param event 事件名
 * @param data 数据
 */
export function sendStatEvent(event: string, data: { [key: string]: any }) {
    const runtimeData = useRuntimeData()
    if (!runtimeData.sysConfig.close_ga && !import.meta.env.DEV) {
        Umami.trackEvent(event, data)
    }
}

/**
 * UM：上报会话数据
 * @param data 数据
 */
export function sendIdentifyData(data: { [key: string]: any }) {
    const runtimeData = useRuntimeData()
    if (!runtimeData.sysConfig.close_ga && !import.meta.env.DEV) {
        Umami.trackIdentify(data)
    }
}

/**
 * 是否应该自动聚焦输入框
 * @returns
 */
export function shouldAutoFocus(): boolean {
    // 桌面端
    if (backend.type !== 'web') {
        // 除了苹果的不知道啥东西,都可以
        if (['electron'].includes(backend.type)) {
            return true
        }
        return false
    }
    // web端
    else {
        // 移动端浏览器不自动聚焦
        if (
            /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent,
            )
        ) {
            return false
        }
        return true
    }
}

/**
 * 自动将指定元素滚动到容器可见区域内
 * @param container 容器dom
 * @param element 元素dom
 */
export function fitScroll(container: HTMLElement, element: HTMLElement) {
    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()

    // 计算相对于容器的位置
    const elementTop = elementRect.top - containerRect.top + container.scrollTop
    const elementBottom = elementTop + elementRect.height

    // 如果元素在可见区域上方
    if (elementTop < container.scrollTop) {
        container.scrollTop = elementTop
    }
    // 如果元素在可见区域下方
    else if (elementBottom > container.scrollTop + container.clientHeight) {
        container.scrollTop = elementBottom - container.clientHeight
    }
}
