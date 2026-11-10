<!--
 * @FileDescription: 通知消息模板
 * @Author: Stapxs
 * @Date:
 *      2022/12/04
 *      2025/08/01
 * @Version:
 *         1.0 - 初始版本
 *         2.0 - 重构为setup语法
-->

<template>
	<section class="notice">
		<!-- #region == 接收到的消息 ========================================== -->
		<!-- 撤回 -->
		<div v-if="notice instanceof RecallNotice">
			<template v-if="notice.selfRevoke">
				<NoticeUser :user="notice.user" />
				<span>
					{{ $t('撤回了一条消息') }}
					<template v-if="notice.suffix">
						，{{ notice.suffix }}
					</template>
				</span>
			</template>
			<template v-else>
				<NoticeUser :user="notice.operator" />
				<span>{{ $t('撤回了') }}</span>
				<NoticeUser :user="notice.user" />
				<span>{{ $t('的消息') }}</span>
			</template>
			<button
				v-if="notice.originMsg"
				v-tooltip="{
					comp: MsgPrevTooltip,
					props: { msgs: [notice.originMsg] },
				}"
				@click="notice.session.inputMsg.reeditFromMsg(notice.originMsg)"
			>
				{{ $t('重新编辑') }}
			</button>
		</div>
		<!-- 禁言 -->
		<div v-else-if="notice instanceof BanNotice">
			<NoticeUser :user="notice.operator" />
			<span>{{ $t('禁言了') }}</span>
			<NoticeUser :user="notice.user" />
			<span>{{ notice.fTime }}</span>
		</div>
		<!-- 解除禁言 -->
		<div v-else-if="notice instanceof BanLiftNotice">
			<NoticeUser :user="notice.operator" />
			<span>{{ $t('解除了') }}</span>
			<NoticeUser :user="notice.user" />
			<span>{{ $t('的禁言') }}</span>
		</div>
		<!-- 戳一戳 -->
		<div v-else-if="notice instanceof PokeNotice">
			<NoticeUser :user="notice.user" />
			<img :src="notice.ico" :alt="notice.action" />
			<span>{{ notice.action }}</span>
			<NoticeUser :user="notice.target" />
			<span>{{ notice.suffix }}</span>
			<div class="space" />
		</div>
		<!-- 加群通知 -->
		<div v-else-if="notice instanceof JoinNotice">
			<template v-if="notice.operator">
				<NoticeUser :user="notice.operator" />
				<span>{{ $t('通过了') }}</span>
			</template>
			<template v-if="notice.inviter">
				<NoticeUser :user="notice.inviter" />
				<span>{{ $t('邀请') }}</span>
			</template>
			<NoticeUser :user="notice.user" />
			<span>{{ $t('加入了群聊') }}</span>
		</div>
		<!-- 退群通知 -->
		<div v-else-if="notice instanceof LeaveNotice">
			<template v-if="notice.kick">
				<NoticeUser :user="notice.operator" />
				<span>{{ $t('将') }}</span>
				<NoticeUser :user="notice.user" />
				<span>{{ $t('移出群聊') }}</span>
			</template>
			<template v-else>
				<NoticeUser :user="notice.user" />
				<span>{{ $t('离开了群聊') }}</span>
			</template>
		</div>
		<!-- 表情回应 -->
		<div v-else-if="notice instanceof ResponseNotice">
			<NoticeUser :user="notice.operator" />
			<span>{{ $t('回应了') }}</span>
			<NoticeUser :user="notice.user" />
			<span>{{ $t('的') }}</span>
			<button
				v-tooltip="{
					comp: MsgPrevTooltip,
					props: { msgs: [notice.msg] },
				}"
				class="cursor-pointer"
				@click="scrollToMsg(notice.msg)"
			>
				{{ $t('消息') }}
			</button>
			<span>:</span>
			<EmojiFace :emoji="Emoji.get(notice.emojiId)" />
		</div>
		<!-- #endregion -->

		<!-- #region == 内部系统消息 ========================================== -->
		<!-- 缺失消息 -->
		<div v-else-if="notice instanceof DeleteNotice">
			<span>{{ $t('这条消息迷失在虚空里了') }}</span>
		</div>
		<!-- 时间 -->
		<div
			v-else-if="notice instanceof TimeNotice && notice.time != undefined"
		>
			<span>{{ pastTime }}</span>
		</div>
		<!-- 通知 -->
		<div v-else-if="notice instanceof InfoNotice">
			<span>{{ notice.message }}</span>
		</div>
		<!-- #endregion -->
	</section>
</template>

<script setup lang="ts">
import Emoji from '@renderer/function/model/emoji'
import {
	BanLiftNotice,
	BanNotice,
	DeleteNotice,
	InfoNotice,
	JoinNotice,
	LeaveNotice,
	Notice,
	PokeNotice,
	RecallNotice,
	ResponseNotice,
	TimeNotice,
} from '@renderer/function/model/notice'
import { scrollToMsg } from '@renderer/function/utils/appUtil'
import { vTooltip } from '@renderer/function/utils/vcmd'
import { computed, ComputedRef } from 'vue'
import EmojiFace from '@renderer/components/EmojiFace.vue'
import NoticeUser from '@renderer/components/NoticeUser.vue'
import MsgPrevTooltip from '@renderer/components/tooltip/MsgPrevTooltip.vue'
import { useUpdateFlag } from '@renderer/function/composable/useUpdateFlag.js'
import { pastTimeFormat } from '@renderer/function/utils/systemUtil.js'
const { notice } = defineProps<{
	notice: Notice
}>()
let pastTime: ComputedRef<string> | undefined

if (notice instanceof TimeNotice && notice.time !== undefined) {
	const updateFlag = useUpdateFlag()
	pastTime = computed(() => {
		void updateFlag.value
		return pastTimeFormat(notice.time!.time)
	})
}
</script>
