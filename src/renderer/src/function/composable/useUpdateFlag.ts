import { shallowRef, ShallowRef } from 'vue'
import { useInterval } from './useInterval'

/**
 * 定时更新一个数值，用于刷新视图
 * @param interval
 */
export function useUpdateFlag(interval: number = 1000): ShallowRef<boolean> {
	const re = shallowRef(false)
	useInterval(() => {
		re.value = !re.value
	}, interval)
	return re
}
