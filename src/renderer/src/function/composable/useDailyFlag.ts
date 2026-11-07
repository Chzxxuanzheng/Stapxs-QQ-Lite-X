import { shallowRef, ShallowRef, watch } from 'vue'
import { useLocalStorage } from './useLocalStorage'

const timesEnd = useLocalStorage('last-times', 0)
const uptime = Date.now()
if (uptime > timesEnd.value) {
	const dailyFlag = useLocalStorage('daily-flag', '')
	timesEnd.value = uptime + 24 * 60 * 60 * 1000
	dailyFlag.value = ''
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
