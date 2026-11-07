import { onUnmounted } from 'vue'

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
