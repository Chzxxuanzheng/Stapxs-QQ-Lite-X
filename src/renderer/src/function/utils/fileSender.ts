import { i18n } from '@renderer/main'
import { GroupSession, UserSession } from '../model/session'
import { Msg } from '../model/msg'
import useRuntimeData from '@renderer/state/runtimeData'
import { popInfo } from '../base'
import { noticePopBox, waitPopBox } from './popBox'
import { GroupFileFolder } from '../model/file'
import { FileSegData } from '../adapter/interface'
import { FileSeg } from '../model/seg'
import { uploadFile } from '../input'
import { TimeoutSet } from './baseUtil'

export class FileSender {
	private static lock: number = 0
	static readonly sendIds: TimeoutSet<string> = new TimeoutSet()

	static async sendFile(
		file: File,
		target: UserSession | GroupSession,
	): Promise<undefined | Msg>
	static async sendFile(
		file: File,
		target: GroupSession,
		path?: GroupFileFolder,
	): Promise<undefined | Msg>
	static async sendFile(
		file: File,
		target: GroupSession | UserSession,
		folder?: GroupFileFolder,
	): Promise<undefined | Msg> {
		const $t = i18n.global.t
		const runtimeData = useRuntimeData()

		// 检测
		if (!runtimeData.nowAdapter?.getHistoryMsg) {
			popInfo.error($t('当前适配器不支持发送文件！'))
			return
		}

		if (target.type === 'group' && !runtimeData.nowAdapter?.sendGroupFile) {
			popInfo.error($t('当前适配器不支持发送群文件！'))
			return
		}
		if (
			target.type === 'user' &&
			!runtimeData.nowAdapter?.sendPrivateFile
		) {
			popInfo.error($t('当前适配器不支持发送私聊文件！'))
			return
		}

		if (file.size > 50 * 1024 * 1024) {
			noticePopBox($t('不支持大于50MB的文件发送！'))
			return
		}

		// 发送文件
		this.lock++
		let re: string | undefined
		if (target.type === 'group') {
			re = await runtimeData.nowAdapter.sendGroupFile!(
				target,
				file,
				folder,
			)
		} else {
			re = await runtimeData.nowAdapter.sendPrivateFile!(target, file)
		}
		if (re) this.sendIds.add(re)
		this.lock--

		// 获取发送结果
		const retryTime = 5
		let head: undefined | Msg
		for (let i = 0; i < retryTime; i++) {
			const msgs = await runtimeData.nowAdapter.getHistoryMsg(
				target,
				20,
				head,
			)
			if (!msgs) continue

			for (const msg of msgs) {
				if (msg.message.length !== 1) continue
				if (msg.message[0].type !== 'file') continue
				const seg: FileSegData = msg.message[0] as FileSegData
				if (seg.file_id === re) return new Msg(msg)
			}

			head = new Msg(msgs[0])
		}

		return
	}

	/**
	 * 锁，直到所有发送结束
	 */
	static async waitSendLock(): Promise<void> {
		return new Promise((resolve) => {
			const check = () => {
				if (this.lock === 0) {
					resolve()
				} else {
					setTimeout(check, 100)
				}
			}
			check()
		})
	}

	/**
	 * 判断该消息是否是自己发送的
	 */
	static async isSendFile(msg: Msg): Promise<boolean> {
		if (msg.message.length !== 1) return false
		if (msg.message[0].type !== 'file') return false
		const seg: FileSeg = msg.message[0] as FileSeg
		const fileId = seg.file_id
		if (!fileId) return false
		await this.waitSendLock()
		if (this.sendIds.has(fileId)) {
			this.sendIds.delete(fileId)
			return true
		}
		return false
	}

	/**
	 * 发生图片并且添加消息到会话
	 */
	static async sendFileAndAddMsg(
		file: File,
		target: GroupSession | UserSession,
	): Promise<void>
	static async sendFileAndAddMsg(
		file: File,
		target: GroupSession,
		folder: GroupFileFolder,
	): Promise<void>
	static async sendFileAndAddMsg(
		file: File,
		target: GroupSession | UserSession,
		folder?: GroupFileFolder,
	): Promise<void> {
		let reMsg: Msg | undefined
		if (folder) {
			reMsg = await FileSender.sendFile(
				file,
				target as GroupSession,
				folder,
			)
		} else {
			reMsg = await FileSender.sendFile(file, target)
		}

		if (!reMsg) return

		target.addMessage(reMsg)
	}

	static async autoUploadFile(
		target: GroupSession | UserSession,
	): Promise<void>
	static async autoUploadFile(
		target: GroupSession,
		folder: GroupFileFolder,
	): Promise<void>
	static async autoUploadFile(
		target: GroupSession | UserSession,
		folder?: GroupFileFolder,
	): Promise<void> {
		const file = await uploadFile()
		if (!file) return

		const $t = i18n.global.t

		// 提示
		const done = waitPopBox($t('正在发送文件中……'))

		if (folder)
			await this.sendFileAndAddMsg(file, target as GroupSession, folder)
		else await this.sendFileAndAddMsg(file, target)

		done()
	}
}
