import {
	Component,
	DirectiveBinding,
	markRaw,
	ObjectDirective,
	shallowReactive,
} from 'vue'
import { VueCompData } from '@renderer/function/elements/vueComp'
import { vTooltip } from '@renderer/function/utils/vcmd'
import UserInfoTooltip from '@renderer/components/tooltip/UserInfoTooltip.vue'
import { IUser } from '@renderer/function/model/user'

export const tooltipList: TooltipInfo<Component>[] = shallowReactive([])

export type TooltipInfo<T extends Component> = {
	compData: VueCompData<T>
	pos: { x: number; y: number }
	id: string
}

export type TooltipController = {
	id: string
	close: () => void
}

export function addTooltip<T extends Component>(
	compData: VueCompData<T>,
	pos: { x: number; y: number },
): TooltipController {
	const id = crypto.randomUUID()
	tooltipList.push({ compData, pos, id })
	return {
		id,
		close: () => closeTooltip(id),
	}
}

export function closeTooltip(id: string) {
	const index = tooltipList.findIndex((t) => t.id === id)
	if (index !== -1) {
		tooltipList.splice(index, 1)
	}
}

type VUserTooltipBinding = IUser | number | (() => IUser | number)

export const vUserTooltip: ObjectDirective<HTMLElement, VUserTooltipBinding> = {
	mounted(el: HTMLElement, binding: DirectiveBinding<VUserTooltipBinding>) {
		;(vTooltip as any).mounted(el, {
			value: {
				comp: markRaw(UserInfoTooltip),
				props: { user: binding.value },
			},
		})
	},
	unmounted(el: HTMLElement) {
		;(vTooltip as any).unmounted(el)
	},
}
