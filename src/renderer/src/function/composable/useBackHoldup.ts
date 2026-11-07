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
