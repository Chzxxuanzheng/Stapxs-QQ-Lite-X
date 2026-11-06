/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'virtual:update-record' {
	const commits: {
		hash: string
		content: string
		type:
			| 'feat'
			| 'fix'
			| 'docs'
			| 'style'
			| 'refactor'
			| 'perf'
			| 'test'
			| 'chore'
			| 'revert'
			| 'ci'
			| 'unknown'
		author: string
		date: number
	}[]
	export default commits
}

declare module 'vue3-danmaku'
declare module '*.vue' {
	import type { DefineComponent } from 'vue'
	const component: DefineComponent<{}, {}, any>
	export default component
}

declare interface Window {
	moYu: any
	_AMapSecurityConfig: string | undefined
	createMap: (
		key: string | undefined,
		msgId: string,
		point: {
			lat: number
			lng: number
		},
	) => void
}

// po 文件，按字符串处理
declare module '*.po' {
	const value: string
	export default value
}

declare module '*.yaml' {
	const content: any
	export default content
}

declare module '*.yml' {
	const content: any
	export default content
}

declare module '@renderer/assets/img/qq-face/public/assets/qq_emoji/_index.json' {
	const content: {
		emojiId: string
		describe: '' | `/${string}`
		assets: {
			type: number
			path: string
			name: string
		}[]
	}[]
	export default content
}

declare interface PinyinOptions {
	heteronym?: boolean
	compact?: boolean
	style?: string
}

declare const pinyin: {
	pinyin(text: string, options?: PinyinOptions): string[][]
}
