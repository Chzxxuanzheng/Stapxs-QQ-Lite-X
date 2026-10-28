/*
 * @FileDescription: 文件相关的模型
 * @Author: Mr.Lee
 * @Date: 2025/07/28
 * @Version: 1.0
 * @Description: 文件和文件夹模型
 */

import app from '@renderer/main'
import { shallowRef, ShallowRef } from 'vue'
import { GroupFileData, GroupFolderData } from '../adapter/interface'
import { popInfo } from '../base'
import useRuntimeData from '@renderer/state/runtimeData'
import { downloadFile } from '../utils/appUtil'
import { getSizeFromBytes } from '../utils/systemUtil'
import { Name, Time } from './data'
import { GroupSession } from './session'
import { BaseUser, IUser } from './user'
import { ProxyUrl } from './proxyUrl'

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
    url?: ProxyUrl
    folder?: GroupFileFolder

    downloadPercent: ShallowRef<number | undefined> = shallowRef()

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
        const { $t } = app.config.globalProperties
        const runtimeData = useRuntimeData()

        // web 端下载需要读取响应内容，受同源策略限制，不具备跨域能力时必定失败
        // 这里提前拦截，避免无意义的请求和一直停留在下载中状态
        if (!runtimeData.tags.canCors) {
            popInfo.error(
                $t('当前环境无法跨域下载文件，请先在设置中配置跨域代理'),
            )
            return false
        }

        this.downloadPercent.value = 0

        // 如果没有url，则获取url
        if (!this.url) {
            const re = await this.getUrl()
            this.downloadPercent.value = undefined
            if (!re) return false
        }

        let re: boolean | undefined

        downloadFile(
            this.url!,
            this.name,
            (event: ProgressEvent) => {
                if (!event.lengthComputable) return
                const percent = Math.floor((event.loaded / event.total) * 100)
                this.downloadPercent.value = percent
                if (percent >= 100) re = true
            },
            () => {
                this.downloadPercent.value = undefined
                re = false
            },
        )

        return await new Promise((resolve) => {
            const timer = setInterval(() => {
                if (re !== undefined) {
                    clearInterval(timer)
                    resolve(re)
                }
            }, 100)
        })
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

        this.url = new ProxyUrl(data)
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
