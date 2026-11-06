/*
 * @FileDescription: 定义模型用的工具
 * @Author: Mr.Lee
 * @Date: 2025/07/15
 * @Version: 1.0
 * @Description: 仅仅是些平平无奇的工具啦~
 */

import { markRaw, shallowReactive } from 'vue'
import { getTimeConfig, getTrueLang } from '../utils/systemUtil'

export function autoReactive<T extends new (...args: any[]) => any>(con: T): T {
	return class extends con {
		constructor(...args: any[]) {
			super(...args)
			const reactiveProxy = shallowReactive(this)

			if (reactiveProxy.init) reactiveProxy.init()
			return reactiveProxy
		}
	} as T
}

export function autoMarkRaw<T extends new (...args: any[]) => any>(con: T): T {
	return class extends con {
		constructor(...args: any[]) {
			super(...args)
			return markRaw(this)
		}
	} as T
}

export function formatTime(
	time: number,
	config:
		| 'year'
		| 'month'
		| 'week'
		| 'day'
		| 'hour'
		| 'minute'
		| 'second'
		| 'auto' = 'auto',
): string {
	const lang = getTrueLang()
	let timeConfig: Intl.DateTimeFormatOptions = {}
	if (config === 'auto') timeConfig = getTimeConfig(new Date(time))
	else
		switch (config) {
			case 'year':
				timeConfig.year = 'numeric'

			case 'month':
				timeConfig.month = '2-digit'

			case 'week':
				if (config === 'week') timeConfig.weekday = 'short'

			case 'day':
				timeConfig.day = '2-digit'

			case 'hour':
				timeConfig.hour = 'numeric'

			case 'minute':
				timeConfig.minute = 'numeric'

			case 'second':
				timeConfig.second = 'numeric'
				break
		}
	return Intl.DateTimeFormat(lang, timeConfig).format(time)
}
