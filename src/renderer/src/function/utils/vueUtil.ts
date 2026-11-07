/**
 * @description: vue工具函数
 * 只允许导入 vue 的工具函数
 */

// oxlint-disable-next-line no-restricted-imports
import { reactive, type UnwrapRef } from 'vue'

type ScopedState<T> = UnwrapRef<T>

export function defineScopedState<ARG extends any[], RETURN extends object>(
	setup: (...args: ARG) => Promise<RETURN>,
): (...args: ARG) => Promise<ScopedState<RETURN>>
export function defineScopedState<ARG extends any[], RETURN extends object>(
	setup: (...args: ARG) => RETURN,
): (...args: ARG) => ScopedState<RETURN>
export function defineScopedState<ARG extends any[], RETURN extends object>(
	setup: (...args: ARG) => RETURN | Promise<RETURN>,
): (...args: ARG) => ScopedState<RETURN> | Promise<ScopedState<RETURN>> {
	return (...args: ARG) => {
		const state = setup(...args)
		if (state instanceof Promise)
			return state.then((d) => reactive(d)) as Promise<
				ScopedState<RETURN>
			>
		else return reactive(state) as ScopedState<RETURN>
	}
}
