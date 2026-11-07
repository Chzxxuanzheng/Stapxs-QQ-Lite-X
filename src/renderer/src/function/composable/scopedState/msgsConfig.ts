import { shallowReactive } from 'vue'
import { defineScopedState } from '@renderer/function/utils/vueUtil'
import { MenuEventData } from '@renderer/function/elements/information'
import { Msg } from '@renderer/function/model/msg'
import { IUser } from '@renderer/function/model/user'

type BaseMsgsConfig = {
	msgMenu: (eventData: MenuEventData, msg: Msg) => Promise<void>
	userMenu: (eventData: MenuEventData, user: IUser) => Promise<void>

	/**
	 * 消息对齐方向
	 */
	direction: 'left' | 'right'
	/**
	 * 是否允许交互
	 */
	allowInteraction: boolean
	/**
	 * 是否显示头像
	 * 注意：这个只是隐藏头像，并不会移除头像占位
	 * 要移除头像占位，请使用 `withoutAvatar` 属性
	 */
	showAvatar: boolean
	/**
	 * 是否对自己的消息使用特殊样式
	 * 如果为 true，则自己的消息会根据 `selfDirection` 属性来决定对齐
	 * 并对自己的消息标注特殊颜色
	 */
	specialSelf: boolean
	/**
	 * @ 自己时高亮
	 */
	showToMe: boolean
	/**
	 * 自己的消息对齐方向
	 * 仅在 `specialSelf` 为 true 时有效
	 */
	specialDirection: 'left' | 'right'
	/**
	 * 是否显示自己的头像
	 * 注意：这个只是隐藏头像，并不会移除头像占位
	 * 要移除头像占位，请使用 `withoutAvatar` 属性
	 * 仅在 `specialSelf` 为 true 时有效
	 */
	showSelfAvatar: boolean
	/**
	 * 是否显示消息 icon
	 * 如正在发送中图标，发送失败图标等
	 */
	showIcon: boolean
	/**
	 * 是否将不存在的消息（如正在发送中的消息）变暗显示
	 * 仅在 `showAvatar` 为 true 时有效
	 */
	dimNonExistentMsg: boolean
	/**
	 * 是否移除头像占位
	 */
	withoutAvatar: boolean
	/**
	 * 是否显示时间
	 */
	exInfo: ('time' | 'msgId')[]
}

const useMsgsConfigState = defineScopedState(
	({
		msgMenu = async (_eventData, _msg) => {},
		userMenu = async (_eventData, _user) => {},
		direction = 'left',
		allowInteraction = true,
		showAvatar = true,
		showToMe = true,
		specialSelf = true,
		specialDirection = 'right',
		showSelfAvatar = true,
		showIcon = true,
		dimNonExistentMsg = true,
		withoutAvatar = false,
		exInfo = ['time', 'msgId'],
	}: Partial<BaseMsgsConfig>) => {
		const configs = shallowReactive({
			msgMenu,
			userMenu,
			direction,
			allowInteraction,
			showToMe,
			showAvatar,
			specialSelf,
			specialDirection,
			showSelfAvatar,
			showIcon,
			dimNonExistentMsg,
			withoutAvatar,
			exInfo,
		} satisfies BaseMsgsConfig)
		return configs as BaseMsgsConfig
	},
)

export default useMsgsConfigState

export type MsgsConfig = ReturnType<typeof useMsgsConfigState>
