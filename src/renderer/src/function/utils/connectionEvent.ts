/*
 * @FileDescription: 连接事件
 * @Author: Mr.Lee
 * @Date: 2026/11/15
 * @Version: 1.0
 * @Description: 跨适配器的连接状态与连接事件定义。此模块在运行时零依赖，
 *               避免连接层为了弹出登录窗反向依赖 systemUtil / login 造成循环依赖。
 */

/** 连接丢失回调（断线且自动重连失败） */
export type ConnectionLostHandler = () => void

/** 登录状态失效回调（协议端返回 401） */
export type AuthExpiredHandler = () => void

let connectionLostHandler: ConnectionLostHandler | undefined
let authExpiredHandler: AuthExpiredHandler | undefined

/**
 * 注册连接丢失回调
 * @param handler 回调，传 undefined 取消注册
 */
export function setConnectionLostHandler(
	handler: ConnectionLostHandler | undefined,
): void {
	connectionLostHandler = handler
}

/** 触发连接丢失事件 */
export function emitConnectionLost(): void {
	connectionLostHandler?.()
}

/**
 * 注册登录状态失效回调
 * @param handler 回调，传 undefined 取消注册
 */
export function setAuthExpiredHandler(
	handler: AuthExpiredHandler | undefined,
): void {
	authExpiredHandler = handler
}

/** 触发登录状态失效事件 */
export function emitAuthExpired(): void {
	authExpiredHandler?.()
}
