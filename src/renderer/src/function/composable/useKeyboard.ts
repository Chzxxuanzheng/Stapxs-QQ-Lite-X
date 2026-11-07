import { useEventListener } from '@renderer/function/composable/useEventListener'

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
