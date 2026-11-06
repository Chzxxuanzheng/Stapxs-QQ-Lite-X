<!--
 * @FileDescription: 表情面板模板
 * @Author: Stapxs
 * @Date: missing
 * @Version: 1.0
-->

<template>
	<div class="ss-card face-pan">
		<Tab>
			<div icon="fa-solid fa-face-laugh-squint">
				<div class="system-face-bar">
					<template v-if="recentEmojisList.length > 0">
						<div class="title">
							<span>{{ $t('最近使用') }}</span>
						</div>
						<div class="face">
							<template
								v-for="num in recentEmojisList"
								:key="num"
							>
								<div>
									<EmojiFace
										:emoji="Emoji.get(num)"
										@click="addBaseFace(num)"
									/>
								</div>
							</template>
						</div>
					</template>
					<div class="title">
						<span>{{ $t('超级表情') }}</span>
					</div>
					<div class="face">
						<template v-for="num in Emoji.superList" :key="num">
							<div>
								<EmojiFace
									:emoji="Emoji.get(num)"
									@click="addBaseFace(num)"
								/>
							</div>
						</template>
					</div>
					<div class="title">
						<span>{{ $t('小黄脸表情') }}</span>
					</div>
					<div class="face">
						<template v-for="num in Emoji.normalList" :key="num">
							<div>
								<EmojiFace
									:emoji="Emoji.get(num)"
									@click="addBaseFace(num)"
								/>
							</div>
						</template>
					</div>
					<div class="title">
						<span>{{ $t('emoji 表情') }}</span>
					</div>
					<div class="face">
						<div
							v-for="num in Emoji.emojiList"
							:key="'base-face-' + num"
						>
							<EmojiFace
								:emoji="Emoji.get(num)"
								@click="addBaseFace(num)"
							/>
						</div>
					</div>
				</div>
			</div>
			<div icon="fa-solid fa-heart">
				<div class="system-face-bar custom-face-bar">
					<template v-if="recentCustomFacesList.length > 0">
						<div class="title">
							<span>{{ $t('最近使用') }}</span>
						</div>
						<div class="face">
							<span
								v-for="(url, num) in recentCustomFacesList"
								:key="num"
								v-tooltip="customFaceTooltip(url)"
							>
								<img
									loading="lazy"
									:src="url"
									:alt="'[' + $t('动画表情') + ']'"
									@click="addImgFace(url)"
								/>
							</span>
						</div>
					</template>
					<div class="title">
						<span>{{ $t('收藏的表情') }}</span>
						<font-awesome-icon
							:icon="['fas', 'fa-rotate-right']"
							@click="reloadCustomFace"
						/>
					</div>
					<div class="face">
						<template v-if="roamingState === 'no-support'">
							<div class="ss-card">
								<font-awesome-icon
									:icon="['fas', 'face-dizzy']"
								/>
								<span>{{
									$t('当前适配器不支持漫游表情')
								}}</span>
							</div>
						</template>
						<template v-else-if="roamingState === 'err'">
							<div class="ss-card">
								<font-awesome-icon
									:icon="['fas', 'face-dizzy']"
								/>
								<span>{{ $t('加载漫游表情失败') }}</span>
							</div>
						</template>
						<template v-else-if="roamingState === 'loading'">
							<div class="ss-card">
								<font-awesome-icon
									:icon="['fas', 'spinner']"
									spin
								/>
								<span>{{ $t('正在加载漫游表情') }}</span>
							</div>
						</template>
						<template
							v-else-if="
								customFaceStore.customFaceList &&
								customFaceStore.customFaceList.length > 0
							"
						>
							<span
								v-for="(
									url, index
								) in customFaceStore.customFaceList"
								:key="'stickers-' + index"
								v-tooltip="customFaceTooltip(url)"
							>
								<img
									v-show="url != 'end'"
									loading="lazy"
									:src="url"
									:alt="'[' + $t('动画表情') + ']'"
									@click="addImgFace(url)"
								/>
							</span>
						</template>
						<template v-else>
							<div
								v-show="
									customFaceStore.customFaceList &&
									customFaceStore.customFaceList.length <= 0
								"
								class="ss-card"
							>
								<font-awesome-icon
									:icon="['fas', 'face-dizzy']"
								/>
								<span>{{ $t('一无所有') }}</span>
							</div>
						</template>
					</div>
				</div>
			</div>
		</Tab>
	</div>
</template>

<script setup lang="ts">
import { computed, ComputedRef, Ref, shallowRef } from 'vue'

import Emoji from '@renderer/function/model/emoji'
import { FaceSeg, ImgSeg, Seg, TxtSeg } from '@renderer/function/model/seg'
import Tab from '@renderer/components/Tab.vue'
import EmojiFace from './EmojiFace.vue'
import { VueCompData } from '@renderer/function/elements/vueComp'
import CustomFaceTooltip from './tooltip/CustomFaceTooltip.vue'

import { vTooltip } from '@renderer/function/utils/vcmd'
import { useLocalStorage } from '@renderer/function/utils/vuse'
import useRuntimeData from '@renderer/state/runtimeData'
import useCustomFaceStore from '@renderer/state/customFace'

const emit = defineEmits<{
	sendMsg: []
}>()

const customFaceStore = useCustomFaceStore()
const roamingState = shallowRef<'loading' | 'ok' | 'err' | 'no-support'>(
	'no-support',
)

const runtimeData = useRuntimeData()

function getRecentEmojiRecord<T>(storeId: string): {
	recordList: Ref<T[]>
	showList: ComputedRef<T[]>
} {
	const recordList = useLocalStorage<T[]>(storeId, [])
	const showList = computed(() => {
		if (runtimeData.sysConfig.record_recent_emoji === 'none') {
			return []
		} else if (runtimeData.sysConfig.record_recent_emoji === 'order') {
			return recordList.value.slice(0, 30)
		} else {
			const timesMap = new Map<T, number>()
			for (const id of recordList.value) {
				timesMap.set(id, (timesMap.get(id) || 0) + 1)
			}
			return Array.from(timesMap.entries())
				.sort((a, b) => b[1] - a[1])
				.map((entry) => entry[0])
				.slice(0, 30)
		}
	})

	return {
		recordList,
		showList,
	}
}

const { recordList: recentEmojisId, showList: recentEmojisList } =
	getRecentEmojiRecord<number>('recent-emojis-id')
const { recordList: recentCustomFacesId, showList: recentCustomFacesList } =
	getRecentEmojiRecord<string>('recent-custom-faces-id')

// 初次加载漫游表情
initCustomFace()

async function initCustomFace() {
	if (customFaceStore.customFaceList) return

	await loadCustomFace()
}
async function reloadCustomFace() {
	if (roamingState.value === 'loading') return
	customFaceStore.customFaceList = undefined

	await loadCustomFace()
}

async function loadCustomFace() {
	if (roamingState.value === 'loading') return
	roamingState.value = 'loading'
	if (!runtimeData.nowAdapter?.getCustomFace) {
		roamingState.value = 'no-support'
		return
	}

	const data = await runtimeData.nowAdapter.getCustomFace()
	if (!data) {
		roamingState.value = 'err'
		return
	}

	customFaceStore.customFaceList = data
	roamingState.value = 'ok'
}

function addSpecialSeg(seg: Seg) {
	runtimeData.nowChat?.inputMsg.addSq(seg)
}
function addBaseFace(id: number) {
	// 记录最近使用的表情
	recordRecentEmoji(recentEmojisId, id)
	if (id < 5000) addSpecialSeg(new FaceSeg(id))
	else addSpecialSeg(new TxtSeg(Emoji.get(id)!.value))
}
function addImgFace(url: string) {
	// 记录最近使用的表情
	recordRecentEmoji(recentCustomFacesId, url)
	addSpecialSeg(new ImgSeg(url, true))
	// 直接发送表情
	if (runtimeData.sysConfig.send_face) {
		emit('sendMsg')
	}
}

function customFaceTooltip(url: string): VueCompData<typeof CustomFaceTooltip> {
	return {
		comp: CustomFaceTooltip,
		props: { url },
	}
}

function recordRecentEmoji<T>(recordList: Ref<T[]>, id: T) {
	if (runtimeData.sysConfig.record_recent_emoji === 'none') return
	let limit: number
	switch (runtimeData.sysConfig.record_recent_emoji) {
		case 'order':
			limit = 30
			break
		case '100times':
			limit = 100
			break
		case '500times':
			limit = 500
			break
	}
	const list = recordList.value
	if (runtimeData.sysConfig.record_recent_emoji === 'order') {
		const index = list.indexOf(id)
		if (index !== -1) {
			list.splice(index, 1)
		}
	}
	list.unshift(id)
	if (list.length > limit) {
		list.pop()
	}
	recordList.value = list
}
</script>
