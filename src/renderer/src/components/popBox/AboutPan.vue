<!--
 * @FileDescription: 关于模板
 * @Author: Stapxs
 * @Date: 2024/04/22
 * @Version: 1.0
-->
<template>
	<div class="about-pan">
		<div
			id="logo-card"
			:class="'ss-card logo-card' + (showUI ? '' : ' hidd-sha')"
		>
			<Icon />
			<div>
				<span>{{ $t('Stapxs QQ Lite X') }}</span>
			</div>
			<span style="text-align: center">
				{{ $t('一个跨协议的') }}
				<span
					style="color: var(--color-main); cursor: pointer"
					@click="
						openLink(
							'https://stapxs.github.io/Border-Card-UI/docs/',
						)
					"
				>
					Stapxs QQ Lite
				</span>
				{{ $t('发行版') }}
			</span>
			<a>v{{ getVersion() }}</a>
			<div class="buttons">
				<a class="ss-button" @click="goGithub()">{{
					$t('访问 GitHub 仓库')
				}}</a>
				<a
					class="ss-button"
					style="width: 30px"
					@click="updateRecord()"
				>
					<font-awesome-icon :icon="['fas', 'clock-rotate-left']" />
				</a>
				<a class="ss-button" style="width: 30px" @click="goBlog()">
					<font-awesome-icon :icon="['fas', 'circle-info']" />
				</a>
			</div>
		</div>
		<div
			class="ss-card jump-card"
			:style="showUI ? '' : 'background: var(--color-card-1);'"
			@click="dependencies()"
		>
			<header>
				<div />
				{{ $t('许可版权声明') }}
			</header>
			<font-awesome-icon :icon="['fas', 'angle-right']" />
		</div>
		<div
			class="ss-card jump-card"
			:style="showUI ? '' : 'background: var(--color-card-1);'"
			@click="dependencies('service', '第三方服务声明')"
		>
			<header>
				<div />
				{{ $t('第三方服务声明') }}
			</header>
			<font-awesome-icon :icon="['fas', 'angle-right']" />
		</div>
		<div
			v-if="showUI"
			class="ss-card bcd-about"
			@click="openLink('https://stapxs.github.io/Border-Card-UI/docs/')"
		>
			<div>
				<div>
					<div
						class="bcd-body"
						style="
							width: 45%;
							display: flex;
							justify-content: flex-end;
							border-radius: 0 5px 0 0;
						"
					>
						<div
							style="
								background: var(--color-card-2);
								border-radius: 16px;
								width: 25%;
								margin: 5px 0 5px 5px;
							"
						/>
						<div
							style="
								background: var(--color-card-2);
								border-radius: 100%;
								width: 7px;
								margin: 5px 8px 5px 5px;
							"
						/>
					</div>
				</div>
				<div>
					<div
						class="bcd-body"
						style="width: 20%; margin-right: 25%"
					/>
					<div
						class="bcd-body"
						style="
							width: 55%;
							display: flex;
							justify-content: flex-end;
						"
					>
						<div
							style="
								background: var(--color-card-2);
								width: calc(25% + 26px);
								margin-right: 5px;
								border-radius: 5px 5px 0 0;
								display: flex;
								justify-content: flex-end;
							"
						>
							<div
								style="
									background: var(--color-main);
									border-radius: 100%;
									width: 7px;
									margin: 10px 5px 0 5px;
								"
							/>
							<div
								style="
									background: var(--color-card-1);
									border-radius: 16px;
									width: calc(100% - 25px);
									margin: 10px 7px 0 0;
								"
							/>
						</div>
					</div>
				</div>
				<div>
					<div
						class="bcd-body"
						style="width: 10%; margin-right: 20%"
					/>
					<div
						class="bcd-body"
						style="
							width: 40%;
							display: flex;
							justify-content: flex-end;
						"
					>
						<div
							style="
								background: var(--color-card-2);
								width: calc(35% + 25px);
								margin-right: 5px;
								display: flex;
								justify-content: flex-end;
							"
						>
							<div
								style="
									background: var(--color-card-1);
									border-radius: 16px;
									width: calc(100% - 14px);
									height: calc(100% - 10px);
									margin-top: 2.5px;
									margin-right: 7px;
								"
							/>
						</div>
					</div>
				</div>
				<div>
					<div
						class="bcd-body"
						style="width: 15%; margin-right: 40%"
					/>
					<div
						class="bcd-body"
						style="
							width: 35%;
							display: flex;
							justify-content: flex-end;
						"
					>
						<div
							style="
								background: var(--color-card-2);
								width: calc(40% + 25px);
								margin-right: 5px;
								border-radius: 0 0 5px 5px;
							"
						/>
					</div>
				</div>
				<div>
					<div class="bcd-body" style="width: 43%" />
				</div>
				<div>
					<div
						class="bcd-body"
						style="width: 13%; margin-right: 20%"
					/>
					<div class="bcd-body" style="width: 49%" />
				</div>
				<div>
					<div class="bcd-body" style="width: 57%" />
				</div>
				<div>
					<div
						class="bcd-body"
						style="width: 17%; margin-right: 26%"
					/>
					<div class="bcd-body" style="width: 52%" />
				</div>
				<div>
					<div class="bcd-body" style="width: 8%; margin-right: 8%" />
					<div class="bcd-body" style="width: 60%">
						<div
							style="
								background: var(--color-card-2);
								width: calc(100% - 7px);
								height: calc(100% - 7px);
								margin-top: 7px;
								border-radius: 0 7px 0 0;
							"
						/>
					</div>
				</div>
				<div>
					<div
						class="bcd-body"
						style="width: 40%; border-radius: 0 0 7px 0"
					>
						<div
							style="
								background: var(--color-card-2);
								width: calc(100% - 7px);
								height: calc(100% - 7px);
								margin-right: 7px;
								border-radius: 0 0 7px 0;
							"
						/>
					</div>
				</div>
			</div>
			<span>Border Card UI For Web</span>
			<br />
			<a>version rolling</a>
		</div>
	</div>
</template>

<script setup lang="ts">
import { openLink, sendStatEvent } from '@renderer/function/utils/appUtil'
import { popBox } from '@renderer/function/utils/popBox'
import app from '@renderer/main'
import DepPan from './DepPan.vue'
import Icon from '@renderer/components/Icon.vue'
import { getVersion } from '@renderer/function/utils/systemUtil'
import useRuntimeData from '@renderer/state/runtimeData'
import UpdateRecordBox from './UpdateRecordBox.vue'

const { showUI } = defineProps<{
	showUI: boolean
}>()

const emit = defineEmits<{
	closePopBox: []
}>()

const runtimeData = useRuntimeData()

function dependencies(
	type = undefined as string | undefined,
	title = '许可版权声明',
) {
	const $t = app.config.globalProperties.$t
	emit('closePopBox')
	popBox({
		title: $t(title),
		svg: 'key',
		comp: DepPan,
		props: {
			type: type,
		},
	})
}

function goGithub() {
	openLink(`https://github.com/${runtimeData.repoName}`)
	sendStatEvent('click_statistics', { name: 'visit_github' })
}

function goBlog() {
	openLink('https://leenet.xyz/about')
	sendStatEvent('click_statistics', { name: 'visit_blog' })
}

function updateRecord() {
	popBox({
		comp: UpdateRecordBox,
		title: app.config.globalProperties.$t('更新记录'),
		button: [
			{
				text: app.config.globalProperties.$t('关闭'),
				master: true,
			},
		],
	})
}
</script>

<style>
.hidd-sha {
	box-shadow: none !important;
}
</style>
