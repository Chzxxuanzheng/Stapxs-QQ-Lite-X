import app from '@renderer/main'
import { markRaw } from 'vue'
import { AdapterInterface } from './adapter/interface'
import { logger, popInfo } from './base'
import { User } from './model/user'
import { reloadUsers, sendIdentifyData, sendStatEvent } from './utils/appUtil'

const SSL_WHITE_LIST = new Set<string>(['localhost', '127.0.0.1'])

function $t(key: string): string {
	return app.config.globalProperties.$t(key)
}

const adapters = import.meta.glob('@renderer/function/adapter/*/adapter.ts', {
	eager: true,
})
const adapterMap = new Map<string, AdapterInterface>()
for (const key in adapters) {
	const adapter: AdapterInterface = (adapters as any)[key].default
	if (adapter) {
		adapterMap.set(adapter.protocol, adapter)
	}
}

/**
 * 尝试登录
 * @param originUrl
 * @param token
 * @returns true表示登录成功，字符串表示失败原因
 */
async function tryLogin(
	originUrl: string,
	token_: string,
): Promise<true | string> {
	const runtimeData = useRuntimeData()
	// 预检查
	const checkRe = await preCheck(originUrl, token_)
	if (typeof checkRe === 'string') return checkRe
	const { protocol, ssl, url, token } = checkRe

	// 查询适配器
	if (!adapterMap.has(protocol)) return $t('不支持的协议: ') + protocol

	let adapter = adapterMap.get(protocol) as AdapterInterface
	runtimeData.nowAdapter = markRaw(adapter)
	const re = await adapter.connect(url, ssl, token)
	if (!re) return $t('连接失败')

	// 初始化连接
	const redirect = await adapter.redirect?.()
	if (redirect) {
		adapter = redirect
		runtimeData.nowAdapter = markRaw(redirect)
	}

	// 获取登陆信息
	const loginData = await adapter.getLoginInfo()
	if (!loginData) return $t('获取登录信息失败')

	// 重置runtimeData
	if (runtimeData.loginInfo?.uin !== loginData.uin) runtimeData.reset()

	// 完成登陆初始化
	runtimeData.loginInfo = loginData

	// 获取个人信息
	const selfInfo = await adapter.getUserInfo(loginData.uin)
	if (!selfInfo) return $t('获取个人信息失败')

	// 设置个人信息
	runtimeData.selfInfo = new User(selfInfo)

	// 上报协议端类型
	if (runtimeData.sysConfig.open_ga_bot) {
		const implInfo = await runtimeData.nowAdapter.getImplInfo()
		const implName = implInfo?.name ?? '（未知）'
		const bot_version = implInfo?.version
			? implName + ',' + implInfo.version
			: implName
		sendStatEvent('connect', { method: bot_version })
		sendIdentifyData({ bot_version })
	}

	const title = `${loginData.nickname}（${loginData.uin}）`
	document.title = title + '- Stapxs QQ Lite X'

	// 跳转标签卡
	const barMsg = document.getElementById('bar-msg')
	if (barMsg != null) barMsg.click()

	// 加载列表消息
	await reloadUsers()

	return true
}

export async function login(
	originUrl: string,
	token: string,
): Promise<boolean> {
	const runtimeData = useRuntimeData()

	// 提前工作
	runtimeData.connectInfo.address = originUrl
	runtimeData.connectInfo.token = token

	// 登陆
	const re = await tryLogin(originUrl, token)

	// 登陆成功
	if (re === true) return re

	// 登陆失败的垃圾回收
	popInfo.error($t('登录失败: ') + re)
	runtimeData.connectInfo.address = undefined
	runtimeData.connectInfo.token = undefined
	runtimeData.nowAdapter?.close()
	runtimeData.nowAdapter = undefined
	return false
}

/**
 * 提前检查
 * @param originUrl
 * @param token
 */
async function preCheck(
	originUrl: string,
	token: string,
): Promise<
	string | { protocol: string; ssl: boolean; url: string; token: string }
> {
	// 分析地址
	if (originUrl.trim() === '') return $t('请输入链接地址,参考如何连接')
	let parseUrl: URL
	try {
		parseUrl = new URL(originUrl)
	} catch {
		return $t('连接地址格式错误，请参考如何连接')
	}
	let protocol: string = parseUrl.protocol
	const ssl: boolean = parseUrl.ssl
	const url: string = parseUrl.fullUrl
	if (!protocol) return $t('连接地址格式错误，请参考如何连接')
	if (!url) return $t('连接地址格式错误，请参考如何连接')
	if (protocol === 'ws') {
		popInfo.info($t('协议仅支持ob/mk,详情请看如何连接.ws默认按ob处理'))
		protocol = 'ob'
	}

	// 公网检测
	const publicCheck = await isPublicHost(parseUrl.host)
	if (token === '' && publicCheck) {
		popBox({
			title: $t('谨慎地拒绝公网无token登陆'),
			svg: 'triangle-exclamation',
			comp: WhyNeedToken,
			props: { host: publicCheck },
			allowAutoClose: false,
			button: [
				{
					master: true,
					text: $t('知道了'),
				},
			],
		})
		return $t('谨慎地拒绝公网无token登陆')
	}

	// https http兼容测试
	if (
		globalThis.location.protocol === 'https:' &&
		!ssl &&
		!SSL_WHITE_LIST.has(parseUrl.host)
	) {
		return $t(
			'https页面不支持非ssl连接，请配备证书或者更换至非http版本的页面',
		)
	}

	return { protocol, ssl, url, token }
}

import { popBox } from './utils/popBox'
import { dns } from './utils/systemUtil'
import WhyNeedToken from '@renderer/components/popBox/doc/WhyNeedToken.vue'
import useRuntimeData from '@renderer/state/runtimeData'
import { URL } from './utils/baseUtil'

/**
 * 判断传入的 host 是否为公网 IP。
 * 如果是域名，会解析其 IPv4/IPv6 地址并判断是否为公网 IP。
 * @param host 域名或 IP 地址
 * @returns 是否为公网 IP
 */
export async function isPublicHost(host: string): Promise<string | false> {
	// IP 正则
	const ipv4Regex = /^(?:\d{1,3}\.){3}\d{1,3}$/
	const ipv6Regex = /^([a-fA-F0-9:]+:+)+[a-fA-F0-9]+$/

	// 判断 IPv4 是否为内网
	const isPrivateIPv4 = (ip: string) => {
		const parts = ip.split('.').map(Number)
		return (
			parts[0] === 10 ||
			(parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
			(parts[0] === 192 && parts[1] === 168) ||
			parts[0] === 127 ||
			(parts[0] === 169 && parts[1] === 254)
		)
	}

	// 判断 IPv6 是否为内网
	const isPrivateIPv6 = (ip: string) => {
		return (
			ip.startsWith('fc') ||
			ip.startsWith('fd') ||
			ip === '::1' ||
			ip.startsWith('fe80')
		)
	}

	// 判断是否是公网地址
	const isPublicIp = (ip: string) => {
		if (ipv4Regex.test(ip)) {
			return !isPrivateIPv4(ip)
		}
		if (ipv6Regex.test(ip)) {
			return !isPrivateIPv6(ip)
		}
		return false
	}

	// 直接是 IP
	if (ipv4Regex.test(host) || ipv6Regex.test(host)) {
		if (isPublicIp(host)) return host
		return false
	}

	// 是域名，解析地址
	try {
		const dnsResults = await dns(host)
		for (const record of dnsResults) {
			if (record.type === 'A' || record.type === 'AAAA') {
				if (isPublicIp(record.value)) {
					return `${host}(${record.value})`
				}
			}
			if (record.type === 'CNAME') {
				// 递归解析 CNAME
				const re = await isPublicHost(record.value)
				if (re) return re
			}
		}
		return false
	} catch (e) {
		// 解析失败
		logger.error(e as Error, 'DNS 解析失败: ')
		return false
	}
}
