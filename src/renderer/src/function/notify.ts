import app from '@renderer/main'
import { NotifyInfo, NotificationElem } from './elements/system'
import { jumpToSession } from './utils/appUtil'
import { Session } from './model/session'

export class Notify {
	// 针对 MSG 类型的通知，记录用户的通知数量
	private static userNotifyList: { [key: string]: number } = {}
	// Web 端端通知列表，key tag
	private static notifyList: { [key: string]: Notification } = {}

	/**
	 * 发送一条通知
	 * @param info 通知信息
	 */
	public notify(info: NotifyInfo) {
		const { $t } = app.config.globalProperties
		// 判断当前 userId 是否已存在通知
		const userId = info.tag.split('/')[0]
		if (Notify.userNotifyList[userId] === undefined) {
			Notify.userNotifyList[userId] = 1
		} else {
			Notify.userNotifyList[userId]++
			// 修改通知内容为：“<内容>” 以及<数量>条消息
			info.body = $t('“{body}” 以及 {num} 条消息', {
				body: info.body,
				num: Notify.userNotifyList[userId] - 1,
			})
			// 关闭之前的通知
			this.closeAll(userId)
		}
		// 发送消息
		// Safari：在 iOS 下，如果页面没有被创建为主屏幕，通知无法被调用
		// 最见鬼的是它不是方法返回失败，而且整个 Notification 对象都没有
		const isSupported = () =>
			'Notification' in window &&
			'serviceWorker' in navigator &&
			'PushManager' in window
		if (isSupported()) {
			// 检查通知权限，老旧浏览器不支持这个功能
			if (Notification.permission === 'default') {
				Notification.requestPermission(() => {
					this.sendNotice(info)
				})
			} else if (Notification.permission !== 'denied') {
				this.sendNotice(info)
			}
		}
	}

	/**
	 * 发送独立通知
	 * @param info 通知信息
	 */
	public notifySingle(info: NotifyInfo) {
		// Safari：在 iOS 下，如果页面没有被创建为主屏幕，通知无法被调用
		// 最见鬼的是它不是方法返回失败，而且整个 Notification 对象都没有
		const isSupported = () =>
			'Notification' in window &&
			'serviceWorker' in navigator &&
			'PushManager' in window
		if (isSupported()) {
			// 检查通知权限，老旧浏览器不支持这个功能
			if (Notification.permission === 'default') {
				Notification.requestPermission(() => {
					this.sendNotice(info)
				})
			} else if (Notification.permission !== 'denied') {
				this.sendNotice(info)
			}
		}
	}

	/**
	 * 关闭用户的所有通知
	 * @param userId 用户 ID
	 */
	public async closeAll(userId: string) {
		const keys = Object.keys(Notify.notifyList)
		keys.forEach((key) => {
			if (key.startsWith(userId)) {
				this.close(key)
			}
		})
		delete Notify.userNotifyList[userId]
	}

	/**
	 * 关闭所有通知
	 */
	public clear() {
		const keys = Object.keys(Notify.notifyList)
		keys.forEach((key) => {
			this.close(key)
		})
	}

	// ==============================
	// PS: 以下为 Web 端通知的方法

	/**
	 * 关闭一条通知
	 * @param tag 通知标签
	 */
	private close(tag: string) {
		Notify.notifyList[tag]?.close()
	}

	/**
	 * 关闭一条通知（如果是消息通知，则跳转到对应的聊天页面）
	 * @param tag 通知标签
	 * @returns 通知对象
	 */
	private closeJump(tag: string | undefined) {
		if (tag !== undefined) {
			if (tag.indexOf('/') > 0) {
				// MSG 类型的通知
				const sessionId = tag.split('/')[0]
				const msgId = tag.substring(sessionId.length + 1, tag.length)
				delete Notify.userNotifyList[sessionId]
				// 获取对应回话和消息
				const session = Session.getSessionById(parseInt(sessionId))
				if (!session) return
				// 跳转到这条消息的发送者页面
				const msg = session.getMsgById(msgId)
				window.focus()
				if (session) jumpToSession(session, msg)
			}
			this.close(tag)
		}
	}

	/**
	 * 发送一条通知（Web 端）
	 * @param info 通知信息
	 * @returns 通知对象
	 */
	private sendNotice(info: NotifyInfo) {
		// 构建通知
		let notificationTile = ''
		const notificationBody = {} as NotificationElem
		notificationBody.requireInteraction = true
		notificationTile = info.title
		notificationBody.body = info.body
		notificationBody.tag = info.tag
		notificationBody.icon = info.icon
		// 发起通知
		const notification = new Notification(
			notificationTile,
			notificationBody,
		)
		notification.onclick = (event: Event) => {
			this.closeJump((event.target as NotificationOptions).tag)
		}
		// 保存通知对象
		Notify.notifyList[info.tag] = notification
	}
}
