import Viewer from '@renderer/components/Viewer.vue'
import { inject, TemplateRef } from 'vue'

export function useViewer():
	| TemplateRef<undefined | InstanceType<typeof Viewer>>
	| undefined {
	return inject<TemplateRef<undefined | InstanceType<typeof Viewer>>>(
		'viewer',
	)
}
