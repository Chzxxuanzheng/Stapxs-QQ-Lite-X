/*
 * @FileDescription: 数据结构相关模型
 * @Author: Mr.Lee
 * @Date: 2025/07/18
 * @Version: 1.0
 * @Description: 定义数据结构
 */

import {
	getPinyin,
	matchPinyin,
	PinYinData,
} from '@renderer/function/utils/pinyin'
import {
	getTimeConfig,
	getTrueLang,
	getViewTime,
} from '@renderer/function/utils/systemUtil'

/**
 * 包含拼音的名称类
 * 可以通过matchStr方法来匹配字符串
 * 支持中文、拼音、首字母等匹配方式
 * @extends String
 */
export class Name extends String {
	private readonly _pinyinData: PinYinData

	constructor(private readonly _name: string) {
		super(_name)
		this._pinyinData = getPinyin(this._name)
	}

	matchStr(str: string): boolean {
		return matchPinyin(this._pinyinData, str)
	}

	get py(): string {
		return this._pinyinData.main[0] || ''
	}
}

/**
 * 对时间的封装
 * 自动进行 getViewTime 处理
 * 自带格式化方法
 */
export class Time {
	private readonly _time: number

	constructor(time: number | string) {
		if (typeof time === 'string') this._time = new Date(time).getTime()
		else this._time = time
		this._time = getViewTime(this._time)
	}

	format(
		start:
			| 'year'
			| 'month'
			| 'week'
			| 'day'
			| 'hour'
			| 'minute'
			| 'second'
			| 'auto' = 'auto',
		end:
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
		if (end === 'auto') end = 'minute'
		if (start === 'auto') timeConfig = getTimeConfig(new Date(this._time))
		else
			switch (start) {
				case 'year':
					timeConfig.year = 'numeric'
					if (end === 'year') break

				case 'month':
					timeConfig.month = '2-digit'
					if (end === 'month') break

				case 'week':
					if (start === 'week') timeConfig.weekday = 'short'
					if (end === 'week') break

				case 'day':
					timeConfig.day = '2-digit'
					if (end === 'day') break

				case 'hour':
					timeConfig.hour = 'numeric'
					if (end === 'hour') break

				case 'minute':
					timeConfig.minute = 'numeric'
					if (end === 'minute') break

				case 'second':
					timeConfig.second = 'numeric'
					break
			}
		return Intl.DateTimeFormat(lang, timeConfig).format(this._time)
	}

	get time(): number {
		return this._time
	}
}
