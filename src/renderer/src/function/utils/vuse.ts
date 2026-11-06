/*
 * @FileDescription: vue use组合函数封装
 * @Author: Mr.Lee
 * @Date: 2025/08/18
 * @Version: 1.0
 * @Description: 封装的一些vue组合函数
 */

import {
	computed,
	ComputedRef,
	inject,
	onMounted,
	onUnmounted,
	// oxlint-disable-next-line no-restricted-imports
	ref,
	Ref,
	shallowRef,
	ShallowRef,
	TemplateRef,
	watch,
} from 'vue'
import { MenuEventData } from '../elements/information'
import { pastTimeFormat } from './systemUtil'
import { Msg } from '../model/msg'
import Viewer from '@renderer/components/Viewer.vue'
import MergePan from '@renderer/components/MergePan.vue'

/**
 * 用来封装一个停留事件的处理, 支持传递额外上下文
 * 适用于鼠标或触摸事件，停留一段时间后触发
 * 例如：长按菜单,鼠标悬浮等
 * @param getPos 从事件里提取坐标的函数
 * @param continueTime 成功的持续时间
 * @param hooks 钩子函数 支持成功时,失败时,退出时
 * @returns {
 *   acceptStartEvent: (event: T, exArg?: E) => void, // 接受开始事件
 *   acceptUpdateEvent: (event: T) => void, // 接受更新事件
 *   acceptEndEvent: (event: T) => void // 接受结束事件
 * }
 */
export function useStayEvent<T extends Event, C>(
	getPos: (event: T) => { x: number; y: number } | void,
	hooks: {
		onFit?:
			| ((eventData: MenuEventData, ctx: C) => void)
			| ((eventData: MenuEventData) => void)
			| ((ctx: C) => void)
			| (() => void)
		onLeave?: ((ctx: C) => void) | (() => void)
		onFail?: ((ctx: C) => void) | (() => void)
	},
	continueTime: number,
): {
	handle: (event: T, ctx?: C | undefined) => void
	handleEnd: (event: T) => void
} {
	// 表示结束
	let end: boolean = true
	// 表示是否符合条件
	let fit: boolean = false
	// 记录开始位置
	let startPos: { x: number; y: number } | undefined = undefined
	// settiemout
	let timeout: number
	// 开始时事件数据
	let startEventData: MenuEventData
	// 额外参数
	let ctx: C | undefined
	const handle = (event: T, _ctx?: C | undefined) => {
		if (end) _acceptStartEvent(event, _ctx)
		else _acceptUpdateEvent(event)
	}
	const handleEnd = (event: T) => {
		if (end) return
		_acceptEndEvent(event)
	}
	const _acceptStartEvent = (event: T, _ctx?: C | undefined) => {
		fit = false
		end = false
		ctx = _ctx
		startPos = getPos(event) as { x: number; y: number }
		if (!startPos) return
		startEventData = {
			x: startPos.x,
			y: startPos.y,
			target: event.target as HTMLElement,
		}
		timeout = setTimeout(() => {
			fit = true
			_callFit()
		}, continueTime) as unknown as number
	}
	const _acceptUpdateEvent = (event: T) => {
		if (end) return
		const pos = getPos(event)
		if (!pos) return
		if (!startPos) return
		// 位置改变
		if (
			Math.abs(pos.x - startPos.x) > 10 ||
			Math.abs(pos.y - startPos.y) > 10
		) {
			_setEnd()
		}
	}
	const _acceptEndEvent = (event: T) => {
		if (end) return
		_setEnd()
		if (getPos(event)) _acceptUpdateEvent(event)
	}
	// ==工具函数=====================================
	const _setEnd = () => {
		end = true
		if (fit) _callLeave()
		else _callFail()
		// 清除定时器
		clearTimeout(timeout)
	}
	const _callFit = () => {
		if (hooks.onFit?.length === 0) {
			;(hooks.onFit as () => void)()
		} else if (hooks.onFit?.length === 1) {
			let arg
			if (ctx) arg = ctx
			else arg = startEventData
			;(hooks.onFit as (arg: MenuEventData | C) => void)(arg)
		} else if (hooks.onFit?.length === 2) {
			;(hooks.onFit as (eventData: MenuEventData, ctx?: C) => void)(
				startEventData,
				ctx,
			)
		}
	}
	const _callLeave = () => {
		if (hooks.onLeave?.length === 0) {
			;(hooks.onLeave as () => void)()
		} else if (hooks.onLeave?.length === 1) {
			;(hooks.onLeave as (ctx?: C) => void)(ctx)
		}
	}
	const _callFail = () => {
		if (hooks.onFail?.length === 0) {
			;(hooks.onFail as () => void)()
		} else if (hooks.onFail?.length === 1) {
			;(hooks.onFail as (ctx?: C) => void)(ctx)
		}
	}
	return {
		handle,
		handleEnd,
	}
}

/**
 * 有延迟的但个元素的watch
 * @param getValue 获取值的函数
 * @param delay 延迟时间，默认 500ms
 * @returns 返回一个Ref对象，当尝过delay时长未更新后更新
 */
export function useBaseDebounced<T>(
	getValue: () => T,
	delay: number = 500,
): ShallowRef<T> {
	const result: ShallowRef<T> = shallowRef(getValue())
	let timeout: ReturnType<typeof setTimeout>
	watch(getValue, (newValue) => {
		clearTimeout(timeout)
		timeout = setTimeout(() => {
			result.value = newValue
		}, delay)
	})
	return result
}

/**
 * 自动卸载的定时器
 * @param callback 回调
 * @param interval 计时
 * @returns
 */
export function useInterval(
	callback: () => void,
	interval: number,
): ReturnType<typeof setInterval> {
	const timer = setInterval(callback, interval)
	onUnmounted(() => {
		clearInterval(timer)
	})
	return timer
}

/**
 * 使用帧循环
 * @param callback
 * @returns 一个停止函数
 */
export function useFrame(callback: () => void): () => void {
	let stopFlag = false
	const loop = () => {
		callback()
		if (stopFlag) return
		requestAnimationFrame(loop)
	}
	requestAnimationFrame(loop)
	onUnmounted((_) => (stopFlag = true))
	return () => (stopFlag = true)
}

export function usePasttime(time: number): ComputedRef<string> {
	const trigger = shallowRef(0)
	useInterval(() => {
		trigger.value++
	}, 1000 * 10)
	return computed(() => {
		void trigger.value
		return pastTimeFormat(time)
	})
}

/**
 * 使用ResizeObserver监听元素尺寸变化，自动在组件卸载时断开连接
 * @param cb 变化时的回调
 * @param domRef 要监听的元素引用
 * @returns
 */
export function useResizeObserver(
	cb,
	...domRef: TemplateRef[]
): ResizeObserver {
	const observer = new ResizeObserver(cb)
	onMounted(() => {
		for (const d of domRef) {
			if (!d.value) continue
			if (d.value instanceof Element) observer.observe(d.value)
			else if ((d.value as any).$el instanceof Element)
				observer.observe((d.value as any).$el)
		}
	})
	onUnmounted(() => observer.disconnect())
	return observer
}

/**
 * 使用事件监听器
 * @param target 目标dom
 * @param event 事件
 * @param callback 回调
 */
export function useEventListener<T extends keyof DocumentEventMap>(
	target: Document | Window,
	event: T,
	callback: (event: DocumentEventMap[T]) => void,
	capture?: boolean,
): void
export function useEventListener(
	target: Document | Window,
	event: Exclude<string, keyof DocumentEventMap>,
	callback: ((event: Event) => void) | ((event: CustomEvent) => void),
	capture?: boolean,
): void
export function useEventListener(
	target: Document | Window,
	event: string,
	callback: (event: any) => void,
	capture: boolean = false,
): void {
	onMounted(() => target.addEventListener(event, callback, { capture }))
	onUnmounted(() => target.removeEventListener(event, callback, { capture }))
}

let viewportUnitsCache:
	| { vw: ShallowRef<number>; vh: ShallowRef<number> }
	| undefined
export function useViewportUnits(): {
	vw: ShallowRef<number>
	vh: ShallowRef<number>
} {
	if (viewportUnitsCache) return viewportUnitsCache

	const vw = shallowRef(window.innerWidth / 100)
	const vh = shallowRef(window.innerHeight / 100)

	const updateUnits = () => {
		vw.value = window.innerWidth / 100
		vh.value = window.innerHeight / 100
	}

	onMounted(() => {
		window.addEventListener('resize', updateUnits)
	})

	onUnmounted(() => {
		window.removeEventListener('resize', updateUnits)
	})

	viewportUnitsCache = { vw, vh }

	return { vw, vh }
}

/**
 * 添加一个按键监听，支持组合键，注意，不支持多普通键组合，如`a+b`
 * @param keys 按键
 * @param callback 回调，返回true则阻断事件传播
 */
export function useKeyboard(
	...args: [string, ...string[], () => boolean | undefined | void]
) {
	if (args.length > 2) {
		const cb = args.at(-1) as () => boolean | undefined
		for (const key of args.slice(0, -1)) {
			if (typeof key !== 'string') continue
			useKeyboard(key, cb)
		}
		return
	}
	// 支持组合键，如 'ctrl+shift+alt+s' 或 'a+b+c'
	const keyList = args[0]
		.toLowerCase()
		.split('+')
		.map((k) => k.trim())
	const cb = args[1] as () => boolean | undefined
	const modifierKeys = ['ctrl', 'shift', 'alt', 'meta']

	useEventListener(document, 'keydown', (event) => {
		let allMatch = true

		for (const key of keyList) {
			if (modifierKeys.includes(key)) {
				if (!event[`${key}Key`]) {
					allMatch = false
					break
				}
			}
			// 普通键
			else if (event.key.toLowerCase() !== key) {
				allMatch = false
				break
			}
		}

		// 只在所有键都匹配时触发
		if (allMatch) {
			const re = cb()
			if (re) {
				event.preventDefault()
				event.stopPropagation()
			}
		}
	})
}

function localStorageGetItem(key: string): string | null {
	// oxlint-disable-next-line no-restricted-globals
	return localStorage.getItem(key)
}

function localStorageSetItem(key: string, value: string): void {
	// oxlint-disable-next-line no-restricted-globals
	localStorage.setItem(key, value)
}

/**
 * 使用 localStorage
 * @param key 保存的键值
 * @param defaultValue 默认值
 * @returns
 */
export function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
	const parser = (data: string) => {
		return JSON.parse(data).value as T
	}
	const serializer = (data: T) => {
		return JSON.stringify({ value: data })
	}
	const storageData = localStorageGetItem(key)
	const data = ref<T>(storageData ? parser(storageData) : defaultValue)
	watch(
		data,
		(newValue) => {
			localStorageSetItem(key, serializer(newValue))
		},
		{ deep: true },
	)
	return data as Ref<T>
}

const dailyFlag = useLocalStorage('daily-flag', '')

/**
 * 每日标记，一个每天重置一次的每日标记
 * @param flag
 */
export function useDailyFlag(flag: string): ShallowRef<boolean> {
	const value = shallowRef(dailyFlag.value.includes(`$#${flag}`))
	watch(value, (newValue) => {
		if (newValue === false) throw new Error('不能将每日标记设为 false')
		dailyFlag.value += `$#${flag}`
	})
	return value
}

/**
 * 对 useDailyFlag 的封装，自动做执行
 * @see useDailyFlag
 * @param flag
 * @param callback
 */
export function useDailyDo(flag: string, callback: () => void | Promise<void>) {
	const flagRef = useDailyFlag(flag)
	if (!flagRef.value) {
		callback()
		flagRef.value = true
	}
}

/**
 * 定时更新一个数值，用于刷新视图
 * @param interval
 */
export function useUpdate(interval: number = 1000): ShallowRef<boolean> {
	const re = shallowRef(false)
	useInterval(() => {
		re.value = !re.value
	}, interval)
	return re
}

let hasUsedBackHoldup = false
let stopFlag = false
const hooks: (() => boolean | Promise<boolean>)[] = []
/**
 * 返回事件传播的阻断函数，适用于需要在事件回调里阻断事件传播的场景
 * @param hookFunc 事件回调，返回true则阻断事件传播
 * @returns exit 退出函数，退出应用
 */
export function useBackHoldup(hookFunc?: () => boolean | Promise<boolean>) {
	if (!hasUsedBackHoldup) {
		history.pushState('ssqqwebX', '', location.href)
		const runHooks = async () => {
			for (const hook of hooks) {
				const re = await hook()
				if (re) return
			}
		}
		window.addEventListener('popstate', () => {
			if (!stopFlag) history.pushState('ssqqwebX', '', location.href)
			else history.back()
			runHooks()
		})
		hasUsedBackHoldup = true
	}
	if (hookFunc) hooks.push(hookFunc)
	return () => {
		stopFlag = true
		history.back()
	}
}

export function useCurrentMsg(): Msg | undefined {
	const data = inject('message-content')
	if (data instanceof Msg) return data
	return undefined
}

export function useViewer():
	| TemplateRef<undefined | InstanceType<typeof Viewer>>
	| undefined {
	return inject<TemplateRef<undefined | InstanceType<typeof Viewer>>>(
		'viewer',
	)
}

export function useMergePan():
	| TemplateRef<InstanceType<typeof MergePan>>
	| undefined {
	return inject<TemplateRef<InstanceType<typeof MergePan>>>('mergePan')
}
