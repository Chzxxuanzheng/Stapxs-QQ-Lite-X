import app from '@renderer/main'
import { Gender, Role } from '@renderer/function/adapter/enmu'
import { SenderData } from '@renderer/function/adapter/interface'

export function $t(value: string, args: Record<string, any> = {}): string {
	return app.config.globalProperties.$t(value, args)
}

/**
 * 获取性别
 * @param sex 性别字符串
 * @returns
 */
export function getGender(sex: 'male' | 'female' | 'unknown'): Gender {
	switch (sex) {
		case 'male':
			return Gender.Male
		case 'female':
			return Gender.Female
		case 'unknown':
			return Gender.Unknown
	}
}

/**
 * 获取角色
 * @param role 角色
 */
export function getRole(role: 'owner' | 'admin' | 'member'): Role {
	switch (role) {
		case 'owner':
			return Role.Owner
		case 'admin':
			return Role.Admin
		case 'member':
			return Role.User
	}
}

/**
 * 创建SenderData
 * @param user_id 用户ID
 * @param nickname 昵称
 */
export function createSender(user_id: number, nickname?: string): SenderData {
	if (!nickname) nickname = user_id.toString()
	return {
		id: user_id,
		nickname,
		sex: Gender.Unknown,
	}
}

/**
 * 文件转二进制文件
 * @param file
 * @returns
 */
export async function fileToBase64(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer()
	const bytes = new Uint8Array(arrayBuffer)
	const binary = bytes.reduce(
		(acc, byte) => acc + String.fromCodePoint(byte),
		'',
	)
	return btoa(binary)
}

export type MilkyVersion =
	| `${number}.${number}`
	| `${number}.${number}-${string}`

/**
 * 判断Milky版本是否合法
 * @param version
 */
export function checkMilkyVersion(version: string): MilkyVersion | undefined {
	const regex = /^(\d+)\.(\d+)(?:-([\w.-]+))?$/
	const match = regex.exec(version)
	const major = match?.[1]
	if (!major) return undefined
	if (!Number.isInteger(Number(major))) return undefined
	const minor = match?.[2]
	if (!minor) return undefined
	if (!Number.isInteger(Number(minor))) return undefined
	return version as MilkyVersion
}

/**
 * 比较Milky版本大小
 * @param v1 版本1
 * @param v2 版本2
 * @returns 1: v1 > v2, -1: v1 < v2, 0: v1 == v2
 */
export function versionCompare(v1: MilkyVersion, v2: MilkyVersion): number {
	const parseVersion = (version: MilkyVersion) => {
		const [major, minor] = version
			.split('.')
			.map((num) => parseInt(num, 10))
		return { major, minor }
	}
	const ver1 = parseVersion(v1)
	const ver2 = parseVersion(v2)
	if (ver1.major > ver2.major) return 1
	if (ver1.major < ver2.major) return -1
	if (ver1.minor > ver2.minor) return 1
	if (ver1.minor < ver2.minor) return -1
	return 0
}

// 首字母大写
type CapitalizeFirst<S extends string> = S extends `${infer First}${infer Rest}`
	? `${Uppercase<First>}${Rest}`
	: S

/**
 * 下划线命名转小驼峰命名类型
 * @param S 下划线命名字符串
 * @returns 小驼峰命名字符串
 */
export type SmallCamelCase<S extends string> =
	S extends `${infer P1}${infer P2}`
		? P1 extends '_'
			? `${SmallCamelCase<CapitalizeFirst<P2>>}`
			: `${P1}${SmallCamelCase<P2>}`
		: S

/**
 * 下划线命名转小驼峰命名
 * @param name 下划线命名字符串
 * @returns 小驼峰命名字符串
 */
export function underlineToCamelCase<T extends string>(
	name: T,
): SmallCamelCase<T> {
	const parts = name.split('_')
	const camelCased = parts
		.map((part, index) => {
			if (index === 0) {
				return part.toLowerCase()
			}
			return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
		})
		.join('')
	return camelCased as SmallCamelCase<T>
}

/**
 * 下划线命名转大驼峰命名类型
 * @param S 下划线命名字符串
 * @returns 大驼峰命名字符串
 */
type UnderlineCase<S extends string> = S extends `${infer P1}${infer P2}`
	? P1 extends Lowercase<P1>
		? `${P1}${UnderlineCase<P2>}`
		: `_${Lowercase<P1>}${UnderlineCase<P2>}`
	: S

/**
 * 小驼峰命名转下划线命名
 * @param name 小驼峰命名字符串
 * @returns 下划线命名字符串
 */
export function camelCaseToUnderline<T extends string>(
	name: T,
): UnderlineCase<T> {
	const s = name
		// 把 ...ABCDef... 中的 ABCD + Ef 这类边界拆分为 ABCD_Ef（处理缩写后紧跟驼峰的情况）
		.replaceAll(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
		// 把小写/数字 + 大写 的边界拆分为 aB -> a_B
		.replaceAll(/([a-z\d])([A-Z])/g, '$1_$2')
		.toLowerCase()

	return s as UnderlineCase<T>
}

/**
 * 获取对象属性
 * @param obj 对象
 * @param key 属性名
 * @returns 属性值
 */
export function getProp(obj: any, key: string): unknown {
	return obj[key]
}
