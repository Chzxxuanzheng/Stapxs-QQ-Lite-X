// oxlint-disable-next-line no-restricted-imports
import { ref, Ref, watch } from 'vue'

function localStorageGetItem(key: string): string | null {
	// oxlint-disable-next-line no-restricted-globals
	return localStorage.getItem(key)
}

function localStorageSetItem(key: string, value: string): void {
	// oxlint-disable-next-line no-restricted-globals
	localStorage.setItem(key, value)
}

/**
 * 使用 localStorage
 * @param key 保存的键值
 * @param defaultValue 默认值
 * @returns
 */
export function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
	const parser = (data: string) => {
		return JSON.parse(data).value as T
	}
	const serializer = (data: T) => {
		return JSON.stringify({ value: data })
	}
	const storageData = localStorageGetItem(key)
	const data = ref<T>(storageData ? parser(storageData) : defaultValue)
	watch(
		data,
		(newValue) => {
			localStorageSetItem(key, serializer(newValue))
		},
		{ deep: true },
	)
	return data as Ref<T>
}
