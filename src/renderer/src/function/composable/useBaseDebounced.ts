import { shallowRef, ShallowRef, watch } from 'vue'

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
	const result = shallowRef<T>(getValue())
	let timeout: ReturnType<typeof setTimeout>
	watch(getValue, (newValue) => {
		clearTimeout(timeout)
		timeout = setTimeout(() => {
			result.value = newValue
		}, delay)
	})
	return result
}
