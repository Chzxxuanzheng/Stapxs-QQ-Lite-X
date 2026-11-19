<script setup lang="ts">
import { useCurrentMsg } from '@renderer/function/composable/inject/useCurrentMsg'
import { AtSeg } from '@renderer/function/model/segs'
import { User } from '@renderer/function/model/user'
import { vUserTooltip } from '@renderer/function/tooltip'
import useRuntimeData from '@renderer/state/runtimeData'

const { seg, showToMe = true } = defineProps<{
	seg: AtSeg
	showToMe?: boolean
}>()

const runtimeData = useRuntimeData()

const msg = useCurrentMsg()

function getAtMember(): User | string {
	if (!msg) return seg.user_id
	const user = msg.session?.getUserById(seg.user_id)
	if (user) return user
	else return seg.user_id
}
</script>

<template>
	<span
		v-user-tooltip="() => getAtMember()"
		class="msg-at msg-inline"
		:class="{
			atme: seg.user_id === runtimeData.loginInfo?.uin && showToMe,
		}"
	>
		{{ seg.plaintext(msg) }}
	</span>
</template>
