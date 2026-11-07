/*
 * @FileDescription: 弹窗工具
 * @Author: Mr.Lee
 * @Date: 2025/08/05
 * @Version: 1.0
 * @Description: 弹窗工具,用于快速创建弹窗,管理弹窗
 */

import app from '@renderer/main'
import { Component, h, markRaw, shallowReactive, VNode } from 'vue'
import InputPopBox from '@renderer/components/popBox/InputPopBox.vue'
import { VueCompData } from '@renderer/function/elements/vueComp'

export interface PopBoxButton {
	master?: boolean // 是否高亮（主按钮）
	fun?:
		| (() => void | Promise<void>)
		| ((event: Event) => void | Promise<void>) // 按钮回调
	text: string // 按钮文本
	noClose?: boolean // 是否不退出弹窗
}

export type AbsCompPopBoxData = {
	svg?: string // 弹窗图标
	title?: string // 弹窗标题（缺省将没有标题栏和关闭按钮）
	full?: boolean // 是否填充整个页面
	button?: PopBoxButton[]
	allowAutoClose?: boolean // 是否允许自带的关闭操作
	onClose?: () => void // 关闭回调
}

export type PopBoxData<T extends Component> = AbsCompPopBoxData & VueCompData<T>

export const popBoxList: { id: string; data: PopBoxData<Component> }[] =
	shallowReactive([])

/**
 * 关闭一个弹窗
 * @param id 弹窗id
 * @returns
 */
export function closePopBox(id: string) {
	const index = popBoxList.findIndex((item) => item.id === id)
	if (index === -1) return
	popBoxList[index].data.onClose?.()
	popBoxList.splice(index, 1)
}

/**
 * 判断当前是否有弹窗存在
 * @returns
 */
export function hasPopBox(): boolean {
	return popBoxList.length > 0
}

/**
 * 创建一个弹窗
 * @param config 弹窗配置
 * @return 弹窗的唯一标识符
 */
export function popBox<T extends Component>(config: PopBoxData<T>): string {
	const id = crypto.randomUUID()
	config.comp = markRaw(config.comp)
	popBoxList.push({
		id,
		data: config,
	})
	return id
}

/**
 * 创建一个 HTML 弹窗
 * @param html HTML 内容
 * @param config 弹窗配置
 * @return 弹窗的唯一标识符
 * @deprecated 纯文本请使用 `textPopBox`, 或者 tsx + `popBox` 替代
 */
export function htmlPopBox(
	html: string,
	config: AbsCompPopBoxData = {},
): string {
	const data: PopBoxData<() => VNode> = {
		comp: () => h('div', { innerHTML: html }),
		...config,
	}
	return popBox(data)
}

/**
 * 创建一个文本弹窗
 * @param text 文本
 * @param config 弹窗配置
 * @returns 弹窗唯一标识符
 */
export function textPopBox(
	text: string,
	config: AbsCompPopBoxData = {},
): string {
	const data: PopBoxData<() => VNode> = {
		comp: () => h('div', [h('span', text)]),
		...config,
	}
	return popBox(data)
}

/**
 * 确认弹窗
 * @param text 询问文本
 * @param mainButtonName 主按钮名称
 * @param closeButtonName 取消按钮名称
 * @returns
 */
export async function ensurePopBox(
	text: string,
	mainButtonName?: string,
	closeButtonName?: string,
): Promise<boolean> {
	const { $t } = app.config.globalProperties
	if (!mainButtonName) mainButtonName = $t('确定')
	if (!closeButtonName) closeButtonName = $t('取消')
	let resolve: (value: boolean) => void
	const promise = new Promise<boolean>((res) => {
		resolve = res
	})
	textPopBox(text, {
		title: $t('提醒'),
		button: [
			{
				text: closeButtonName,
				master: true,
				fun: () => resolve(false),
			},
			{
				text: mainButtonName,
				fun: () => resolve(true),
			},
		],
		allowAutoClose: false,
	})
	return promise
}

/**
 * 确认弹窗
 * @param text 确认文本
 * @param buttonName 按钮名称
 * @returns
 */
export async function noticePopBox(
	text: string,
	buttonName?: string,
): Promise<void> {
	const { $t } = app.config.globalProperties
	if (!buttonName) buttonName = $t('知道了')

	let resolve: () => void
	const promise = new Promise<void>((res) => {
		resolve = res
	})
	textPopBox(text, {
		svg: 'triangle-exclamation',
		title: $t('提醒'),
		button: [
			{
				text: buttonName,
				fun: () => resolve(),
			},
		],
	})
	return promise
}

/**
 * 输入弹窗
 * @param config
 * @returns
 */
export async function inputPopBox(config: {
	title?: string
	svg?: string
	placeholder?: string
	value?: string
}): Promise<string | undefined> {
	const { $t } = app.config.globalProperties
	config.title = config.title ?? $t('输入')
	const model = { value: config.value ?? '' }
	return new Promise((resolve) => {
		popBox({
			title: config.title,
			svg: config.svg,
			comp: InputPopBox,
			props: {
				placeholder: config.placeholder ?? '',
				complete: resolve,
			},
			model: markRaw(model),
			button: [
				{
					text: $t('确定'),
					master: true,
					fun: () => {
						resolve(config.value)
					},
				},
				{
					text: $t('取消'),
					fun: () => {
						resolve(undefined)
					},
				},
			],
		})
	})
}

/**
 * 创建一个等待弹窗
 * @param content 提示内容
 * @param config
 * @returns
 */
export function waitPopBox(
	content: string,
	config: {
		title?: string
		svg?: string
	} = {},
): () => void {
	const { $t } = app.config.globalProperties
	const popBoxId = textPopBox(content, {
		title: config.title ?? $t('操作'),
		svg: config.svg,
		allowAutoClose: false,
	})

	return () => {
		closePopBox(popBoxId)
	}
}
