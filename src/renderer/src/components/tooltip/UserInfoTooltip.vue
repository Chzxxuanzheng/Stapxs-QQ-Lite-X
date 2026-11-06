<!--
 * @FileDescription: 群成员消息悬浮窗
 * @Author: Mr.Lee
 * @Date: 2025/09/01
 *        2026/01/01
 * @Version: 1.0
 *           2.0 重构为提示工具组件
-->
<template>
	<div
		v-if="userInfo"
		class="member-info ss-card"
		:class="{
			leave:
				typeof userInfo === 'number' ||
				(userInfo instanceof Member && userInfo.leave),
		}"
	>
		<!-- 群成员 -->
		<template v-if="userInfo instanceof Member">
			<div>
				<img :src="userInfo.face" :alt="userInfo.name" />
				<div>
					<span name="id">{{ userInfo.user_id }}</span>
					<div>
						<a>{{ userInfo.name }}</a>
						<span v-user-role="userInfo.role">
							<template v-if="userInfo.role === Role.Bot">
								<font-awesome-icon :icon="['fas', 'robot']" />
							</template>
							<template v-if="userInfo.level">
								{{ 'Lv.' + userInfo.level }}
							</template>
							<template v-if="userInfo.title">
								{{
									userInfo.title.replace(
										/[\u202A-\u202E\u2066-\u2069]/g,
										'',
									)
								}}
							</template>
						</span>
					</div>
				</div>
			</div>
			<div class="member">
				<div>
					<template v-if="userInfo.banTime">
						<font-awesome-icon
							style="color: var(--color-red)"
							:icon="['fas', 'fa-volume-mute']"
						/>
						{{ $t('禁言中') }}
					</template>
				</div>
				<span v-if="userInfo.join_time">
					{{
						$t('{time} 加入群聊', {
							time: userInfo.join_time.format('year', 'day'),
						})
					}}
				</span>
			</div>
		</template>
		<!-- 已退群 -->
		<template v-else-if="typeof userInfo === 'number'">
			<div>
				<img
					:src="'https://q1.qlogo.cn/g?b=qq&s=0&nk=' + userInfo"
					:alt="String(userInfo)"
				/>
				<div>
					<span name="id">{{ userInfo }}</span>
					<div>
						<a>{{
							$t('已退群( {userId} )', { userId: userInfo })
						}}</a>
					</div>
				</div>
			</div>
		</template>
		<!-- 好友 -->
		<template v-else-if="userInfo instanceof User">
			<div>
				<img :src="userInfo.face" :alt="userInfo.name" />
				<div>
					<span name="id">{{ userInfo.user_id }}</span>
					<div>
						<a>{{ userInfo.name }}</a>
						<div>
							等级: <span>Lv {{ userInfo.level }}</span>
						</div>
					</div>
				</div>
			</div>
			<div v-if="userInfo.longNick" class="user">
				{{ userInfo.longNick }}
			</div>
		</template>
		<!-- 保底的 -->
		<template v-else>
			<div>
				<img :src="userInfo.face" :alt="userInfo.name" />
				<div>
					<span name="id">{{ userInfo.user_id }}</span>
					<div>
						<a>{{ userInfo.name }}</a>
						<div>
							<span v-if="userInfo.role === Role.Owner">
								{{ $t('群主') }}
							</span>
							<span v-else-if="userInfo.role === Role.Admin">
								{{ $t('管理员') }}
							</span>
							<span v-else-if="userInfo.role === Role.Bot">
								{{ $t('机器人') }}
							</span>
							<span v-if="userInfo.level"
								>Lv {{ userInfo.level }}</span
							>
						</div>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { Role } from '@renderer/function/adapter/enmu'
import { IUser, Member, User } from '@renderer/function/model/user'
import { vUserRole } from '@renderer/function/utils/vcmd'

const { user: userProp } = defineProps<{
	user: IUser | number | (() => IUser | number)
}>()

let userInfo: IUser | number
if (typeof userProp === 'function') {
	userInfo = userProp()
} else {
	userInfo = userProp
}
</script>

<style lang="css" scoped>
.tooltip-enter-active,
.tooltip-leave-active {
	transition:
		opacity 0.2s,
		transform 0.2s;
	transform-origin: top;
}
.tooltip-enter-from,
.tooltip-leave-to {
	opacity: 0;
	transform: scaleY(0) translate(-20px, calc(-100% - 0.8rem));
}
.tooltip-enter-to,
.tooltip-leave-from {
	opacity: 1;
	transform: scaleY(1) translate(-20px, calc(-100% - 0.8rem));
}
</style>
