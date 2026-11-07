import MergePan from '@renderer/components/MergePan.vue'
import { inject, TemplateRef } from 'vue'

export function useMergePan():
	| TemplateRef<InstanceType<typeof MergePan>>
	| undefined {
	return inject<TemplateRef<InstanceType<typeof MergePan>>>('mergePan')
}
