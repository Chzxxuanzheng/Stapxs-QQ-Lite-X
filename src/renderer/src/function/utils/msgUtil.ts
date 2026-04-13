// import { animate } from 'animejs'

import useRuntimeData from '@renderer/state/runtimeData'
import { Msg, SelfMsg } from '../model/msg'
import { Seg } from '../model/seg'
import { GroupSession, Session, UserSession } from '../model/session'
import { IUser } from '../model/user'
import { BubbleBox, SessionBox } from '../model/box'
import { popBox } from './popBox'
import app from '@renderer/main'
import { backend } from '@renderer/runtime/backend'
import { useSessionHistoryStore } from '@renderer/state/sessionHistory'

/**
 * 发送消息
 * @param session 目标会话
 * @param msg 消息体
 */
export function sendMsgRaw(session: Session, msg: Seg[]): SelfMsg {
    // 预览消息 =======================================================
    const preMsg = SelfMsg.create(msg, session)
    // 添加进会话
    session.addMessage(preMsg)
    // 发送消息
    preMsg.send()
    return preMsg
}

// /**
//  * 戳一戳触发动画
//  * @param animeBody 动画作用的元素
//  * @param windowInfo 窗口信息，在 electron 中使用
//  */
// export function pokeAnime(
//     animeBody: HTMLElement | null,
//     windowInfo = null as {
//         x: number
//         y: number
//         width: number
//         height: number
//     } | null,
// ) {
//     if (!animeBody) return
//     if (animeBody) {
//         const timeLine = anime.timeline({ targets: animeBody })
//         // 如果窗口小于 500px 播放完整的动画（手机端样式）
//         if ((document.getElementById('app')?.offsetWidth ?? 500) < 500) {
//             navigator.vibrate([10, 740, 10])
//             timeLine
//                 .add({
//                     translateX: 30,
//                     duration: 600,
//                     easing: 'cubicBezier(.44,.09,.53,1)',
//                 })
//                 .add({
//                     translateX: 0,
//                     duration: 150,
//                     easing: 'cubicBezier(.44,.09,.53,1)',
//                 })
//                 .add({
//                     translateX: [0, 25, 0],
//                     duration: 500,
//                     easing: 'cubicBezier(.21,.27,.82,.67)',
//                 })
//                 .add({ targets: {}, duration: 1000 })
//                 .add({
//                     translateX: 70,
//                     duration: 1300,
//                     easing: 'cubicBezier(.89,.72,.72,1.13)',
//                 })
//                 .add({ translateX: 0, duration: 100, easing: 'easeOutSine' })
//         }
//         timeLine.add({
//             translateX: [-10, 10, -5, 5, 0],
//             duration: 500,
//             easing: 'cubicBezier(.44,.09,.53,1)',
//         })
//         timeLine.change = async () => {
//             if (animeBody) {
//                 animeBody.parentElement?.parentElement?.classList.add('poking')
//                 const teansformX = animeBody.style.transform
//                 // teansformX 的数字可能是科学计数法，需要转换为普通数字
//                 let num = Number((teansformX.match(/-?\d+\.?\d*/g) ?? [0])[0])
//                 // 取整
//                 num = Math.round(num)
//                 // 输出 translateX
//                 if (backend.isDesktop() && windowInfo) {
//                     await backend.call(undefined, 'win:move', false, {
//                         x: windowInfo.x + num,
//                         y: windowInfo.y,
//                     })
//                 }
//             }
//         }
//         timeLine.changeComplete = () => {
//             if (animeBody) {
//                 animeBody.parentElement?.parentElement?.classList.remove(
//                     'poking',
//                 )
//             }
//         }
//     }
// }

/**
 * 判断是否需要显示时间戳（上下超过五分钟的消息）
 * @param timePrv 上条消息的时间戳（13 位）
 * @param timeNow 当前消息的时间戳（13 位）
 */
export function isShowTime(
    timePrv: number | undefined,
    timeNow: number | undefined,
    alwaysShow = false,
): boolean {
    if (alwaysShow) return true
    if (!timePrv || !timeNow) return false
    // 五分钟 13 位时间戳相差 300 000
    return timeNow - timePrv >= 300000
}

/**
 * 切换会话
 * @param session 会话对象
 */
export function changeSession(session: Session, fromBox?: SessionBox) {
    const runtimeData = useRuntimeData()
    runtimeData.nowBox = fromBox
    if (runtimeData.nowChat === session) return
    if (!session.isActive) session.activate()
    runtimeData.nowChat = session

    const history = useSessionHistoryStore()
    history.add(session)

    // 补加列表没有的会话时,盒子切换
    if (!fromBox && !session.alwaysTop) {
        const box = session.boxes.at(0)

        // 自己有收纳盒,应当会自己出现在自己的收纳盒中
        if (box) {
            runtimeData.nowBox = box
        } else if (
            session instanceof GroupSession &&
            runtimeData.sysConfig.bubble_sort_user
        ) {
            // 群收纳盒特殊适配
            runtimeData.nowBox = BubbleBox.instance
        }
    }

    // 清理通知
    backend.call(undefined, 'sys:closeAllNotice', false, session.id)
}

/**
 * 关闭当前会话
 */
export function closeSession() {
    const runtimeData = useRuntimeData()
    runtimeData.nowChat = undefined
    runtimeData.nowBox = undefined
}

/**
 * 判断是否是特别关心
 * @param user 用户/用户id
 */
export function isImportant(user: IUser | number): boolean {
    if (typeof user !== 'number') user = user.user_id
    const userSession = UserSession.getSessionById(user)
    if (!userSession) return false
    return userSession.sessionClass.id === 9999
}

/**
 * 逐条转发消息
 * @param msgList 消息列表
 */
export async function singleForward(msgList: Msg[]) {
    const $t = app.config.globalProperties.$t
    const ForwardPan = (
        await import('@renderer/components/popBox/ForwardPan.vue')
    ).default
    popBox({
        title: $t('转发消息'),
        svg: 'fa-arrows-turn-right',
        comp: ForwardPan,
        props: {
            msgs: msgList,
            type: 'single',
        },
    })
}

/**
 * 合并转发消息
 * @param msgList 消息列表
 */
export async function mergeForward(msgList: Msg[]) {
    const $t = app.config.globalProperties.$t
    const ForwardPan = (
        await import('@renderer/components/popBox/ForwardPan.vue')
    ).default
    popBox({
        title: $t('合并转发消息'),
        svg: 'fa-share-from-square',
        comp: ForwardPan,
        props: {
            msgs: msgList,
            type: 'merge',
        },
    })
}

/**
 * 计算 QQ 等级图标
 * @param level QQ 等级
 * @returns 图标数量
 */
export function qqLevelIcons(level) {
    const result = {
        crown: 0, // 皇冠
        sun: 0, // 太阳
        moon: 0, // 月亮
        star: 0, // 星星
    }

    result.crown = Math.floor(level / 64)
    level %= 64

    result.sun = Math.floor(level / 16)
    level %= 16

    result.moon = Math.floor(level / 4)
    level %= 4

    result.star = level

    return result
}

/**
 * 计算 QQ 等级表情
 * @param level QQ 等级
 * @returns 表情字符串
 */
export function qqLevelToEmoji(level) {
    const rawLevel = level
    if (level <= 0) return level

    const crown = Math.floor(level / 64)
    level %= 64

    const sun = Math.floor(level / 16)
    level %= 16

    const moon = Math.floor(level / 4)
    level %= 4

    const star = level

    return (
        '👑'.repeat(crown) +
        '☀️'.repeat(sun) +
        '🌙'.repeat(moon) +
        '⭐️'.repeat(star) +
        '（' +
        rawLevel +
        '）'
    )
}
