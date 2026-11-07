import { shallowRef, ShallowRef } from 'vue'
import { useEventListener } from './useEventListener'

let viewportUnitsCache:
	| { vw: ShallowRef<number>; vh: ShallowRef<number> }
	| undefined
export function useViewportUnits(): {
	vw: ShallowRef<number>
	vh: ShallowRef<number>
} {
	if (viewportUnitsCache) return viewportUnitsCache

	const vw = shallowRef(window.innerWidth / 100)
	const vh = shallowRef(window.innerHeight / 100)

	useEventListener(window, 'resize', () => {
		vw.value = window.innerWidth / 100
		vh.value = window.innerHeight / 100
	})

	viewportUnitsCache = { vw, vh }

	return { vw, vh }
}
