<template>
	<div class="group-files">
		<template v-if="chat.filesLoaded">
			<header>
				<input
					v-search="fileSearchInfo!"
					class="search-view"
					:placeholder="$t('搜索 ……')"
				/>
				<button :title="$t('上传文件')" @click="addFile">
					<font-awesome-icon :icon="['fas', 'file-circle-plus']" />
				</button>
				<button
					:title="
						$t('新建文件夹') +
						(!['admin', 'owner'].includes(chat.getMe().role)
							? '（' + $t('仅群主和管理员可用') + '）'
							: '')
					"
					:disabled="!['admin', 'owner'].includes(chat.getMe().role)"
					@click="addFolder"
				>
					<font-awesome-icon :icon="['fas', 'folder-plus']" />
				</button>
				<button :title="$t('刷新')" @click="refreshFiles">
					<font-awesome-icon :icon="['fas', 'rotate-right']" />
				</button>
			</header>
			<div
				v-if="
					(fileSearchInfo!.isSearch
						? fileSearchInfo!.query
						: chat.files
					)?.length > 0
				"
				class="file-list"
			>
				<div
					v-for="item in fileSearchInfo!.isSearch
						? fileSearchInfo!.query
						: chat.files"
					:key="'file-' + item.id"
				>
					<FileBody :item="markRaw(item)" />
				</div>
			</div>
			<div v-else class="null">
				<font-awesome-icon :icon="['fas', 'inbox']" />
				{{ $t('空空如也') }}
			</div>
		</template>
		<div v-else class="loading" style="opacity: 0.9">
			<font-awesome-icon :icon="['fas', 'spinner']" />
			{{ $t('加载中') }}
		</div>
	</div>
</template>

<script setup lang="ts">
import FileBody from '@renderer/components/FileBody.vue'

import { popInfo } from '@renderer/function/base'
import { GroupFile, GroupFileFolder } from '@renderer/function/model/file'
import { GroupSession } from '@renderer/function/model/session'
import useRuntimeData from '@renderer/state/runtimeData'
import { FileSender } from '@renderer/function/utils/fileSender'
import { inputPopBox } from '@renderer/function/utils/popBox'
import { i18n } from '@renderer/main'
import { vSearch } from '@renderer/function/utils/vcmd'
import { markRaw, shallowReactive, watchEffect } from 'vue'

const $t = i18n.global.t
const runtimeData = useRuntimeData()

const { chat } = defineProps<{
	chat: GroupSession
}>()

const fileSearchInfo =
	chat instanceof GroupSession
		? shallowReactive({
				originList: [] as (GroupFileFolder | GroupFile)[],
				query: shallowReactive([] as (GroupFileFolder | GroupFile)[]),
				isSearch: false,
			})
		: undefined

watchEffect(() => {
	fileSearchInfo!.originList = chat.files ?? []
})

/**
 * 刷新文件
 */
async function refreshFiles(): Promise<void> {
	await (chat as GroupSession).loadFiles(false)
}

/**
 * 上传文件
 */
async function addFile(): Promise<void> {
	await FileSender.autoUploadFile(chat as GroupSession)
}

/**
 * 新建文件夹
 */
async function addFolder(): Promise<void> {
	if (!runtimeData.nowAdapter?.createFileFolder) {
		popInfo.info($t('当前适配器不支持新建文件夹'))
		return
	}

	const foldName = await inputPopBox({
		title: $t('请输入文件夹名称'),
		svg: 'folder-plus',
		placeholder: $t('请输入文件夹名称'),
		value: $t('新建文件夹'),
	})

	if (!foldName || foldName === '') return

	await runtimeData.nowAdapter.createFileFolder(
		chat as GroupSession,
		foldName,
	)
	await refreshFiles()
}
</script>
