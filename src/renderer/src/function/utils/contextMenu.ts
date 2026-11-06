/*
 * @FileDescription: 右键菜单工具
 * @Author: Mr.Lee
 * @Date: 2025/12/04
 * @Version: 1.0
 * @Description: 右键菜单工具，用于创建右键菜单
 */

import { Component, markRaw, shallowReactive, shallowRef } from 'vue'
import { Session } from '../model/session'
import { SessionBox } from '../model/box'
import FriendMenu from '@renderer/components/menu/FriendMenu.vue'
import { VueCompData } from '../elements/vueComp'

export interface ContextMenuData {
	id: string
	pos: { x: number; y: number }
	compData: VueCompData<Component>
	controller: ContextMenuController
}

export type ContextMenuController = {
	finish: Promise<any>
	close: (ret?: any) => void
}

export const resolveMap = new Map<string, (arg?: any) => void>()
export const contextMenus = shallowRef<ContextMenuData[]>([])

/**
 * 创建一个右键菜单
 * @param x 右键菜单的X坐标
 * @param y 右键菜单的Y坐标
 * @param template 右键菜单模板组件
 * @param args 传递给右键菜单的参数
 */
export function openContextMenu<T extends Component>(
	pos: { x: number; y: number },
	compData: VueCompData<T>,
): ContextMenuController {
	const id = crypto.randomUUID()
	const controller = contextControllerMaker(id)
	contextMenus.value = [
		...contextMenus.value,
		{
			id,
			pos,
			compData,
			controller,
		},
	]
	return controller
}

/**
 * 关闭指定的右键菜单
 * @param id 右键菜单的ID
 * @param ret 关闭时返回的值
 */
export function closeContextMenu(id: string, ret?: any): void {
	const resolve = resolveMap.get(id)
	if (!resolve) throw new Error(`无法找到 ID 为 ${id} 的右键菜单`)
	resolve(ret)
	resolveMap.delete(id)
	contextMenus.value = contextMenus.value.filter((menu) => menu.id !== id)
}

/**
 * 创建一个右键菜单控制器
 * @param id 对应的id
 */
function contextControllerMaker(id: string): ContextMenuController {
	const promise = new Promise<any>((resolve) => {
		resolveMap.set(id, resolve)
	})
	return {
		finish: promise,
		close: (ret?: any) => closeContextMenu(id, ret),
	}
}

export const friendMenuInfo = shallowReactive<{
	session?: Session
	box?: SessionBox
}>({ session: undefined, box: undefined })

/**
 * 打开好友右键菜单
 * @param x 右键菜单的X坐标
 * @param y 右键菜单的Y坐标
 * @param from 来源
 * @param session 会话
 * @param box 盒子
 */
export function openFriendMenu(
	x: number,
	y: number,
	from: 'message' | 'friend',
	session?: Session,
	box?: SessionBox,
): ContextMenuController {
	friendMenuInfo.session = session
	friendMenuInfo.box = box
	const controller = openContextMenu(
		{ x, y },
		{
			comp: markRaw(FriendMenu),
			props: {
				from,
				session,
				box,
			},
		},
	)
	controller.finish.then(() => {
		friendMenuInfo.session = undefined
		friendMenuInfo.box = undefined
	})
	return controller
}
