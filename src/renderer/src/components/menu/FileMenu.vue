<!--
 * @FileDescription: 会话右键菜单
 * @Author: Mr.Lee
 * @Date:
 *      2025/08/02
 * @Version:
 *      1.0 - 初始版本
 * @Description:
 *      原本的只能在Message.vue中使用的右键菜单，现在抽离出来，方便其他组件使用
-->
<template>
    <div class="ss-card msg-menu-body">
        <div v-if="displayTag.download"
            :class="{ disabled: !runtimeData.tags.canCors }"
            :title="runtimeData.tags.canCors ? '' : $t('当前环境无法跨域下载文件，请先在设置中配置跨域代理')"
            @click="download">
            <div><font-awesome-icon :icon="['fas', 'angle-down']" /></div>
            <a>{{ $t('下载') }}</a>
        </div>
        <div v-if="displayTag.open" @click="switchOpen">
            <div><font-awesome-icon :icon="['fas', 'grip-lines']" /></div>
            <a>{{ $t('打开') }}</a>
        </div>
        <div v-if="displayTag.close" @click="switchOpen">
            <div><font-awesome-icon :icon="['fas', 'trash-can']" /></div>
            <a>{{ $t('关闭') }}</a>
        </div>
        <div v-if="displayTag.upload" @click="upload">
            <div><font-awesome-icon :icon="['fas', 'check-to-slot']" /></div>
            <a>{{ $t('上传') }}</a>
        </div>
        <div v-if="displayTag.rename" @click="rename">
            <div><font-awesome-icon :icon="['fas', 'edit']" /></div>
            <a>{{ $t('重命名') }}</a>
        </div>
        <div v-if="displayTag.delete" @click="deleteFile">
            <div>
                <font-awesome-icon
                    :icon="['fas', 'trash']"
                    style="color: var(--color-red)"
                />
            </div>
            <a style="color: var(--color-red)">{{ $t('删除') }}</a>
        </div>
    </div>
</template>

<script setup lang="ts">
import { GroupFile, GroupFileFolder } from '@renderer/function/model/file'
import { i18n } from '@renderer/main'
import { shallowReactive } from 'vue'
import { FileSender } from '@renderer/function/utils/fileSender'
import { popInfo } from '@renderer/function/base'
import { ensurePopBox, inputPopBox } from '@renderer/function/utils/popBox'
import { Role } from '@renderer/function/adapter/enmu'
import useRuntimeData from '@renderer/state/runtimeData'

//#region == 声明变量 ================================================================
const $t = i18n.global.t
const displayTag = shallowReactive({
    download: false,
    open: false,
    close: false,
    upload: false,
    delete: false,
    rename: false,
})
const { file } = defineProps<{ file: GroupFile | GroupFileFolder }>()
const emit = defineEmits<{
    close: [arg?: any]
}>()
const runtimeData = useRuntimeData()
init(file)
//#endregion

//#region == 方法函数 ================================================================
async function init(file: GroupFile | GroupFileFolder): Promise<void> {
    for (const key in displayTag) {
        displayTag[key] = false
    }

    displayTag.rename = true

    if (file instanceof GroupFile) {
        displayTag.download = true
    } else {
        displayTag.close = file.isOpen
        displayTag.open = !file.isOpen
        displayTag.upload = true
    }

    if (
        file.group.getMe().canAdmin(file.creator.role ?? Role.User) ||
        file.creator.user_id === runtimeData.selfInfo?.user_id
    )
        displayTag.delete = true
}

function close(): void {
    emit('close')
}

function download(): void {
    // 不具备跨域能力时禁止下载
    if (!runtimeData.tags.canCors) {
        popInfo.error($t('当前环境无法跨域下载文件，请先在设置中配置跨域代理'))
        close()
        return
    }
    ;(file as GroupFile)?.download()
    close()
}
function switchOpen(): void {
    ;(file as GroupFileFolder)?.open()
    close()
}
function upload(): void {
    const folder: GroupFileFolder = file as GroupFileFolder
    FileSender.autoUploadFile(folder.group, folder)
    close()
}
async function rename() {
    close()
    if (file instanceof GroupFile) {
        await renameFile()
    } else {
        await renameFolder()
    }
    await file.group.loadFiles(false)
}
async function renameFile() {
    if (!runtimeData.nowAdapter?.renameGroupFile) {
        popInfo.info($t('当前适配器不支持重命名文件'))
        return
    }

    const newName = await inputPopBox({
        title: $t('重命名'),
        svg: 'file-pen',
        placeholder: $t('请输入新的文件名称'),
        value: file.name,
    })

    if (!newName || newName === '' || newName === file.name) return

    await runtimeData.nowAdapter.renameGroupFile(file as GroupFile, newName)
}
async function renameFolder() {
    const folder = file as GroupFileFolder

    if (!runtimeData.nowAdapter?.renameGroupFileFolder) {
        popInfo.info($t('当前适配器不支持重命名文件夹'))
        return
    }

    const newName = await inputPopBox({
        title: $t('重命名'),
        svg: 'folder-pen',
        placeholder: $t('请输入新的文件夹名称'),
        value: folder.name,
    })

    if (!newName || newName === '' || newName === folder.name) return

    await runtimeData.nowAdapter.renameGroupFileFolder(folder, newName)
}
async function deleteFile(): Promise<void> {
    close()
    if (file instanceof GroupFile) {
        if (!runtimeData.nowAdapter?.deleteGroupFile) {
            popInfo.info($t('当前适配器不支持删除文件'))
            return
        }
        await runtimeData.nowAdapter.deleteGroupFile(file)
    } else {
        if (!runtimeData.nowAdapter?.deleteGroupFileFolder) {
            popInfo.info($t('当前适配器不支持删除文件夹'))
            return
        }
        if (file.count > 0) {
            const re = await ensurePopBox($t('文件夹不为空，确认删除？'))
            if (!re) return
        }
        await runtimeData.nowAdapter.deleteGroupFileFolder(file)
    }
    await file.group.loadFiles(false)
}
//#endregion
</script>
