import z from 'zod'
import { logger } from '../base'
import { ProxyUrl } from '../model/proxyUrl'
import { sendStatEvent } from './appUtil'
import { getApi } from './systemUtil'
import useRuntimeData from '@renderer/state/runtimeData'

const specialLinkList = {
	bilibili: ['bilibili.com', 'b23.tv', 'bili2233.cn', 'acg.tv'],
	music163: ['music.163.com', '163cn.tv'],
} as const

const specialLinkType = Object.keys(specialLinkList) as (keyof typeof specialLinkList)[]

type LinkType = 'og' | keyof typeof specialLinkList

const stapxsOgApiSchema = z.object({
	'og:description': z.string().optional(),
	'og:image': z.string().optional(),
	'og:site_name': z.string().optional(),
	'og:title': z.string().optional(),
}).transform(o => ({
	desc: o['og:description'],
	img: o['og:image'],
	site: o['og:site_name'],
	title: o['og:title']
}))

const bilibiliApiSchema = z.object({
	code: z.literal(0),
	message: z.literal('OK'),
	data: z.object({
		pic: z.url(),
		title: z.string(),
		pubdate: z.coerce.date(),
		desc: z.string(),
		owner: z.object({
			name: z.string(),
			face: z.url()
		}),
		stat: z.object({
			view: z.number(),
			favorite: z.number(),
			coin: z.number(),
			like: z.number()
		})
	}),
})

/**
 * 网易云音乐 - 歌曲详情（/song/detail?ids=）
 * @see https://binaryify.github.io/NeteaseCloudMusicApi/#/?id=获取歌曲详情
 */
export const music163SongDetailSchema = z.object({
	code: z.number(),
	songs: z.array(z.object({
		id: z.number(),
		name: z.string(),
		// 歌手列表
		ar: z.array(z.object({
			id: z.number(),
			name: z.string(),
		})),
		// 专辑信息
		al: z.object({
			id: z.number(),
			name: z.string(),
			picUrl: z.string(),
		}),
		// 歌曲时长（毫秒）
		dt: z.number(),
	})),
})

/**
 * 网易云音乐 - 歌曲播放地址（/song/url?id=）
 * @see https://binaryify.github.io/NeteaseCloudMusicApi/#/?id=获取音乐-url
 */
export const music163SongUrlSchema = z.object({
	code: z.number(),
	data: z.array(z.object({
		id: z.number(),
		// 无版权或获取失败时为 null
		url: z.string().nullable(),
		br: z.number().optional(),
		size: z.number().optional(),
		// 免费试听片段，无试听限制时为 null
		freeTrialInfo: z.object({
			start: z.number(),
			end: z.number(),
		}).nullable().optional(),
	})),
})

type OgLinkInfo = {
	type: 'og'
	large: boolean
	img?: ProxyUrl
	site?: string
	title?: string
	desc?: string
}

type BiliBiliLinkInfo = {
	type: 'bilibili'
	sub_type: 'video'
	title: string
	desc: string
	pic: ProxyUrl
	publicDate: Date
	owner: {
		face: ProxyUrl
		name: string
	},
	view: number
	coin: number
	favorite: number
	like: number
}

type Music163LinkInfo = {
	type: 'music163'
	sub_type: 'song'
	cover: ProxyUrl
	name: string
	authors: string[]
	freeRange?: [number, number]
	playLink?: ProxyUrl
}

export type LinkInfo = OgLinkInfo | BiliBiliLinkInfo | Music163LinkInfo

export async function parseLinks(links: string[]): Promise<LinkInfo | undefined> {
	if (links.length === 0) return undefined

	return new Promise<LinkInfo | undefined>(resolve => {
		let finished = false
		let remaining = links.length

		const done = (info: LinkInfo | undefined) => {
			if (finished) return
			remaining--
			if (info) {
				finished = true
				resolve(info)
				console.log(links, '求解结果:', info)
				return
			}
			if (remaining === 0) {
				console.log('求解失败:', links)
				resolve(undefined)
			}
		}

		for (const link of links) {
			void parseLink(link).then(info => {
				done(info)
			})
		}
	})
}

export async function parseLink(link: string): Promise<LinkInfo | undefined> {
	if (!link.includes('://')) link = 'https://' + link
	const url = new URL(link)

	sendStatEvent('link_view', { domain: url.hostname })

	let type: LinkType = 'og'

	for (const key of specialLinkType) {
		if (
			specialLinkList[key].some((item: string) =>
				url.hostname.includes(item),
			)
		) {
			type = key
			break
		}
	}

	try {
		const re = await linkParsers[type](url)
		// console.log('link: ', link, '结果:', re)
		return re
	} catch {
		// console.log('link: ', link, '失败')
		return undefined
	}
}

const linkParsers = {
	async og(url: URL) {
		const runtimeData = useRuntimeData()
		let data: OgLinkInfo | undefined
		if (runtimeData.tags.canCors) data = await fetchOgLinkInfoFromCors(url)
		else data = await fetchOgLinkInfoFromStapxsServer(url)

		if (!data) return undefined

		if (!data.title && !data.desc && !data.img && !data.site) return undefined

		return data

	},

	async bilibili(url: URL) {
		let bv: string | undefined
		for (const path of url.pathname.split('/')) {
			if (path.startsWith('BV')) {
				bv = path
				break
			}
		}
		if (!bv) return undefined

		logger.info(`[linkView] 获取到 bilibili 链接：${bv}`)
		const infoApi = ProxyUrl.proxy(`https://api.bilibili.com/x/web-interface/wbi/view?bvid=${bv}`)
		const { data, error } = bilibiliApiSchema.safeParse(await getApi(infoApi))
		console.log(error)
		if (!data) return undefined
		logger.info(`[linkView] 预览 bilibili 链接成功：${data.data.title}`)

		return {
			type: 'bilibili',
			sub_type: 'video',
			title: data.data.title,
			desc: data.data.desc,
			pic: new ProxyUrl(data.data.pic),
			publicDate: data.data.pubdate,
			owner: {
				face: new ProxyUrl(data.data.owner.face),
				name: data.data.owner.name,
			},
			view: data.data.stat.view,
			coin: data.data.stat.coin,
			favorite: data.data.stat.favorite,
			like: data.data.stat.like
		} satisfies BiliBiliLinkInfo
	},

	async music163(url: URL) {
		const params = new URLSearchParams(url.search)
		const id = params.get('id')
		if (!id) return

		logger.info(`[linkView] 获取获取网易云音乐歌曲 ID：${id}`)
		const baseUrl = import.meta.env.VITE_APP_163_MUSIC_API
		try {
			const [responseDetail, responseUrl] = await Promise.all([getApi(baseUrl + '/song/detail?ids=' + id), getApi(baseUrl + '/song/url?id=' + id)])
			const detail = music163SongDetailSchema.safeParse(responseDetail).data?.songs.at(0)
			const url = music163SongUrlSchema.safeParse(responseUrl).data?.data.at(0)

			if (!detail || !url) return undefined

			return {
				type: 'music163',
				sub_type: 'song',
				cover: new ProxyUrl(detail.al.picUrl),
				name: detail.name,
				authors: detail.ar.map(i => i.name),
				freeRange: url.freeTrialInfo ? [url.freeTrialInfo.start, url.freeTrialInfo.end] : undefined,
				playLink: url.url ? new ProxyUrl(url.url) : undefined
			}
		} catch (error) {
			logger.error(error as Error, '[linkView] 预览网易云音乐失败')
			return undefined
		}
	}
} as const satisfies Record<LinkType, (url: URL) => Promise<LinkInfo | undefined>>

async function checkOgImg(url: URL, img?: string): Promise<{ img?: ProxyUrl, large: boolean }> {
	if (!img) return { large: false }

	// 不标准连接
	if (!img.startsWith('http')) {
		// 过滤 xxx.yyy
		if (!img.includes('/')) img = `/${img}`

		// 非域名开头
		if (!img.split('/')[0]!.includes('.')) {
			if (!img.startsWith('/')) img = `/${img}`
			img = `${url.hostname}${img}`
		}

		// 检查协议
		if (!img.includes('://')) img = `https://${img}`
	}

	const imgUrl = new ProxyUrl(img)

	return new Promise(r => {
		const img = new Image()
		img.onload = () => r({
			large: img.naturalWidth > img.naturalHeight,
			img: imgUrl,
		})

		img.onerror = () => r({
			large: false,
		})

		img.src = imgUrl.url
	})

}

async function fetchOgLinkInfoFromCors(url: URL): Promise<OgLinkInfo | undefined> {
	try {
		const data = await fetch(ProxyUrl.proxy(url.toString()))
		if (!data.ok) return undefined

		const html = await data.text()
		const doc = new DOMParser().parseFromString(html, 'text/html')
		const getMeta = (key: string) =>
			doc.querySelector(`meta[property="${key}"]`)?.getAttribute('content') ??
			doc.querySelector(`meta[name="${key}"]`)?.getAttribute('content') ??
			undefined

		const title = getMeta('og:title')
		const desc = getMeta('og:description')
		if (title === undefined && desc === undefined) return undefined

		const imgUrl = getMeta('og:image')

		logger.info(`[linkView] 预览链接成功：${title ?? url.toString()}`)

		return {
			type: 'og',
			site: getMeta('og:site_name'),
			title: title,
			desc: desc,
			... await checkOgImg(url, imgUrl)
		}
	} catch (error) {
		logger.error(error as Error, '[linkView] 预览链接失败')
		return undefined
	}
}

async function fetchOgLinkInfoFromStapxsServer(url: URL): Promise<OgLinkInfo | undefined> {
	// 获取链接预览
	const res = await getApi(
		`${import.meta.env.VITE_APP_LINK_VIEW}/${encodeURIComponent(url.toString())}`,
	)

	const { data } = stapxsOgApiSchema.safeParse(res)

	if (!data) return undefined

	return {
		type: 'og',
		site: data.site,
		title: data.title,
		desc: data.desc,
		... await checkOgImg(url, data.img)
	}
}
