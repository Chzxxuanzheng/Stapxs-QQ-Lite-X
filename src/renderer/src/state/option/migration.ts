import { loadAllOptions } from '@renderer/state/option/utils'

const migrationFunc = {
	// 0 -> 1
	0: async (old: Record<string, any>): Promise<Record<string, any>> => {
		const tmp = {}
		// 无需变动全局字段
		const NO_CHANGE_FIELDS = [
			'address',
			'auto_connect',
			'language',
			'opt_dark',
			'opt_auto_dark',
			'theme_color',
			'opt_auto_win_color', // 桌面端残留
			'background_img',
			'background_img_blur',
			'opt_fast_animation',
			'initial_scale',
			'fs_adaptation',
			'opt_always_top', // 桌面端残留
			'use_favicon_notice',
			'hide_self_avatar',
			'self_msg_direction',
			'side_bar_width',
			'auto_hide_side_bar',
			'hide_chat_head',
			'hide_chat_bottom',
			'vibrancy',
			'close_notice',
			'bubble_sort_user',
			'close_respond',
			'group_notice_type',
			'show_response_message',
			'send_face',
			'send_key',
			'close_browser', // 桌面端残留
			'close_ga',
			'open_ga_bot',
			'dont_parse_delete',
			'jump_forward',
			'default_multiselect_forward',
			'preview_notice',
			'log_level',
			'proxyUrl',
			'debug_msg',
		]
		for (const key of NO_CHANGE_FIELDS) {
			if (old[key] === undefined) continue
			tmp[key] = old[key]
		}
		// save_password
		const save_password = String(old['save_password'])
		if (save_password === 'true') {
			tmp['auto_save_password'] = true
		} else if (save_password !== undefined) {
			tmp['auto_save_password'] = true
			tmp['saved_password'] = save_password
		}
		// merge_forward_width_type
		if (old['merge_forward_width_type'] !== undefined)
			tmp['merge_forward_width'] = old['merge_forward_width_type']
		// msg_tail
		if (old['msg_taill'] !== undefined) tmp['msg_tail'] = old['msg_taill']
		// 生成全局字段名称
		const re = {}
		for (const key in tmp) {
			re[`#TAG:global##KEY:${key}#`] = tmp[key]
		}
		// top_info
		const top_info = old['top_info'] as undefined | Record<string, number[]>
		if (top_info !== undefined) {
			for (const userId in top_info) {
				re[`#TAG:user=${userId}##KEY:pin_sessions#`] = top_info[userId]
			}
		}
		// notice_group
		const notice_group = old['notice_group'] as
			| undefined
			| Record<string, number[]>
		if (notice_group !== undefined) {
			for (const userId in notice_group) {
				re[`#TAG:user=${userId}##KEY:notice_group#`] =
					notice_group[userId]
			}
		}
		// boxes
		type BoxData = any
		const boxes = old['boxes'] as
			| undefined
			| Record<string, Record<string, BoxData>>
		if (boxes !== undefined) {
			for (const userId in boxes) {
				const data: BoxData[] = []
				for (const boxId in boxes[userId]) {
					data.push(boxes[userId][boxId])
				}
				re[`#TAG:user=${userId}##KEY:boxes#`] = data
			}
		}
		// sessionBoxes
		const sessionBoxes = old['sessionBoxes'] as
			| undefined
			| Record<string, Record<string, string[]>>
		if (sessionBoxes !== undefined) {
			for (const userId in sessionBoxes) {
				const data = {}
				for (const boxId in sessionBoxes[userId]) {
					data[+boxId] = sessionBoxes[userId][boxId]
				}
				re[`#TAG:user=${userId}##KEY:session_box_map#`] = data
			}
		}
		re['_version'] = 1
		return re
	},
	// 1 -> 2
	1: async (old: Record<string, any>): Promise<Record<string, any>> => {
		if (old['#TAG:global##KEY:opt_auto_dark#'])
			old['#TAG:global##KEY:opt_dark_mode#'] = 'auto'
		else if (old['#TAG:global##KEY:opt_dark#'])
			old['#TAG:global##KEY:opt_dark_mode#'] = 'dark'
		else old['#TAG:global##KEY:opt_dark_mode#'] = 'light'
		delete old['#TAG:global##KEY:opt_auto_dark#']
		delete old['#TAG:global##KEY:opt_dark#']
		old['_version'] = 2
		return old
	},
} satisfies Record<
	number,
	(old: Record<string, any>) => Promise<Record<string, any>>
>

/**
 * 检查并且自动迁移旧配置
 * @param old 旧配置对象
 * @returns
 */
export async function checkAndMigration(): Promise<void> {
	// 读取
	const options = (await loadAllOptions(true)) ?? (await oldVersionCheck())
	if (!options) return
	const oldVersion = options['_version'] ?? 0
	const newOptions = await migration(options)
	// 保存
	if (oldVersion !== newOptions['_version']) {
		const saveAllOptions =
			await import('@renderer/state/option/utils').then(
				(mod) => mod.saveAllOptions,
			)
		await saveAllOptions(newOptions)
	}
}

/**
 * 迁移旧配置
 * @param data 旧配置对象
 * @returns 新配置对象
 */
export async function migration(
	data: Record<string, any>,
): Promise<Record<string, any>> {
	// 迁移
	while (true) {
		const version = data['_version'] ?? 0
		if (migrationFunc[version]) {
			data = await migrationFunc[version](data)
		} else {
			break
		}
	}
	return data
}

//#region == 旧版本相关 ===========================================================================
/**
 * 旧版本配置检测
 */
export async function oldVersionCheck(): Promise<
	Record<string, any> | undefined
> {
	// oxlint-disable-next-line no-restricted-globals
	const str = localStorage.getItem('options')
	if (!str) return undefined
	try {
		const data = JSON.parse(str)
		if (data['_version']) return undefined
		return oldOptLoader(data)
	} catch {
		const data = oldWebOptParser(str)
		return oldOptLoader(data)
	}
}

/**
 * 旧版本web反序列化
 * @param str
 * @returns
 */
function oldWebOptParser(str: string): Record<string, any> {
	const data = {}
	const list = str.split('&')
	for (let i = 0; i <= list.length; i++) {
		if (list[i] !== undefined) {
			const opt: string[] = list[i].split(':')
			if (opt.length === 2) {
				data[opt[0]] = opt[1]
			}
		}
	}

	return data
}

/**
 * 旧版本配置加载
 * @param data 配置
 * @returns
 */
function oldOptLoader(data: Record<string, any>): Record<string, any> {
	const options: { [key: string]: any } = {}
	for (const key in data) {
		const value = data[key]
		if (value === 'true' || value === 'false') {
			options[key] = value === 'true'
		} else if (value === 'null') {
			options[key] = null
		} else if (typeof value == 'string') {
			options[key] = decodeURIComponent(value)
			try {
				options[key] = JSON.parse(options[key])
			} catch (_) {
				// ignore
			}
		} else {
			options[key] = value
		}
	}
	return options
}
//#endregion
