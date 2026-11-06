/**
 * 触控板滚动蒙版
 * 用来连续返回一系列滚动事件处理,自带中断处理
 */
export function wheelMask(
	process: (event: WheelEvent) => boolean,
	removeHook: () => void,
): Promise<void> {
	// 中断回调
	const mask = document.createElement('div')
	let resove!: () => void
	const promise = new Promise<void>((resolve) => {
		resove = resolve
	})
	const remove = () => {
		document.body.removeChild(mask)
		removeHook()
		resove()
	}
	let wheelTimeOut = setTimeout(remove, 100) as unknown as number
	mask.style.position = 'fixed'
	mask.style.top = '0'
	mask.style.left = '0'
	mask.style.width = '100vw'
	mask.style.height = '100vh'
	mask.style.zIndex = '9999'
	mask.style.backgroundColor = 'rgba(0, 0, 0, 0)'
	mask.addEventListener(
		'wheel',
		(event) => {
			event.preventDefault()
			if (!process(event)) return
			// 中断回调
			clearTimeout(wheelTimeOut)
			wheelTimeOut = setTimeout(remove, 100) as unknown as number
		},
		{ passive: false },
	)
	document.body.appendChild(mask)
	return promise
}
