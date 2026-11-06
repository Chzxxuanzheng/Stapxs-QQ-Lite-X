<template>
	<div class="doc">
		{{ $t('检测到您的host为') }}<a class="important">{{ host }}</a
		><br />
		{{ $t('该地址为公网IP，可以被任何人访问，存在被不法分子劫持的风险。')
		}}<br />
		{{ $t('在') }}
		<a
			class="link"
			href="https://wesley-young.github.io/2025-09-05-attack-on-onebot-service"
			target="_blank"
			>{{ $t('公网 OneBot 服务遭攻击事件') }}</a
		>
		{{
			$t(
				'的前车之鉴下，Stapxs QQ Lite X不接受无token公网登陆，为了您的数据安全，请您为您的协议端配备token',
			)
		}}
	</div>
</template>

<script setup lang="ts">
const { host } = defineProps<{
	host: string
}>()
</script>
