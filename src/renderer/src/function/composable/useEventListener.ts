import { onMounted, onUnmounted } from 'vue'

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
