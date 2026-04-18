import { OptionInfos } from './cfgs'
import { checkAndMigration, migration } from './migration'

import { computed, shallowReactive } from 'vue'
import { loadAllOptions, saveAllOptions } from './utils'
import { defineStore } from 'pinia'
import useRuntimeData from '../runtimeData'
import { queueWait } from '@renderer/function/utils/baseUtil'

type OptionGlobalTag = 'global'
type OptionOtherTag = 'protocol' | 'user'
type OptionAllTag = OptionGlobalTag | OptionOtherTag
export type OptionTag =
    | OptionGlobalTag
    | OptionOtherTag
    | [OptionGlobalTag]
    | OptionOtherTag[]

export interface OptionField<T> {
    default: T
    tags?: OptionTag
    onGet?: (() => T | void) | ((value: T) => T | void)
    onChange?:
        | (() => T | void)
        | ((newValue: T) => T | void)
        | ((newValue: T, oldValue: T) => T | void)
    onLoad?: (() => T | void) | ((value: T) => T | void)
    [key: string]: any
}

type ExtractDefault<T> = T extends { default: infer V } ? V : never
export type AppConfig = {
    [K in keyof typeof OptionInfos]: ExtractDefault<(typeof OptionInfos)[K]>
}
//#region == 配置管理器 ======================================================
/**
 * 获取配置标签
 * @param config
 * @returns
 */
function getOptionTags(config: OptionField<any>): OptionAllTag[] {
    const tag = config.tags
    if (tag === undefined) return ['global']
    else if (typeof tag === 'string') return [tag]
    else return tag
}

/**
 * 获取配置键
 * @param name 配置项名称
 * @param config 配置项对象
 */
function getOptionKey(name: string, config: OptionField<any>): string {
    const runtimeData = useRuntimeData()
    const tags = getOptionTags(config)
    let out = ''
    if (tags.includes('global')) out += '#TAG:global#'
    if (tags.includes('protocol')) {
        if (!runtimeData.nowAdapter)
            throw new Error('当前没有适配器，无法获取协议配置项')
        const protocol = runtimeData.nowAdapter.protocol
        out += `#TAG:protocol=${protocol}#`
    }
    if (tags.includes('user')) {
        const loginUin = runtimeData.loginInfo?.uin
        if (!loginUin) throw new Error('当前没有用户登录，无法获取用户配置项')
        out += `#TAG:user=${loginUin}#`
    }
    out += '#KEY:' + name + '#'
    return out
}

/**
 * 运行获取钩子
 * @param option
 * @param value
 * @returns
 */
function runOnGetHook<T>(option: OptionField<T>, value: T): T | undefined {
    if (!option.onGet) return undefined
    switch (option.onGet.length) {
        case 0:
            return (option.onGet as () => T)()
        case 1:
            return (option.onGet as (value: T) => T)(value)
        default:
            throw new Error('配置项钩子 onGet 参数错误')
    }
}

/**
 * 运行配置变更钩子
 * @param option 配置对象
 * @param newValue 新值
 * @param oldValue 旧值
 */
function runOnChangeHook<T>(
    option: OptionField<T>,
    newValue: T,
    oldValue: T,
): T | undefined {
    if (!option.onChange) return undefined
    switch (option.onChange.length) {
        case 0:
            return (option.onChange as () => T)()
        case 1:
            return (option.onChange as (newValue: T) => T)(newValue)
        case 2:
            option.onChange(newValue, oldValue)
            return undefined
        default:
            throw new Error('配置项钩子 onChange 参数错误')
    }
}

/**
 * 运行加载钩子
 * @param option
 * @param value
 * @returns
 */
function runOnLoadHook<T>(option: OptionField<T>, value: T): T | undefined {
    if (!option.onLoad) return undefined
    switch (option.onLoad.length) {
        case 0:
            return (option.onLoad as () => T)()
        case 1:
            return (option.onLoad as (value: T) => T)(value)
        default:
            throw new Error('配置项钩子 onLoad 参数错误')
    }
}

export const useOptionStore = defineStore('option', () => {
    let initd = false
    let rawConfigs!: Record<string, any>
    let options!: AppConfig

    /**
     * 初始化
     * @param data
     */
    async function init() {
        // 迁移检测
        await checkAndMigration()
        // 加载所有配置
        rawConfigs = await loadAllOptions()
        const isWhiteProp = (prop: any) => {
            if (typeof prop !== 'string') return true
            if (['toString', 'then', 'catch', 'finally'].includes(prop))
                return true
            if (prop.startsWith('__v')) return true
            return false
        }
        options = shallowReactive(
            new Proxy({} as AppConfig, {
                /**
                 * 获取配置项
                 * @param _
                 * @param prop 配置文件项名称
                 * @returns
                 */
                get(target: any, prop: any) {
                    // vue相关
                    if (isWhiteProp(prop)) return target[prop]
                    // 获取配置项对象
                    const option = OptionInfos[prop]
                    if (!option) throw new Error(`不存在的配置项 ${prop}`)
                    // 获取配置项对象
                    const key = getOptionKey(prop, option)
                    const value = rawConfigs[key] ?? option.default
                    // 触发加载钩子
                    const re = runOnGetHook(option, value)
                    if (re !== undefined) return re
                    else return value
                },
                set(target: any, prop: string, value: any) {
                    // vue相关
                    if (isWhiteProp(prop)) {
                        target[prop] = value
                        return true
                    }
                    // 获取配置项对象
                    const option = OptionInfos[prop]
                    if (!option) throw new Error(`不存在的配置项 ${prop}`)
                    // 触发保存钩子
                    const key = getOptionKey(prop, option)
                    const oldValue = options[prop]
                    const re = runOnChangeHook(option, value, oldValue)
                    if (re !== undefined) rawConfigs[key] = re
                    else rawConfigs[key] = value
                    // 保存到存储中
                    queueWait(saveAllOptions(rawConfigs), 'save-options')
                    return true
                },
                has(target: any, prop: string) {
                    // vue相关
                    if (isWhiteProp(prop)) return prop in target
                    return prop in OptionInfos
                },
                ownKeys(_: any) {
                    return Reflect.ownKeys(OptionInfos)
                },
            }),
        )
        initd = true
        // 触发加载钩子
        for (const prop in OptionInfos) {
            const option = OptionInfos[prop] as OptionField<any>
            const tags = getOptionTags(option)
            if (!tags.includes('global')) continue
            if (option.onLoad) {
                const key = getOptionKey(prop, option)
                const value = rawConfigs[key] ?? option.default
                const re = runOnLoadHook(option, value)
                if (re !== undefined) rawConfigs[key] = re
            }
        }
        // TODO 清除未知配置
    }

    /**
     * 检查配置项是否为默认值
     * @param key
     * @returns
     */
    function checkDefault(key: keyof AppConfig): boolean {
        if (!initd) throw new Error('配置管理器未初始化')
        if (!(key in OptionInfos)) throw new Error(`不存在的配置项 ${key}`)
        const defaultValue = OptionInfos[key].default
        const currentValue = options[key]
        return defaultValue === currentValue
    }

    /**
     * 从外部字符串加载所有配置
     * @param json
     */
    async function loadAllFromString(json: string) {
        if (!initd) throw new Error('配置管理器未初始化')
        rawConfigs = JSON.parse(json)
        // 迁移
        rawConfigs = await migration(rawConfigs)
        await queueWait(saveAllOptions(rawConfigs), 'save-options')
    }

    return {
        init,
        checkDefault,
        loadAllFromString,
        rawConfigs: computed(() => {
            if (!initd) throw new Error('配置管理器未初始化')
            return rawConfigs
        }),
        options: computed(() => {
            if (!initd) throw new Error('配置管理器未初始化')
            return options
        }),
    }
})

export default useOptionStore
//#endregion
