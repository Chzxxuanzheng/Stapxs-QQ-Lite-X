import { Msg } from '@renderer/function/model/msg'
import { inject } from 'vue'

export function useCurrentMsg(): Msg | undefined {
	const data = inject('message-content')
	if (data instanceof Msg) return data
	return undefined
}
