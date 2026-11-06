import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

const useCustomFaceStore = defineStore('customFace', () => {
	const customFaceList = shallowRef<string[] | undefined>()
	return {
		customFaceList,
	}
})

export default useCustomFaceStore
