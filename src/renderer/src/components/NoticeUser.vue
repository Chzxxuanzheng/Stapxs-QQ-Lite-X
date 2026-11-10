<template>
	<span v-if="user.user_id === runtimeData.loginInfo?.uin">
		{{ $t('你') }}
	</span>
	<button v-else v-user-tooltip="user">
		{{ user.name }}
	</button>
</template>

<script setup lang="ts">
import { IUser } from '@renderer/function/model/user'
import { vUserTooltip } from '@renderer/function/tooltip'
import useRuntimeData from '@renderer/state/runtimeData'

const runtimeData = useRuntimeData()

const { user } = defineProps<{
	user: IUser
}>()
</script>
