import { useDailyFlag } from '@renderer/function/composable/useDailyFlag'

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
