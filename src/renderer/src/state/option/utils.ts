function spaceCfgs(): { _version: number } {
	const OPTION_VERSION = 2
	return { _version: OPTION_VERSION }
}

/**
 * 加载所有配置项
 */
export async function loadAllOptions(): Promise<Record<string, any>>
export async function loadAllOptions(
	retUndefined: true,
): Promise<Record<string, any> | undefined>
export async function loadAllOptions(
	retUndefined?: boolean,
): Promise<Record<string, any> | undefined> {
	// oxlint-disable-next-line no-restricted-globals
	const json = localStorage.getItem('options')
	if (!json) {
		if (retUndefined) return undefined
		return spaceCfgs()
	}
	try {
		return JSON.parse(json)
	} catch {
		if (retUndefined) return undefined
		return spaceCfgs()
	}
}

/**
 * 保存所有配置项
 * @param data
 */
export async function saveAllOptions(data: Record<string, any>): Promise<void> {
	const json = JSON.stringify(data)
	// oxlint-disable-next-line no-restricted-globals
	localStorage.setItem('options', json)
}
