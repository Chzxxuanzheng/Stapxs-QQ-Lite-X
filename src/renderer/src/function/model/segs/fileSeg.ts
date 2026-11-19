import { autoMarkRaw } from '@renderer/function/model/utils'
import { Msg } from '@renderer/function/model/msg'
import { registerSegType, Seg } from '@renderer/function/model/segs/seg'
import type { FileSegData } from '@renderer/function/adapter/interface'
import { ProxyUrl } from '@renderer/function/model/proxyUrl'
import { getSizeFromBytes } from '@root/src/renderer/src/function/utils/systemUtil'
import app from '@renderer/main'
import { urlDownload } from '@root/src/renderer/src/function/utils/baseUtil'

@registerSegType
@autoMarkRaw
export class FileSeg extends Seg {
	static readonly type = 'file'
	static readonly inline = false
	name: string
	file_id?: string
	_url: ProxyUrl
	size: number
	ext: string
	static readonly viewerSupport = [
		'jpg',
		'jpeg',
		'png',
		'gif',
		'bmp',
		'webp',
		'mp4',
		'avi',
		'mkv',
		'flv',
		'txt',
		'md',
	]
	constructor(file: string, name: string, size: number)
	constructor(data: FileSegData)
	constructor(arg1: string | FileSegData, arg2?: string, arg3?: number) {
		super()
		if (typeof arg1 === 'string') {
			const file = arg1
			const name = arg2 as string
			const size = arg3 as number
			this._url = new ProxyUrl(file)
			this.name = name
			this.ext = name.split('.').pop() || 'unknown'
			this.size = size
		} else {
			const data = arg1
			if (!data.file_id) throw new Error('文件ID缺失')
			this.file_id = data.file_id
			this.name = data.name
			this.size = data.size
			this.ext = this.name.split('.').pop() || 'unknown'
			this._url = new ProxyUrl(data.url)
		}
	}

	get formatSize(): string {
		const { $t } = app.config.globalProperties

		if (!this.size) return $t('未知大小')
		return getSizeFromBytes(this.size)
	}

	plaintext(_?: Msg): string {
		const { $t } = app.config.globalProperties

		return this.name ?? '[' + $t('文件') + ']'
	}

	get url(): string {
		return this._url.url
	}

	get rawUrl(): string {
		return this._url.raw
	}

	get fileView(): { url: string; ext: string; txt?: string } | undefined {
		if (!this.url) return undefined
		if (!FileSeg.viewerSupport.includes(this.ext)) return undefined
		return {
			url: this.url,
			ext: this.ext,
		}
	}

	download() {
		urlDownload(this.rawUrl)
	}

	override reedit(): [FileSeg] {
		return [this]
	}

	override serializeData(): FileSegData {
		if (!this.file_id) throw new Error('文件ID缺失')
		return {
			type: 'file',
			name: this.name,
			size: this.size,
			url: this.url,
			file_id: this.file_id,
		}
	}
}
