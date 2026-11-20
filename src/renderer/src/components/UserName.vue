<script setup lang="ts">
import { Member, User } from '@root/src/renderer/src/function/model/user'

const { user, order = ['title', 'name', 'svg'] } = defineProps<{
	user: User
	order?: ('title' | 'name' | 'svg')[]
}>()
</script>

<template>
	<span class="user-name">
		<template v-for="type in order" :key="type">
			<template v-if="type === 'title'">
				<span v-if="user instanceof Member && user.title" class="title">
					{{ user.title }}
				</span>
			</template>
			<template v-if="type === 'name'">
				<a class="name">
					{{ user.name }}
				</a>
			</template>
			<template v-if="type === 'svg'">
				<font-awesome-icon
					v-if="user.bot"
					class="bot"
					:icon="['fas', 'robot']"
				/>
				<font-awesome-icon
					v-if="user instanceof Member && user.role === 'admin'"
					class="admin"
					:icon="['fas', 'star']"
				/>
				<font-awesome-icon
					v-if="user instanceof Member && user.role === 'owner'"
					class="owner"
					:icon="['fas', 'crown']"
				/>
			</template>
		</template>
	</span>
</template>
