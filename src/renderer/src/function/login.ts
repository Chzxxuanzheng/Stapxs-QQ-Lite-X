import app from '@renderer/main'
import { markRaw } from 'vue'
import { AdapterInterface } from '@renderer/function/adapter/interface'
import { logger, popInfo } from '@renderer/function/base'
import { User } from '@renderer/function/model/user'
import {
	reloadUsers,
	sendIdentifyData,
	sendStatEvent,
} from '@renderer/function/utils/appUtil'
import { popBox } from '@renderer/function/utils/popBox'
import { dns, openLoginPan } from '@renderer/function/utils/systemUtil'
import {
	setAuthExpiredHandler,
	setConnectionLostHandler,
} from '@renderer/function/utils/connectionEvent'
import WhyNeedToken from '@renderer/components/popBox/doc/WhyNeedToken.vue'
import useRuntimeData from '@renderer/state/runtimeData'
import { parseProtocol } from '@renderer/function/utils/baseUtil'

const SSL_WHITE_LIST = new Set<string>(['localhost', '127.0.0.1'])

function $t(key: string): string {
	return app.config.globalProperties.$t(key)
}

//#region == 连接事件 ===================================================
setConnectionLostHandler(() => {
	const runtimeData = useRuntimeData()
	const adapter = runtimeData.nowAdapter
	if (!adapter) return
	popInfo.error($t('连接中断'))
	runtimeData.clearAdapter()
	openLoginPan()
	// 连接已经失效，尽量回收传输层资源（幂等、不抛错）
	void adapter.close().catch(() => undefined)
})

setAuthExpiredHandler(() => {
	const runtimeData = useRuntimeData()
	const adapter = runtimeData.nowAdapter
	if (!adapter) return
	// 具体提示由协议适配器给出（如 Matrix 的「登录状态已失效」），这里只统一收尾
	popInfo.error($t('登录失效'))
	runtimeData.clearAdapter()
	openLoginPan()
})
//#endregion

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

	// 切换协议 / 重新登录前先关闭旧连接，避免旧 socket 或轮询泄漏
	if (runtimeData.nowAdapter) {
		try {
			await runtimeData.nowAdapter.close()
		} catch {
			// 旧连接关闭失败不应阻止新登录
		}
	}

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
	runtimeData.connectionStatus = 'connecting'
	const re = await tryLogin(originUrl, token)

	// 登陆成功
	if (re === true) {
		runtimeData.connectionStatus = 'connected'

		// 上报协议端类型
		if (runtimeData.sysConfig.open_ga_bot) {
			const implInfo = await runtimeData.nowAdapter!.getImplInfo()
			const implName = implInfo?.name ?? '（未知）'
			const bot_version = implInfo?.version
				? implName + ',' + implInfo.version
				: implName
			sendStatEvent('connect', { method: bot_version })
			sendIdentifyData({ bot_version })
		}

		const title = `${runtimeData.selfInfo!.nickname}（${runtimeData.selfInfo!.user_id}）`
		document.title = title + '- Stapxs QQ Lite X'

		// 跳转标签卡
		const barMsg = document.getElementById('bar-msg')
		if (barMsg != null) barMsg.click()

		// 加载列表消息
		await reloadUsers()

		return re
	}

	// 登陆失败的垃圾回收
	popInfo.error($t('登录失败: ') + re)
	runtimeData.connectInfo.address = undefined
	runtimeData.connectInfo.token = undefined
	try {
		await runtimeData.nowAdapter?.close()
	} catch {
		// 关闭失败不影响回到登录页
	}
	runtimeData.clearAdapter()
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
	let parseUrl = originUrl.split('://')
	if (parseUrl.length !== 2) return $t('连接地址格式错误，请参考如何连接')
	let [protocol, ssl] = parseProtocol(parseUrl.at(0)!)
	const url: string = parseUrl.at(1)!
	if (!protocol) return $t('连接地址格式错误，请参考如何连接')
	if (!url) return $t('连接地址格式错误，请参考如何连接')
	if (protocol === 'ws') {
		popInfo.info($t('协议仅支持ob/mk,详情请看如何连接.ws默认按ob处理'))
		protocol = 'ob'
	}

	const adapter = adapterMap.get(protocol)

	// 查询适配器
	if (!adapter) return $t('不支持的协议: ') + protocol

	const host = adapter.getHost(url)

	// 公网检测
	const publicCheck = await isPublicHost(host)
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
		!SSL_WHITE_LIST.has(url.split('@').at(0)!)
	) {
		return $t(
			'https页面不支持非ssl连接，请配备证书或者更换至非http版本的页面',
		)
	}

	return { protocol, ssl, url, token }
}
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
