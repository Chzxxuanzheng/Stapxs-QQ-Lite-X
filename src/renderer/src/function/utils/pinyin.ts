declare const pinyin: any

export type PinYinData = {
	main: string[]
	short: string[]
}

export function getPinyin(name: string): PinYinData {
	return {
		main: pinyin
			.pinyin(name, {
				heteronym: true,
				compact: true,
				style: 'normal',
			})
			.map((item) => item.join('').toLowerCase()),
		short: pinyin
			.pinyin(name, {
				heteronym: true,
				compact: true,
				style: 'first_letter',
			})
			.map((item) => item.join('').toLowerCase()),
	}
}

export function matchPinyin(pinyinData: PinYinData, matchStr: string): boolean {
	const str = matchStr.toLowerCase()
	for (const py of pinyinData.main) {
		if (py.includes(str)) return true
	}
	for (const pyShort of pinyinData.short) {
		if (pyShort.includes(str)) return true
	}
	return false
}
