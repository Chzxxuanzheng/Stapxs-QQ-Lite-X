/*
 * @FileDescription: 文件相关的模型
 * @Author: Mr.Lee
 * @Date: 2025/07/28
 * @Version: 1.0
 * @Description: 文件和文件夹模型
 */

import app from '@renderer/main'
import { shallowRef, ShallowRef } from 'vue'
import {
	GroupFileData,
	GroupFolderData,
} from '@renderer/function/adapter/interface'
import { popInfo } from '@renderer/function/base'
import useRuntimeData from '@renderer/state/runtimeData'
import { getSizeFromBytes } from '@renderer/function/utils/systemUtil'
import { Name, Time } from '@renderer/function/model/data'
import { GroupSession } from '@renderer/function/model/session'
import { BaseUser, IUser } from '@renderer/function/model/user'
import { urlDownload } from '@renderer/function/utils/baseUtil'

export class GroupFile {
	type: string = 'file'

	group: GroupSession
	id: string
	_name: Name
	size: number
	downloadTimes: number
	deadTime?: number
	creator: IUser
	createTime?: Time
	url?: string
	folder?: GroupFileFolder

	constructor(
		data: GroupFileData,
		group: GroupSession,
		folder?: GroupFileFolder,
	) {
		this.id = data.file_id
		this._name = new Name(data.file_name)
		this.size = data.size
		this.downloadTimes = data.download_times
		this.folder = folder
		if (data.dead_time) this.deadTime = data.dead_time
		let user: IUser | undefined
		if (data.uploader_id) user = group.getUserById(data.uploader_id)
		user ??= new BaseUser(data.uploader_id ?? 0, data.uploader_name)
		this.creator = user
		if (data.upload_time) this.createTime = new Time(data.upload_time)
		this.group = group
	}

	/**
	 * 下载文件
	 * @returns 文件是否下载成功
	 */
	async download(): Promise<boolean> {
		if (!this.url) await this.getUrl()
		if (!this.url) return false

		urlDownload(this.url)

		return true
	}

	/**
	 * 获取url
	 * @returns 获取url是否成功
	 */
	async getUrl() {
		const { $t } = app.config.globalProperties
		const runtimeData = useRuntimeData()
		if (!runtimeData.nowAdapter) return

		const data = await runtimeData.nowAdapter.getGroupFileUrl!(this)

		if (!data) {
			popInfo.error($t('获取下载连接失败'))
			return false
		}

		this.url = data
		return true
	}

	match(search: string): boolean {
		search = search.trim().toLowerCase()
		if (this._name.matchStr(search)) return true
		if (this.creator.match(search)) return true
		return false
	}

	get deadTimeFormat(): string | undefined {
		if (!this.deadTime) return undefined
		return (this.deadTime - Date.now() / 86400 - 1).toFixed(0)
	}

	get formatSize(): string {
		return getSizeFromBytes(this.size)
	}

	get name(): string {
		return this._name.toString()
	}

	set name(name: string | Name) {
		if (typeof name === 'string') this._name = new Name(name)
		else this._name = name
	}
}

export class GroupFileFolder {
	type: string = 'folder'

	group: GroupSession
	id: string
	_name: Name
	count: number
	createTime?: Time
	creator: IUser

	items: ShallowRef<(GroupFile | GroupFileFolder)[] | undefined> =
		shallowRef(undefined)
	private readonly _isOpen: ShallowRef<boolean> = shallowRef(false)
	constructor(data: GroupFolderData, group: GroupSession) {
		this.id = data.folder_id
		this._name = new Name(data.folder_name)
		this.count = data.count
		if (data.create_time) this.createTime = new Time(data.create_time)
		let user: IUser | undefined
		if (data.creator_id) user = group.getUserById(data.creator_id)
		user ??= new BaseUser(data.creator_id ?? 0, data.creator_name)
		this.creator = user
		this.group = group
	}

	async open(): Promise<boolean> {
		this.isOpen = !this.isOpen

		if (this.items.value !== undefined) return true

		const { $t } = app.config.globalProperties
		const runtimeData = useRuntimeData()

		if (!runtimeData.nowAdapter) return false

		const data = await runtimeData.nowAdapter.getGroupFolderFile!(
			this.group,
			this.id,
		)
		if (!data) {
			popInfo.error($t('获取文件夹内容失败'))
			return false
		}

		const sort = (a, b) => {
			if (!a.createTime) return -1
			if (!b.createTime) return 1
			return b.createTime.time - a.createTime.time
		}

		const out: (GroupFile | GroupFileFolder)[] = [
			...data.folders
				.map((folder) => new GroupFileFolder(folder, this.group))
				.sort(sort),
			...data.files
				.map((file) => new GroupFile(file, this.group, this))
				.sort(sort),
		]

		this.items.value = out

		return true
	}

	match(search: string): boolean {
		search = search.trim().toLowerCase()
		if (this._name.matchStr(search)) return true
		if (this.creator.match(search)) return true

		if (this.items.value) {
			for (const item of this.items.value) {
				if (item.match(search)) return true
			}
		}

		return false
	}

	get name(): string {
		return this._name.toString()
	}

	set name(name: string | Name) {
		if (typeof name === 'string') this._name = new Name(name)
		else this._name = name
	}

	get isOpen(): boolean {
		return this._isOpen.value
	}

	set isOpen(open: boolean) {
		this._isOpen.value = open
	}
}
