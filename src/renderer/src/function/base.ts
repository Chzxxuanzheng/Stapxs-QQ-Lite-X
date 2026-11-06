/*
 * @FileDescription: 基础功能模块
 * @Author: Stapxs
 * @Date: 2022/10/20
 * @Version: 1.0
 * @Description: 此模块主要为程序相关的基础功能
 */

import { shallowReactive } from 'vue'
import { PopInfoElem } from './elements/system'
import useOptionStore from '@renderer/state/option'
import useRuntimeData from '@renderer/state/runtimeData'

// =============== 日志 ===============

export type LogType = 'WS' | 'UI' | 'ERR' | 'INFO' | 'DEBUG' | 'SYSTEM'

const logTypeInfo: Record<LogType, [string, string]> = {
	WS: ['7abb7e', 'fff'],
	UI: ['b573f7', 'fff'],
	ERR: ['ff5370', 'fff'],
	INFO: ['99b3db', 'fff'],
	DEBUG: ['677480', 'fff'],
	SYSTEM: ['e5a5a9', 'fff'],
}

function normallyConditionCheck(type: LogType): boolean {
	const option = useOptionStore()
	const runtimeData = useRuntimeData()
	const logLevel = option.options.log_level
	if (logLevel === 'all') return true
	if (logLevel === 'debug' && (type === 'DEBUG' || type === 'UI')) return true
	if (logLevel === 'info' && type === 'INFO') return true
	if (logLevel === 'err' && type === 'ERR') return true
	if (runtimeData.tags.dev && type === 'SYSTEM') return true
	return false
}

/**
 * 打印一条日志
 * @param type 日志类型
 * @param args 日志内容
 * @param data 附加数据
 * @param hidden 是否隐藏日志（不显示调用者信息）
 * @param deep 调用深度（用于获取调用者信息）
 * @private
 */
function printLog(
	type: LogType,
	args: string,
	data: any,
	hidden: boolean,
	deep: number,
) {
	deep++
	const error = new Error()
	// 浏览器类型，用于判断是不是 webkit
	const isWebkit = /webkit/i.test(navigator.userAgent)
	// 从调用栈中获取调用者信息
	let from = undefined as string | undefined
	const stack = error.stack?.split('\n').at(deep)
	if (stack) {
		if (isWebkit ? stack.startsWith('@') : !stack.includes('at Logger')) {
			// 取出链接部分，去除括号
			from = stack.replaceAll(/\(|\)/g, '').split(' ').pop() || ''
			from = from.replace(
				'webpack-internal:///./',
				'webpack-internal:///',
			)
			if (from.startsWith('@')) {
				from = from.substring(1)
			}
			if (from.startsWith('webpack-internal:///node_modules')) {
				from = undefined
			}

			// zen(基于火狐)拿出来的东西和上面的不一样,我不知道上面的啥意思
			// 下面的是我针对火狐的删连接的代码
			// 火狐的原始格式:onclose @http://localhost:8080/src/function/connect.ts?t=1753012335169:220:12
			//   -- by Mr.Lee
			if (from) {
				from = from
					.replace(`${window.location.origin}/`, '')
					.replace(/\?t=\d+:/, ' ')
					.replace('/', '.')
			}
		}
	}
	// 打印日志
	const { message, styles } = buildLogParams(type, args, hidden, from)
	logOutput(message, styles, data)
}

function buildLogParams(
	type: LogType,
	args: string,
	hidden: boolean,
	from?: string,
): { message: string; styles: string[] } {
	const hasFrom = !hidden && from
	if (hasFrom) {
		return {
			message: `%c${type}%c${from}%c\n${args}`,
			styles: [
				`background:#${logTypeInfo[type][0]};color:#${logTypeInfo[type][1]};border-radius:7px 0 0 7px;padding:2px 4px 2px 7px;margin-bottom:7px;`,
				'background:#e3e8ec;color:#000;padding:2px 7px 4px 4px;border-radius:0 7px 7px 0;margin-bottom:7px;',
				'',
			],
		}
	} else {
		return {
			message: `%c${type}%c ${args}`,
			styles: [
				`background:#${logTypeInfo[type][0]};color:#${logTypeInfo[type][1]};border-radius:7px;padding:2px 4px 2px 7px;margin-bottom:7px;`,
				'',
				'',
			],
		}
	}
}

function logOutput(
	message: string,
	styles: string[],
	data: any,
	useStyles = true,
) {
	if (!data) data = ''
	if (useStyles) {
		// oxlint-disable-next-line no-console
		console.log(message, ...styles, data)
	} else {
		// oxlint-disable-next-line no-console
		console.log(message, data)
	}
}

export const logger = {
	/**
	 * 输出一条日志
	 * @param mode 日志类型
	 * @param args 日志内容
	 */
	add(
		type: LogType,
		args: string,
		data = '' as any,
		hidden = false,
		deep = 0,
	) {
		deep++
		// PS：WS, UI, ERR, INFO, DEBUG
		// all 将会输出以上全部类型，debug 将会输出 DEBUG、UI，info 将会输出 INFO，err 将会输出 ERR
		// api 通信不受这个控制,受api_log控制
		if (!normallyConditionCheck(type)) return
		printLog(type, args, data, hidden, deep)
	},
	info(args: string, hidden = false, deep = 0) {
		deep++
		this.add('INFO', args, undefined, hidden, deep)
	},
	error(e: Error | null, args: string, hidden = false, deep = 0) {
		deep++
		if (e) {
			this.add('ERR', args + '\n', e, hidden, deep)
		} else {
			this.add('ERR', args, undefined, hidden, deep)
		}
	},
	debug(args: string, hidden = false, deep = 0) {
		deep++
		this.add('DEBUG', args, undefined, hidden, deep)
	},
	system(args: string, deep = 0) {
		deep++
		this.add('SYSTEM', args, undefined, true, deep)
	},
}

// =============== 系统消息 ===============

export type PopType = 'INFO' | 'ERR'

const PopIconMap: Record<PopType, string> = {
	INFO: 'circle-info',
	ERR: 'circle-exclamation',
}

export const popInfo = {
	/**
	 *
	 * @param typeInfo 消息类型
	 * @param args 消息内容
	 * @param isAutoClose 是否自动关闭（默认为 true）
	 */
	add(type: PopType, args: string, isAutoClose = true) {
		const data: PopInfoElem = {
			id: popList.length,
			svg: PopIconMap[type],
			text: args,
			autoClose: isAutoClose,
		}
		popList.splice(popList.length, 0, data)
		// 创建定时器
		if (data.autoClose) {
			setTimeout(() => {
				this.remove(data.id)
			}, 5000)
		}
	},

	info(args: string, isAutoClose = true) {
		this.add('INFO', args, isAutoClose)
	},

	error(args: string, isAutoClose = true) {
		this.add('ERR', args, isAutoClose)
	},

	/**
	 * 移除一条消息
	 * @param id 消息编号
	 */
	remove(id: number) {
		const index = popList.findIndex((item) => {
			return item.id === id
		})
		if (index !== -1) {
			popList.splice(index, 1)
		}
	},

	/**
	 * 清空所有消息
	 */
	clear() {
		// 因为消息是有动画的，所以需要延迟清空
		setTimeout(() => {
			popList.splice(0, popList.length)
		}, 300)
	},
}

export const popList: PopInfoElem[] = shallowReactive([])
