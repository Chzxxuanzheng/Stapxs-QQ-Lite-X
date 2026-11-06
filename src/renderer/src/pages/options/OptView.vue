<!--
 * @FileDescription: 设置页面（界面子页面）
 * @Author: Stapxs
 * @Date: 2022/09/26
 * @Version: 1.0
-->

<template>
	<div class="opt-page">
		<div class="ss-card">
			<header>{{ $t('本土化') }}</header>
			<div class="l10n-info">
				<font-awesome-icon :icon="['fas', 'language']" />
				<div>
					<span>{{ $t('简体中文') }}</span>
					<span class="author">{{ $t('作者：') }}{{ $t('Stapx Steve') }}</span>
					<span>{{
						$t('你好世界！这是 Stapxs QQ Lite 的默认简体中文。')
					}}</span>
				</div>
			</div>
			<div class="opt-item">
				<div :class="{
					changed: !option.checkDefault('language'),
				}" />
				<font-awesome-icon :icon="['fas', 'earth-asia']" />
				<div>
					<span>{{ $t('语言（Language）') }}</span>
					<span>{{ $t('喵喵喵喵？') }}</span>
				</div>
				<div class="select-wrapper">
					<select v-model="runtimeData.sysConfig.language" name="language" title="language">
						<option v-for="item in languages" :key="item.value" :value="item.value">
							{{ item.name }}
						</option>
					</select>
				</div>
			</div>
		</div>
		<div class="ss-card">
			<header>{{ $t('主题与颜色') }}</header>
			<div class="opt-item">
				<div :class="{
					changed: !option.checkDefault('opt_dark_mode'),
				}" />
				<font-awesome-icon :icon="['fas', 'moon']" />
				<div>
					<span>{{ $t('亮暗模式') }}</span>
					<span>{{ $t('你是亮色党还是暗色党？') }}</span>
				</div>
				<DarkModeSwitch v-model="runtimeData.sysConfig.opt_dark_mode" />
			</div>
			<div class="opt-item">
				<div :class="{
					changed: !option.checkDefault('theme_color'),
				}" />
				<font-awesome-icon :icon="['fas', 'palette']" />
				<div>
					<span>{{ $t('主题色') }}</span>
					<span>{{ $t('换个心情 🎵 ~') }}</span>
				</div>
				<div class="theme-color-col">
					<label v-for="(name, index) in COLOR_NAMES" :key="'color_id_' + index" :title="name"
						class="ss-radio">
						<input type="radio" name="theme_color" :data-id="index"
							:checked="runtimeData.sysConfig.theme_color == index"
							@click="runtimeData.sysConfig.theme_color = index" />
						<div :style="'background: var(--color-main-' + index + ')'
							">
							<div />
						</div>
					</label>
				</div>
			</div>
			<div class="opt-item">
				<div :class="{
					changed: !option.checkDefault('vibrancy'),
				}" />
				<font-awesome-icon :icon="['fas', 'window-maximize']" />
				<div>
					<span>{{ $t('透明模式') }}</span>
					<span>{{
						$t('开启透明模式，颜值翻倍...就是有点吃性能')
					}}</span>
				</div>
				<Switch v-model="isVibrancy" @click="changeVibrancy" />
			</div>
			<div v-if="runtimeData.sysConfig.vibrancy" class="opt-item">
				<div :class="{
					changed: !option.checkDefault('background_img'),
				}" />
				<font-awesome-icon :icon="['fas', 'image']" />
				<div>
					<span>{{ $t('背景图片') }}</span>
					<span>{{ $t('嘿嘿嘿（痴呆') }}</span>
				</div>
				<div class="file-choice">
					<div class="choice-btn" @click="($refs.choiceImg as any)?.click()">
						{{
							runtimeData.sysConfig.background_img
								? $t('更换背景')
								: $t('上传背景')
						}}
						<input ref="choiceImg" type="file" style="display: none" name="background_img" accept="image/*"
							@change="setBackground($event)" />
					</div>
					<div v-if="runtimeData.sysConfig.background_img !== ''" class="rm-btn" @click="removeBackground">
						<font-awesome-icon :icon="['fas', 'xmark']" />
					</div>
				</div>
			</div>
			<div v-if="runtimeData.sysConfig.background_img" class="opt-item">
				<div :class="{
					changed: !option.checkDefault('background_img_blur'),
				}" />
				<font-awesome-icon :icon="['fas', 'o']" />
				<div>
					<span>{{ $t('背景模糊') }}</span>
					<span>{{ $t('什么都看不见了（恼') }}</span>
				</div>
				<div class="ss-range">
					<input v-model="runtimeData.sysConfig.background_img_blur"
						:style="`background-size: ${runtimeData.sysConfig.background_img_blur}% 100%;`" type="range"
						name="background_img_blur" />
					<span
						:style="`color: var(--color-font${runtimeData.sysConfig.background_img_blur > 50 ? '-r' : ''})`">
						{{ runtimeData.sysConfig.background_img_blur }}
						px</span>
				</div>
			</div>
			<div class="opt-item">
				<div :class="{
					changed: !option.checkDefault('auto_hide_side_bar'),
				}" />
				<font-awesome-icon :icon="['fas', 'barcode']" />
				<div>
					<span>{{ $t('自动隐藏侧边栏') }}</span>
					<span>{{
						$t('emm...这里该写些什么东西好呢？不知道，摆（')
					}}</span>
				</div>
				<div class="select-wrapper">
					<select v-model="runtimeData.sysConfig.auto_hide_side_bar" name="auto_hide_side_bar"
						title="auto_hide_side_bar">
						<option value="none">
							{{ $t('禁用（默认）') }}
						</option>
						<option value="fold">
							{{ $t('折叠') }}
						</option>
						<option value="hide">
							{{ $t('隐藏') }}
						</option>
					</select>
				</div>
			</div>
			<div class="opt-item">
				<div :class="{
					changed: !option.checkDefault('side_bar_width'),
				}" />
				<font-awesome-icon :icon="['fas', 'arrows-left-right']" />
				<div>
					<span>{{ $t('侧边栏宽度') }}</span>
					<span>{{
						$t('难以通过拖拽侧边栏调整时，可以用这个')
					}}</span>
				</div>
				<div class="ss-range">
					<input v-model="runtimeData.sysConfig.side_bar_width"
						:style="`background-size: ${(runtimeData.sysConfig.side_bar_width - 250) / 7.5}% 100%;`"
						min="250" max="1000" type="range" name="side_bar_width" />
					<span :style="`color: var(--color-font${runtimeData.sysConfig.side_bar_width > 625 ? '-r' : ''})`">
						{{ runtimeData.sysConfig.side_bar_width }}
						px</span>
				</div>
			</div>
			<div class="opt-item">
				<div :class="{
					changed: !option.checkDefault('hide_chat_head'),
				}" />
				<font-awesome-icon :icon="['fas', 'clapperboard']" />
				<div>
					<span>{{ $t('隐藏聊天顶栏') }}</span>
					<span>{{ $t('把聊天信息都藏起来') }}</span>
				</div>
				<Switch v-model="runtimeData.sysConfig.hide_chat_head" />
			</div>
			<div class="opt-item">
				<div :class="{
					changed: !option.checkDefault('hide_chat_bottom'),
				}" />
				<font-awesome-icon :icon="['fas', 'rectangle-list']" />
				<div>
					<span>{{ $t('隐藏发送栏') }}</span>
					<span>{{ $t('简洁模式') }}</span>
				</div>
				<Switch v-model="runtimeData.sysConfig.hide_chat_bottom" />
			</div>
		</div>
		<div class="ss-card">
			<header>{{ $t('页面') }}</header>
			<div class="opt-item">
				<div :class="{
					changed: !option.checkDefault('opt_fast_animation'),
				}" />
				<font-awesome-icon :icon="['fas', 'car-side']" />
				<div>
					<span>{{ $t('更快的动画速度') }}</span>
					<span>{{
						$t(
							'咻咻！此选项将使动画加速到 100ms 并去除部分浪费时间的组动画',
						)
					}}</span>
				</div>
				<Switch v-model="runtimeData.sysConfig.opt_fast_animation" />
			</div>
			<div class="opt-item">
				<div :class="{
					changed: !option.checkDefault('merge_forward_width'),
				}" />
				<font-awesome-icon :icon="['fas', 'text-width']" />
				<div>
					<span>{{ $t('固定合并转发宽度') }}</span>
					<span>{{ $t('强迫症的福音～') }}</span>
				</div>
				<Switch v-model="runtimeData.sysConfig.merge_forward_width" />
			</div>
			<div class="opt-item">
				<div :class="{
					changed: !option.checkDefault('use_favicon_notice'),
				}" />
				<font-awesome-icon :icon="['fas', 'bell']" />
				<div>
					<span>{{ $t('在图标上显示通知') }}</span>
					<span>{{ $t('呜呜呜——图标都被遮挡的看不到了！') }}</span>
				</div>
				<Switch v-model="runtimeData.sysConfig.use_favicon_notice" />
			</div>
			<div class="opt-item">
				<div :class="{
					changed: !option.checkDefault('hide_self_avatar'),
				}" />
				<font-awesome-icon :icon="['fas', 'user']" />
				<div>
					<span>{{ $t('隐藏自己的头像') }}</span>
					<span>
						{{ $t('干净整洁多了！') }}
					</span>
				</div>
				<Switch v-model="runtimeData.sysConfig.hide_self_avatar" />
			</div>
			<div class="opt-item">
				<div :class="{
					changed: !option.checkDefault('self_msg_direction'),
				}" />
				<font-awesome-icon :icon="['fas', 'chart-bar']" />
				<div>
					<span>{{ $t('自己消息位置') }}</span>
					<span>
						{{ $t('是靠左边好呢？还是靠右边好呢？') }}
					</span>
				</div>
				<div class="select-wrapper">
					<select v-model="runtimeData.sysConfig.self_msg_direction" name="self_msg_direction"
						title="self_msg_direction">
						<option value="left">
							{{ $t('左边') }}
						</option>
						<option value="right">
							{{ $t('右边（默认）') }}
						</option>
					</select>
				</div>
			</div>
			<div class="opt-item">
				<font-awesome-icon :icon="['fas', 'arrows-rotate']" />
				<div>
					<span>{{ $t('不要点这个') }}</span>
					<span>{{ $t('啊吧啊吧（智慧）') }}</span>
				</div>
				<Switch />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Switch from '@renderer/components/Switch.vue'
import DarkModeSwitch from '@renderer/components/DarkModeSwitch.vue'

import useOptionStore from '@renderer/state/option'
import { shallowRef } from 'vue'
import useRuntimeData from '@renderer/state/runtimeData'

import { sendIdentifyData } from '@renderer/function/utils/appUtil'
import {
	ensurePopBox,
	waitPopBox,
} from '@renderer/function/utils/popBox'
import imageCompression from 'browser-image-compression'
import languages from '../../assets/l10n/_l10nconfig.json'
import app from '@renderer/main'
import { logger, popInfo } from '@renderer/function/base'

const option = useOptionStore()
const runtimeData = useRuntimeData()

const COLOR_NAMES = [
	'林槐蓝',
	'墨竹青',
	'少女粉',
	'微软紫', // 小林认为微软是紫色的，它就是紫色的
	'坏猫黄',
	'玄素黑',
]
const isVibrancy = shallowRef(runtimeData.sysConfig.vibrancy)

const { $t } = app.config.globalProperties

async function changeVibrancy() {
	if (!isVibrancy.value) {
		runtimeData.sysConfig.vibrancy = false
		sendIdentifyData({ use_transparent: false })
	} else {
		const re = await ensurePopBox(
			$t(
				'开启透明模式将会对性能产生较为明显的影响，建议不要在性能较差的设备上使用此功能；此功能可能会降低元素可读性。',
			),
		)
		if (!re) {
			isVibrancy.value = false
			return
		}
		runtimeData.sysConfig.vibrancy = true
		sendIdentifyData({ use_transparent: true })
	}
}

//#region == 背景图片 =============================================================
/**
 * 设置背景图片
 */
async function setBackground(event: Event) {
	const sender = event.target as HTMLInputElement
	let img = sender.files?.[0]
	if (!img) return
	// 图片太大
	if (img.size > 3145728) {
		const options = { maxSizeMB: 3, useWebWorker: true }
		const done = waitPopBox($t('正在压缩图片 ……'))
		try {
			const compressedFile = await imageCompression(img, options)
			logger.info(
				'图片压缩成功，原大小：' +
				img.size / 1024 / 1024 +
				' MB，压缩后大小：' +
				compressedFile.size / 1024 / 1024 +
				' MB',
			)
			img = compressedFile
		} catch (error) {
			logger.error(error as Error, '图片压缩失败')
			popInfo.error($t('压缩图片失败'))
		}
		done()
	}
	const buffer = await img.arrayBuffer()
	const base64String = btoa(
		new Uint8Array(buffer).reduce(
			(data, byte) => data + String.fromCodePoint(byte),
			'',
		),
	)
	const imgSrc = `data:${img.type};base64,${base64String}`
	runtimeData.sysConfig.background_img = imgSrc
}
/**
 * 移除背景图片
 */
function removeBackground() {
	runtimeData.sysConfig.background_img = ''
}
//#endregion
</script>
