/**
 * important: 禁止塞对象，塞得东西必须是可以序列化成json的
 */
import languageConfig from '@renderer/assets/l10n/_l10nconfig.json'
import { refreshFavicon } from '@renderer/function/utils/favicon'
import { GroupSession, Session } from '@renderer/function/model/session'
import { BubbleBox, SessionBoxData } from '@renderer/function/model/box'
import {
    loadWinColor,
    sendIdentifyData,
    updateWinColor,
} from '@renderer/function/utils/appUtil'
import app, { i18n } from '@renderer/main'
import {
    getPortableFileLang,
    getTrueLang,
} from '@renderer/function/utils/systemUtil'
import { backend } from '@renderer/runtime/backend'
import type { OptionField } from './index'

/**
 * 配置文件声明
 */
export const OptionInfos = {
    //#region == System =================================
    address: {
        default: '',
    },
    pin_sessions: {
        default: [] as number[],
        tags: ['user'],
    },
    auto_save_password: {
        default: false,
    },
    saved_password: {
        default: '',
    },
    notice_group: {
        default: [] as number[],
        tags: ['user'],
    },
    auto_connect: {
        default: false,
    },
    boxes: {
        default: [] as SessionBoxData[],
        tags: ['user'],
    },
    session_box_map: {
        default: {} as { [sessionId: number]: string[] },
        tags: ['user'],
    }, // 存储会话被那些收纳盒收录...这俩名字起的也不行，容易混淆
    //#endregion
    //#region == View ===================================
    language: {
        default: 'zh-CN',
        onChange: (name: string) => {
            // 加载语言文件
            const lang = getPortableFileLang(name)
            i18n.global.setLocaleMessage(name, lang)
            app.config.globalProperties.$i18n.locale = name
            // 检查是否设置了备选语言
            let get = false
            for (const element of languageConfig) {
                if (element.value == name && (element as any).fallback) {
                    const fbname = (element as any).fallback
                    const fbLang = getPortableFileLang(fbname)
                    i18n.global.setLocaleMessage(fbname, fbLang)
                    get = true
                    app.config.globalProperties.$i18n.fallbackLocale = fbname
                    break
                }
            }
            if (!get) {
                app.config.globalProperties.$i18n.fallbackLocale = 'zh-CN'
            }
            // 刷新 html 语言标签
            const htmlBody = document.querySelector('html')
            if (htmlBody !== null) {
                htmlBody.setAttribute('lang', getTrueLang())
            }
            sendIdentifyData({ use_language: name })
        },
    },
    opt_dark_mode: {
        default: 'auto' as 'auto' | 'light' | 'dark',
    },
    theme_color: {
        default: 0,
        onChange: (id: number) => {
            OptionInfos.theme_color.changeColor(id, true)
        },
        onLoad: (id: number) => {
            OptionInfos.theme_color.changeColor(id, false)
        },
        changeColor(id: number, ga: boolean) {
            const COLOR_NAMES = [
                '林槐蓝',
                '墨竹青',
                '少女粉',
                '微软紫',
                '坏猫黄',
                '玄素黑',
            ]
            document.body.style.setProperty(
                '--color-main',
                'var(--color-main-' + id + ')',
            )
            const meta = document.getElementsByName('theme-color')[0]
            if (meta) {
                ;(meta as HTMLMetaElement).content = getComputedStyle(
                    document.documentElement,
                ).getPropertyValue('--color-main-' + id)
            }
            if (ga) sendIdentifyData({ use_theme_color: COLOR_NAMES[id] })
            // 避免 css 未加载完
            setTimeout(refreshFavicon, 100)
        },
    },
    opt_auto_win_color: {
        default: false,
        onChange: (value: boolean) => {
            if (!value) return
            backend.addListener(
                undefined,
                'sys:WinColorChanged',
                (_, params) => {
                    updateWinColor(params)
                },
            )
            loadWinColor()
        },
    },
    background_img: {
        default: '',
        onChange: (value: string) => {
            document.body.style.backgroundImage = value ? `url(${value})` : ''
            document.body.style.backgroundSize = 'cover'
            document.body.style.backgroundPosition = 'center'
        },
        onLoad: (value: string) => {
            OptionInfos.background_img.onChange(value)
        },
    },
    background_img_blur: {
        default: 0,
    },
    opt_fast_animation: {
        default: false,
        onChange: (value: boolean) => {
            if (value) {
                // 创建 <style> 元素
                const style = document.createElement('style')
                style.textContent = `* {
                    transition: .1s !important;
                }`
                style.id = 'disable-transitions'
                document.head.appendChild(style)
            } else {
                document.getElementById('disable-transitions')?.remove()
            }
        },
    },
    initial_scale: {
        default: 0.85,
        onChange: (value: number) => {
            const viewport = document.getElementById('viewport')
            if (viewport && value && value >= 0.5 && value <= 1.5) {
                ;(viewport as any).content =
                    `width=device-width, initial-scale=${value}, maximum-scale=5, user-scalable=0`
            } else {
                ;(viewport as any).content =
                    'width=device-width, initial-scale=0.85, maximum-scale=5, user-scalable=0'
            }
        },
    },
    fs_adaptation: {
        default: 0,
    },
    opt_always_top: {
        default: false,
        onChange: (value: boolean) => {
            backend.call(undefined, 'win:alwaysTop', false, value)
        },
    },
    merge_forward_width: {
        default: true,
        onChange: (value: boolean) => {
            document.documentElement.style.setProperty(
                '--merge-forward-width',
                value ? '17rem' : 'auto',
            )
        },
        onLoad: (value: boolean) => {
            OptionInfos.merge_forward_width.onChange(value)
        },
    },
    use_favicon_notice: {
        default: true,
        onChange: () => {
            refreshFavicon()
        },
    },
    use_super_face: {
        default: true,
    },
    hide_self_avatar: {
        default: true,
    },
    self_msg_direction: {
        default: 'right' as 'right' | 'left',
    },
    side_bar_width: {
        default: 400,
    },
    auto_hide_side_bar: {
        default: 'none' as 'none' | 'fold' | 'hide',
    },
    hide_chat_head: {
        default: false,
    },
    hide_chat_bottom: {
        default: false,
    },
    vibrancy: {
        default: false,
    },
    //#endregion
    //#region == Function ===============================
    close_notice: {
        default: true,
    },
    auto_mark_read: {
        default: 'viewer' as 'viewer' | 'sender' | 'none',
    },
    bubble_sort_user: {
        default: true,
        onChange: (value: boolean) => {
            if (value) {
                // 开启群收纳盒
                for (const session of Session.activeSessions) {
                    // 过滤置顶
                    if (session.alwaysTop) continue
                    // 过滤非群聊
                    if (!(session instanceof GroupSession)) continue
                    // 过滤已经有收纳盒的
                    if (session.boxes.length > 0) continue
                    BubbleBox.instance.putSession(session)
                }
            } else {
                // 关闭群收纳盒
                for (const session of BubbleBox.instance.content) {
                    BubbleBox.instance.removeSession(session)
                }
            }
        },
    },
    close_respond: {
        default: false,
    },
    msg_tail: {
        default: '',
    },
    group_notice_type: {
        default: 'none' as 'none' | 'inner' | 'all',
    },
    show_response_message: {
        default: 'self' as 'none' | 'self' | 'all',
    },
    send_face: {
        default: false,
    },
    send_key: {
        default: 'none' as 'none' | 'shift' | 'ctrl' | 'alt' | 'meta',
    },
    close_browser: {
        default: false,
    },
    close_ga: {
        default: false,
    },
    open_ga_bot: {
        default: true,
    },
    dont_parse_delete: {
        default: false,
    },
    hide_empty_msg: {
        default: false,
    },
    jump_forward: {
        default: true,
    },
    default_multiselect_forward: {
        default: false,
    },
    preview_notice: {
        default: false,
    },
    close_ad: {
        default: false,
    },
    reply_with_at: {
        default: 'none' as 'none' | 'prefix' | 'insert',
    },
    record_recent_emoji: {
        default: '100times' as 'none' | 'order' | '100times' | '500times',
    },
    //#endregion
    //#region == Dev ====================================
    log_level: {
        default: 'err' as 'err' | 'debug' | 'info' | 'all',
    },
    proxyUrl: {
        default: '',
    },
    debug_msg: {
        default: false,
    },
    dev_mode: {
        default: false,
    },
    //#endregion
} satisfies Record<string, OptionField<any>>
