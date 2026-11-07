/*
 * @FileDescription: v 指令封装
 * @Author: Mr.Lee
 * @Date: 2025/08/18
 * @Version: 1.0
 * @Description: 封装的一些v指令
 */

import {
	Component,
	Directive,
	DirectiveBinding,
	ObjectDirective,
	shallowReactive,
	shallowRef,
	watch,
	watchEffect,
	WatchHandle,
} from 'vue'
import { Role } from '../adapter/enmu'
import { MenuEventData } from '../elements/information'
import { shouldAutoFocus } from './appUtil'
import { wheelMask } from './input'
import { VueCompData } from '../elements/vueComp'
import { addTooltip, TooltipController } from '../tooltip'
import { useStayEvent } from '../composable/useStayEvent'

/**
 * 根据用户角色设置元素的 class 属性
 */
export const vUserRole: Directive<HTMLSpanElement, Role> = {
	mounted(el: HTMLElement, binding: DirectiveBinding<Role>) {
		const role = binding.value
		if (!role) return
		// 设置 class
		el.classList.add('user-title')
		switch (role) {
			case Role.Owner:
				el.classList.add('owner')
				break
			case Role.Admin:
				el.classList.add('admin')
				break
			case Role.Bot:
				el.classList.add('robot')
				break
		}
	},
}
/**
 * 创建一个右键菜单指令
 * 用于闭包公用停留事件控制器
 * @returns
 */
function createVMenu(): Directive<HTMLElement, (event: MenuEventData) => void> {
	// 右键菜单事件数据类型
	type Binding = DirectiveBinding<(event: MenuEventData) => void> & {
		modifiers: { prevent?: boolean; stop?: boolean }
	}

	let activeMenu = false

	// 右键菜单事件数据类型
	const { handle: menuTouchHandle, handleEnd: menuTouchEnd } = useStayEvent(
		(event: TouchEvent) => {
			if (event.touches.length > 0) {
				const touch = event.touches[0]
				return { x: touch.clientX, y: touch.clientY }
			}
			return undefined
		},
		{
			onFit: (data: MenuEventData, binding: Binding) => {
				// 触发右键菜单事件
				binding.value(data)
				activeMenu = true
			},
		},
		400,
	)

	// 创建指令
	return {
		mounted(el: HTMLElement, binding: Binding) {
			// 创建变量
			const prevent = binding.modifiers.prevent || false
			const stop = binding.modifiers.stop || false
			const controller = new AbortController()
			const options = { signal: controller.signal }

			// 修复由于 touch 阻断 click 事件冒泡的问题
			let touchStartTime = 0

			// 添加监听
			el.addEventListener(
				'contextmenu',
				(event) => {
					if (prevent) event.preventDefault()
					if (stop) event.stopPropagation()
					const data: MenuEventData = {
						x: event.clientX,
						y: event.clientY,
						target: event.target as HTMLElement,
					}
					binding.value(data)
				},
				options,
			)
			el.addEventListener(
				'touchstart',
				(event) => {
					menuTouchHandle(event, binding)
					touchStartTime = Date.now()
				},
				options,
			)
			el.addEventListener(
				'touchmove',
				(event) => {
					if (prevent && activeMenu) event.preventDefault()
					if (stop && activeMenu) event.stopPropagation()
					menuTouchHandle(event, binding)
				},
				options,
			)
			el.addEventListener(
				'touchend',
				(event) => {
					if (prevent && activeMenu) event.preventDefault()
					if (stop && activeMenu) event.stopPropagation()
					menuTouchEnd(event)
					activeMenu = false

					// 快速点击则触发点击事件
					if (Date.now() - touchStartTime < 200)
						event.target?.['click']?.()
				},
				options,
			)
			;(el as any)._vMenuController = controller
		},
		unmounted(el: HTMLElement) {
			const controller = (el as any)._vMenuController
			if (!controller) return

			controller.abort()
			delete (el as any)._vMenuController
		},
	}
}
/**
 * 创建一个右键菜单指令
 * @example v-menu="(data: MenuEventData) =>  打开菜单函数(data, 其他参数)"
 */
export const vMenu: Directive<
	HTMLElement,
	(event: MenuEventData) => void,
	'prevent' | 'stop'
> = createVMenu()
/**
 * 挂在时如果设备支持,自动聚焦输入框
 * 支持是否启用
 * @example v-auto-focus="是否启用(默认启用)"
 */
export const vAutoFocus: Directive<
	HTMLInputElement | HTMLTextAreaElement,
	boolean | undefined
> = {
	mounted(
		el: HTMLInputElement | HTMLTextAreaElement,
		binding: DirectiveBinding<boolean | undefined>,
	) {
		if (binding.value === false) return
		// 判断是否支持聚焦
		if (!shouldAutoFocus()) return
		// 检查元素是否可见
		const isVisible = () => {
			const style = window.getComputedStyle(el)
			return (
				style.display !== 'none' &&
				style.visibility !== 'hidden' &&
				Number(style.opacity) > 0
			)
		}

		if (!isVisible()) return
		setTimeout(() => el.focus(), 0)
	},
}

/**
 * 自动聚焦输入框
 * 挂在时自动聚焦输入框
 * @example v-focus
 */
export const vFocus: Directive<HTMLElement, boolean | undefined> = {
	mounted(el: HTMLElement, binding: DirectiveBinding<boolean | undefined>) {
		if (binding.value === false) return

		// 检查元素是否可见
		const isVisible = () => {
			const style = window.getComputedStyle(el)
			return (
				style.display !== 'none' &&
				style.visibility !== 'hidden' &&
				Number(style.opacity) > 0
			)
		}

		if (!isVisible()) return

		el.focus()
	},
}

export interface SearchBinding<T extends { match(query: string): boolean }> {
	originList: Iterable<T>
	isSearch: boolean
	query: T[]
	forceUpdate?: number // 强制刷新
}

/**
 * 生成一个 Search 指令
 */
function createVSearch<
	T extends { match(query: string): boolean },
>(): Directive<HTMLInputElement, SearchBinding<T>> {
	const main = (el: HTMLInputElement, data: SearchBinding<T>) => {
		const controller = new AbortController()
		const queryTxt = shallowRef('')

		el.addEventListener(
			'input',
			() => {
				queryTxt.value = el.value.trim()
			},
			{ signal: controller.signal },
		)

		const stopWatchEffect = watchEffect(() => {
			void data.forceUpdate
			if (!queryTxt.value) {
				data.isSearch = false
				data.query = []
			} else {
				data.isSearch = true
				data.query = shallowReactive(
					Array.from(data.originList).filter((item) =>
						item.match(queryTxt.value),
					),
				)
			}
		})
		const stopWatch = watch(
			() => data.isSearch,
			(isSearch) => {
				if (!isSearch) {
					data.query = []
				}
			},
		)
		;(el as any)._vSearchController = controller
		;(el as any)._vSearchStopWatch = { stopWatch, stopWatchEffect }
		;(el as any)._vSearchCurrentData = data
	}

	const stop = (el: HTMLInputElement) => {
		const controller = (el as any)._vSearchController
		const stopWatch = (el as any)._vSearchStopWatch
		if (controller) {
			controller.abort()
			delete (el as any)._vSearchController
		}
		if (stopWatch) {
			;(stopWatch.stopWatch as WatchHandle).stop()
			;(stopWatch.stopWatchEffect as WatchHandle).stop()
			delete (el as any)._vSearchStopWatch
		}
	}
	return {
		mounted(el, binding: DirectiveBinding<SearchBinding<T>>) {
			main(el, binding.value)
		},
		updated(el, binding: DirectiveBinding<SearchBinding<T>>) {
			if ((el as any)._vSearchCurrentData === binding.value) return
			stop(el)
			el.value = ''
			main(el, binding.value)
		},
		unmounted(el) {
			stop(el)
		},
	}
}
/**
 * 输入时在制定列表里搜索匹配的项
 * @example v-search="{
 *     originList: 制定的列表,
 *     isSearch: 当前是否在搜索,
 *     query: 搜索结果列表，
 * }"
 * @see createVSearch
 */

export const vSearch = createVSearch<any>()
/**
 * 如果自身超出了父组件的范围，则隐藏自身
 */
export const vOverflowHide: Directive<HTMLElement, undefined> = {
	mounted(el: HTMLElement) {
		const parent = el.parentElement
		if (!parent) return

		// 检查元素是否完全在父容器内
		const update = () => {
			const pRect = parent.getBoundingClientRect()
			const eRect = el.getBoundingClientRect()
			if (
				eRect.left < pRect.left ||
				eRect.top < pRect.top ||
				eRect.right > pRect.right ||
				eRect.bottom > pRect.bottom
			) {
				el.style.opacity = '0'
			} else {
				el.style.opacity = ''
			}
		}

		// 监听窗口尺寸变化
		const controller = new AbortController()
		parent.addEventListener('resize', update, { signal: controller.signal })

		// 使用 ResizeObserver 监听大小或内容变化
		const observer = new ResizeObserver(update)
		observer.observe(el)
		observer.observe(parent)

		// 初始检查
		update()
		;(el as any)._vOverflowHideController = { observer, controller }
	},
	unmounted(el: HTMLElement) {
		const data = (el as any)._vOverflowHideController
		if (!data) return
		data.observer.disconnect()
		data.controller.abort()
		delete (el as any)._vOverflowHideController
	},
}
/**
 * 是否隐藏元素
 * 如果值为 true，则隐藏元素（通过设置 opacity 为 0）
 * 如果值为 false，则显示元素（通过清除 opacity）
 * @example v-hide="true"
 */
export const vHide: Directive<HTMLElement, boolean> = {
	mounted(el: HTMLElement, binding: DirectiveBinding<boolean>) {
		if (binding.value) {
			el.style.opacity = '0'
			el.style.pointerEvents = 'none'
		} else {
			el.style.opacity = ''
			el.style.pointerEvents = ''
		}
	},
	updated(el: HTMLElement, binding: DirectiveBinding<boolean>) {
		if (binding.value) {
			el.style.opacity = '0'
			el.style.pointerEvents = 'none'
		} else {
			el.style.opacity = ''
			el.style.pointerEvents = ''
		}
	},
}

/**
 * 监听 Esc 键按下事件
 * 当按下 Esc 键时，执行绑定的函数
 * @example v-esc="退出函数"
 */
export const vEsc: Directive<HTMLElement, () => void> = {
	mounted(el: HTMLElement, binding: DirectiveBinding<() => void>) {
		const controller = new AbortController()
		const options = { signal: controller.signal }

		// 监听键盘事件
		const keydownHandler = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.stopPropagation()
				binding.value()
			}
		}
		document.addEventListener('keydown', keydownHandler, options)
		;(el as any)._vEscController = controller
	},
	unmounted(el: HTMLElement) {
		const controller = (el as any)._vEscController

		if (!controller) return

		controller.abort()
		delete (el as any)._vEscController
	},
}

/**
 * v-move的选项
 */
export interface VMoveOptions<T extends HTMLElement> {
	beforeHook?: (el: T) => void
	moveHook?: (el: T, move: number) => void
	endHook?: (el: T) => void
	leftLimit?: {
		value: number
		type: 'px' | '%'
	}
	rightLimit?: {
		value: number
		type: 'px' | '%'
	}
	speedCondition?: {
		minMove: {
			value: number
			type: 'px' | '%'
		}
		minSpeed: number
	}
	moveCondition?: {
		minMove: {
			value: number
			type: 'px' | '%'
		}
	}
}

function createVMove<T extends HTMLElement>(): Directive<T, VMoveOptions<T>> {
	return {
		mounted(el: T, binding: DirectiveBinding<VMoveOptions<T>>) {
			const options = binding.value

			const moveFlag = {
				_move: 0,
				get move() {
					return this._move
				},
				set move(value: number) {
					if (value < -getLimit('left')) value = -getLimit('left')
					if (value > getLimit('right')) value = getLimit('right')
					this._move = value
				},
				onScroll: 'none' as 'none' | 'touch' | 'wheel',
				lastTime: null as null | number,
				speedList: [] as number[],
				touchLast: null as null | TouchEvent,
			}

			const getPxValue = (option: {
				type: 'px' | '%'
				value: number
			}) => {
				if (option.type === 'px') return option.value
				return (el.getBoundingClientRect().width * option.value) / 100
			}
			const getLimit = (type: 'left' | 'right') => {
				const option: { type: 'px' | '%'; value: number } =
					options?.[type + 'Limit']
				if (!option) return 0
				return getPxValue(option)
			}

			// 滚轮滑动
			const chatWheelEvent = (event: WheelEvent) => {
				// oxlint-disable-next-line no-shadow
				const process = (event: WheelEvent) => {
					// 正在触屏,不处理
					if (moveFlag.onScroll === 'touch') return false
					const x = event.deltaX
					const y = event.deltaY
					const absX = Math.abs(x)
					const absY = Math.abs(y)
					// 斜度过大
					if (absY !== 0 && absX / absY < 2) return false
					dispenseMove('wheel', -x / 3)
					return true
				}
				if (!process(event)) return
				event.stopPropagation()
				event.preventDefault()
				// 创建遮罩
				// 由于在窗口移动中,窗口判定箱也在移动,当指针不再窗口外,事件就断了
				// 所以要创建一个不会动的全局遮罩来处理
				wheelMask(process, () => {
					dispenseMove('wheel', 0, true)
				})
			}

			// 触屏开始
			const chatMoveStartEvent = (event: TouchEvent) => {
				if (moveFlag.onScroll === 'wheel') return
				// 触屏开始时，记录触摸点
				moveFlag.touchLast = event
			}

			// 触屏滑动
			const chatMoveEvent = (event: TouchEvent) => {
				if (moveFlag.onScroll === 'wheel') return
				if (!moveFlag.touchLast) return
				const touch = event.changedTouches[0]
				const lastTouch = moveFlag.touchLast.changedTouches[0]
				const deltaX = touch.clientX - lastTouch.clientX
				const deltaY = touch.clientY - lastTouch.clientY
				const absX = Math.abs(deltaX)
				const absY = Math.abs(deltaY)
				// 斜度过大
				if (absY !== 0 && absX / absY < 2) return
				event.stopPropagation()
				event.preventDefault()
				// 触屏移动
				moveFlag.touchLast = event
				dispenseMove('touch', deltaX)
			}

			// 触屏滑动结束
			const chatMoveEndEvent = (event: TouchEvent) => {
				if (moveFlag.onScroll === 'wheel') return
				const touch = event.changedTouches[0]
				const lastTouch = moveFlag.touchLast?.changedTouches[0]
				if (lastTouch) {
					const deltaX = touch.clientX - lastTouch.clientX
					const deltaY = touch.clientY - lastTouch.clientY
					const absX = Math.abs(deltaX)
					const absY = Math.abs(deltaY)
					// 斜度过大
					if (absY === 0 || absX / absY > 2) {
						dispenseMove('touch', deltaX)
					}
				}
				dispenseMove('touch', 0, true)
				moveFlag.touchLast = null
			}
			/**
			 * 分发触屏/滚轮情况
			 */
			const dispenseMove = (
				type: 'touch' | 'wheel',
				value: number,
				end: boolean = false,
			) => {
				if (!end && moveFlag.onScroll === 'none') startMove(type, value)
				if (moveFlag.onScroll === 'none') return
				if (end) endMove()
				else keepMove(value)
			}

			/**
			 * 开始窗口移动
			 */
			const startMove = (type: 'touch' | 'wheel', value: number) => {
				// 记录 flag
				moveFlag.onScroll = type
				moveFlag.move = value
				moveFlag.lastTime = Date.now()

				// 执行前置钩子
				options?.beforeHook?.(el)
				// 执行移动钩子
				options?.moveHook?.(el, moveFlag.move)
			}
			/**
			 * 保持窗口移动
			 */
			const keepMove = (value: number) => {
				// 增加移动值
				moveFlag.move += value
				// 计算速度
				const nowDate = Date.now()
				if (!moveFlag.lastTime) return
				const deltaTime = nowDate - moveFlag.lastTime
				moveFlag.lastTime = nowDate
				moveFlag.speedList.push(value / deltaTime)

				// 执行移动钩子
				options?.moveHook?.(el, moveFlag.move)
			}
			/**
			 * 结束窗口移动
			 */
			const endMove = () => {
				// 保留自己要的数据
				const move = moveFlag.move
				const speedList = moveFlag.speedList

				// 移动距离判定
				if (
					options?.moveCondition &&
					Math.abs(move) >= getPxValue(options.moveCondition.minMove)
				) {
					if (move > 0)
						el.dispatchEvent(
							new CustomEvent('v-move-right', { detail: move }),
						)
					else
						el.dispatchEvent(
							new CustomEvent('v-move-left', { detail: move }),
						)
				} else if (
					options?.speedCondition &&
					Math.abs(move) >= getPxValue(options.speedCondition.minMove)
				) {
					// 速度判定
					const endSpeedList = speedList.toReversed().slice(0, 10)
					let endSpeed = 0
					for (const speed of endSpeedList) {
						endSpeed += speed
					}
					endSpeed /= endSpeedList.length
					if (Math.abs(endSpeed) > options.speedCondition.minSpeed) {
						if (endSpeed > 0)
							el.dispatchEvent(
								new CustomEvent('v-move-right', {
									detail: move,
								}),
							)
						else
							el.dispatchEvent(
								new CustomEvent('v-move-left', {
									detail: move,
								}),
							)
					}
				}

				// 执行结束钩子
				binding.value?.endHook?.(el)

				// 重置数据
				moveFlag.onScroll = 'none'
				moveFlag.lastTime = 0
				moveFlag.speedList = []
				moveFlag.move = 0
			}

			// 添加监听
			const controller = new AbortController()
			const listenerOptions = { signal: controller.signal }
			el.addEventListener('wheel', chatWheelEvent, {
				...listenerOptions,
				passive: false,
			})
			el.addEventListener(
				'touchstart',
				chatMoveStartEvent,
				listenerOptions,
			)
			el.addEventListener('touchmove', chatMoveEvent, listenerOptions)
			el.addEventListener('touchend', chatMoveEndEvent, listenerOptions)
			;(el as any)._vMoveController = controller
		},
		unmounted(el: T) {
			const controller = (el as any)._vMoveController
			if (!controller) return

			controller.abort()
			delete (el as any)._vMoveController
		},
	}
}

/**
 * 监听元素左滑动/右滑动事件
 * 当元素被左滑动时，触发 'v-move-left' 事件
 * 当元素被右滑动时，触发 'v-move-right' 事件
 * @example <dom v-move="{
 *     beforeHook: 开始移动前的钩子函数,
 *     moveHook: 移动中的钩子函数,
 *     endHook: 结束移动后的钩子函数,
 *     leftLimit: 左侧移动限制,
 *     rightLimit: 右侧移动限制,
 *     speedCondition: 根据速度判定是否触发移动事件的条件,
 *     moveCondition: 根据移动距离判定是否触发移动事件的条件,
 * }"
 * onV-move-left="(move) => 左滑动事件(move)"
 * onV-move-right="(move) => 右滑动事件(move)"
 * />
 */
export const vMove = createVMove<any>()

function createVLongHover(): ObjectDirective<HTMLElement, undefined> {
	const { handle: userHoverHandle, handleEnd: userHoverEnd } = useStayEvent(
		(event: MouseEvent) => {
			return { x: event.clientX, y: event.clientY }
		},
		{
			onFit: (eventData, ctx: HTMLElement) => {
				ctx.dispatchEvent(
					new CustomEvent('v-long-hover', { detail: eventData }),
				)
			},
			onLeave: (ctx: HTMLElement) => {
				ctx.dispatchEvent(new CustomEvent('v-long-hover-end'))
			},
		},
		495,
	)
	return {
		mounted(el: HTMLElement) {
			const controller = new AbortController()
			const options = { signal: controller.signal }

			el.addEventListener(
				'mouseenter',
				(event) => {
					userHoverHandle(event, el)
				},
				options,
			)
			el.addEventListener(
				'mousemove',
				(event) => {
					userHoverHandle(event, el)
				},
				options,
			)
			el.addEventListener(
				'mouseleave',
				(event) => {
					userHoverEnd(event)
				},
				options,
			)
			;(el as any)._vLongHoverController = controller
		},
		unmounted(el: HTMLElement) {
			const controller = (el as any)._vLongHoverController
			if (!controller) return

			controller.abort()
			delete (el as any)._vLongHoverController
		},
	}
}

/**
 * 监听元素长时间悬停事件
 * 当元素被鼠标悬停超过一定时间后，触发 'v-long-hover' 事件
 * 当鼠标移出元素时，触发 'v-long-hover-end' 事件
 * @example <dom v-long-hover
 * onV-long-hover="(eventData) => 长悬停事件(eventData)"
 * onV-long-hover-end="() => 长悬停结束事件()"
 * />
 */
export const vLongHover = createVLongHover()

type VTooltipBinding<T extends Component> =
	| T
	| VueCompData<T>
	| (() => T | VueCompData<T>)
	| ((eventData: { x: number; y: number }) => T | VueCompData<T>)

function resolveBinding<T extends Component>(
	binding: VTooltipBinding<T>,
	eventData: { x: number; y: number },
): VueCompData<T> {
	if (typeof binding === 'function') {
		const result =
			binding.length === 0
				? (binding as () => T | VueCompData<T>)()
				: (
						binding as (eventData: {
							x: number
							y: number
						}) => T | VueCompData<T>
					)(eventData)
		if ('comp' in result) return result
		return { comp: result } as VueCompData<T>
	} else if ('comp' in binding) {
		return binding
	} else {
		return { comp: binding, props: {} } as VueCompData<T>
	}
}

/**
 * 监听元素长时间悬停事件以显示提示工具
 * 当元素被鼠标悬停超过一定时间后，显示提示工具
 * 当鼠标移出元素时，关闭提示工具
 * @modifiers debug - 调试模式，启用后悬停结束时不会关闭提示工具
 * @example <dom v-tooltip="{
 *     comp: 提示组件,
 *     props: 传递给提示组件的属性,
 *     model: 传递给提示组件的 v-model 数据,
 *     emit: 传递给提示组件的事件,
 * }" />
 */
export const vTooltip = {
	mounted<T extends Component>(
		el: HTMLElement,
		binding: DirectiveBinding<VTooltipBinding<T>> & {
			modifiers: { debug?: boolean }
		},
	) {
		const controller = new AbortController()
		const options = { signal: controller.signal }
		;(vLongHover as any).mounted(el)
		;(el as any)._vTooltipData = {
			instance: undefined,
			controller,
			tmpController: undefined,
		}
		const data = (el as any)._vTooltipData as {
			instance: TooltipController | undefined
			controller: AbortController
			tmpController: AbortController | undefined
		}

		el.addEventListener(
			'v-long-hover',
			(ev: Event) => {
				const event = ev as CustomEvent<{ x: number; y: number }>
				const detail = event.detail
				const compData = resolveBinding(binding.value, detail)
				data.instance = addTooltip(compData, {
					x: detail.x,
					y: detail.y,
				})
				const tmpController = new AbortController()
				data.tmpController = tmpController

				window.addEventListener(
					'mousemove',
					() => {
						if (!data.instance) return
						data.instance.close()
						data.instance = undefined
						data.tmpController?.abort()
						data.tmpController = undefined
					},
					{ signal: tmpController.signal, capture: true },
				)
			},
			options,
		)

		el.addEventListener(
			'v-long-hover-end',
			() => {
				if (binding.modifiers?.debug) return
				data.instance?.close()
				data.instance = undefined
				data.tmpController?.abort()
				data.tmpController = undefined
			},
			options,
		)
	},

	unmounted(el: HTMLElement) {
		;(vLongHover as any).unmounted(el)

		const data = (el as any)._vTooltipData as {
			instance: TooltipController | undefined
			controller: AbortController
			tmpController: AbortController | undefined
		}
		data.tmpController?.abort()
		data.instance?.close()
		data.controller.abort()

		delete (el as any)._vTooltipData
	},
}
