import { onMounted, onUnmounted, TemplateRef } from 'vue'

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
