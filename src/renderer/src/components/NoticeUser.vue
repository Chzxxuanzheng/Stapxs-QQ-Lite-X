<template>
	<a v-if="user.user_id === runtimeData.loginInfo?.uin" class="me">
		{{ $t('你') }}
	</a>
	<a v-else v-user-tooltip="user">
		{{ user.name }}
	</a>
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
