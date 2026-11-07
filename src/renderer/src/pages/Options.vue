<!--
 * @FileDescription: 设置页面
 * @Author: Stapxs
 * @Date: 2022/09/26
 * @Version: 1.0
-->

<template>
	<div class="opt-main">
		<div>
			<Tab class="opt-tab">
				<div :name="$t('账号')">
					<OptAccount
						:config="config"
						@close-pop-box="emit('closePopBox')"
					/>
				</div>
				<div :name="$t('界面')">
					<OptView />
				</div>
				<div :name="$t('功能')">
					<OptFunction :config="config" />
				</div>
				<div :name="$t('高级')">
					<OptDev />
				</div>
				<div :name="$t('关于')">
					<AboutPan class="opt-about" show-u-i />
				</div>
			</Tab>
			<div class="ss-card end-card">
				<div>
					<div>
						<span>Stapxs QQ Lite X </span>
						<a>{{ getVersion() }}</a>
					</div>
					<span>Copyright © 2025 - 2026 Mr.Lee</span>
					<span
						style="color: var(--color-main); cursor: pointer"
						@click="
							openLink(
								`https://github.com/${runtimeData.repoName}`,
							)
						"
					>
						{{ runtimeData.repoName }}
					</span>
				</div>
				<svg
					style="width: 50px"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 274 259"
				>
					<g id="圖層_2" data-name="圖層 2">
						<g id="本体">
							<rect
								class="cls-1"
								x="19"
								y="167"
								width="28"
								height="28"
							/>
							<rect
								class="cls-1"
								x="62"
								y="181"
								width="14"
								height="14"
							/>
							<rect
								class="cls-1"
								x="89"
								y="163"
								width="14"
								height="14"
							/>
							<rect
								class="cls-1"
								x="62"
								y="63"
								width="14"
								height="14"
							/>
							<rect
								class="cls-1"
								x="82"
								y="85"
								width="14"
								height="14"
							/>
							<rect
								class="cls-1"
								x="114"
								y="66"
								width="28"
								height="28"
							/>
							<polygon
								class="cls-1"
								points="112.54 153.5 33.5 153.5 33.5 106.5 155 106.5 155.5 106.5 159.37 106.5 159.46 207.5 159.5 254.36 159.5 254.46 144.5 254.47 144.5 254.37 144.5 238.5 116.5 238.5 116.5 254.4 116.5 254.5 112.63 254.5 112.63 254.4 3.54 254.5 3.5 207.64 112.59 207.54 112.54 153.5"
							/>
							<polygon
								class="cls-1"
								points="183.51 114.5 198.5 114.5 198.5 130.5 198.5 131.49 269.5 131.42 269.48 103.5 219.5 103.55 219.5 85.47 269.5 85.42 269.5 84.5 269.5 36.42 269.5 20.5 269.48 20.5 251.5 20.5 251.5 5.52 251.5 5.5 232.5 5.5 232.5 5.53 183.5 5.58 183.53 36.5 232.5 36.45 232.5 54.53 219.5 54.55 219.5 54.5 182.5 54.5 182.5 114.5 183.51 114.5"
							/>
							<rect
								class="cls-1"
								x="242"
								y="153"
								width="28"
								height="28"
							/>
							<rect
								class="cls-1"
								x="183"
								y="240"
								width="14"
								height="14"
							/>
							<rect
								class="cls-1"
								x="204"
								y="166"
								width="26"
								height="14"
							/>
							<rect
								class="cls-1"
								x="183"
								y="190"
								width="14"
								height="41"
							/>
							<polygon
								class="cls-1"
								points="269.5 189.5 269.5 230.62 245.62 254.5 203.5 254.5 203.5 189.5 269.5 189.5"
							/>
							<rect class="cls-1" width="8" height="8" />
							<rect
								class="cls-1"
								x="266"
								y="251"
								width="8"
								height="8"
							/>
							<polygon
								class="cls-1"
								points="3.5 33.16 30.77 5.5 50.5 5.5 145.5 5.5 145.5 19.5 159.5 19.5 159.5 52.5 50.5 52.5 50.5 153.5 3.5 153.5 3.5 52.5 3.5 33.16"
							/>
						</g>
					</g>
				</svg>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import Tab from '@renderer/components/Tab.vue'
import OptAccount from '@renderer/pages/options/OptAccount.vue'
import OptDev from '@renderer/pages/options/OptDev.vue'
import OptFunction from '@renderer/pages/options/OptFunction.vue'
import OptView from '@renderer/pages/options/OptView.vue'

import { openLink } from '@renderer/function/utils/appUtil'
import { getVersion } from '@renderer/function/utils/systemUtil'
import AboutPan from '@renderer/components/popBox/AboutPan.vue'
import useRuntimeData from '@renderer/state/runtimeData'

const runtimeData = useRuntimeData()
const config = runtimeData.sysConfig

const emit = defineEmits<{
	closePopBox: []
}>()
</script>
