<script setup lang="ts">
import {
	AtAllSeg,
	AtSeg,
	ErrorSeg,
	FaceSeg,
	FileSeg,
	ForwardSeg,
	ImgSeg,
	JsonSeg,
	MdSeg,
	MfaceSeg,
	PokeSeg,
	ReplySeg,
	Seg,
	SuperFaceSeg,
	TxtSeg,
	VideoSeg,
	XmlSeg,
} from '@renderer/function/model/seg'

import ErrorSegComp from '@renderer/components/msg-component/ErrorSegComp.vue'
import UnkonwnSegComp from '@renderer/components/msg-component/UnkonwnSegComp.vue'
import TxtSegComp from '@renderer/components/msg-component/TxtSegComp.vue'
import ImgSegComp from '@renderer/components/msg-component/ImgSegComp.vue'
import MdSegComp from '@renderer/components/msg-component/MdSegComp.vue'
import FaceSegComp from '@renderer/components/msg-component/FaceSegComp.vue'
import AtSegComp from '@renderer/components/msg-component/AtSegComp.vue'
import AtAllSegComp from '@renderer/components/msg-component/AtAllSegComp.vue'
import FileSegComp from '@renderer/components/msg-component/FileSegComp.vue'
import ReplySegComp from '@renderer/components/msg-component/ReplySegComp.vue'
import PokeSegComp from '@renderer/components/msg-component/PokeSegComp.vue'
import SuperFaceSegComp from '@renderer/components/msg-component/SuperFaceSegComp.vue'
import JsonSegComp from '@renderer/components/msg-component/JsonSegComp.vue'
import XmlSegComp from '@renderer/components/msg-component/XmlSegComp.vue'
import VideoSegComp from '@renderer/components/msg-component/VideoSegComp.vue'
import ForwardSegComp from '@renderer/components/msg-component/ForwardSegComp.vue'
import useRuntimeData from '@renderer/state/runtimeData'

const { segs, showToMe = false } = defineProps<{
	segs: Seg[],
	showToMe?: boolean
}>()

const emit = defineEmits<{
	imageLoaded: [height: number]
}>()

function getSegPos(seg: Seg): 'alone' | 'top' | 'middle' | 'bottom' {
	if (segs.length === 1) return 'alone'
	const index = segs.indexOf(seg)
	if (index === 0) return 'top'
	if (index === segs.length - 1) return 'bottom'
	return 'middle'
}

const runtimeData = useRuntimeData()
</script>

<template>
	<template v-for="(seg, index) in segs" :key="index">
		<div v-if="seg.type === undefined" />
		<span v-else-if="runtimeData.sysConfig.debug_msg" class="msg-text">
			{{ seg }}
		</span>
		<TxtSegComp v-if="seg instanceof TxtSeg" :seg="seg" />
		<MdSegComp v-else-if="seg instanceof MdSeg" :seg="seg" />
		<ImgSegComp v-else-if="seg instanceof ImgSeg" :pos="getSegPos(seg)" :seg="seg"
			@image-loaded="(height) => emit('imageLoaded', height)" />
		<ImgSegComp v-else-if="seg instanceof MfaceSeg" :pos="getSegPos(seg)" :seg="seg"
			@image-loaded="(height) => emit('imageLoaded', height)" />
		<FaceSegComp v-else-if="seg instanceof FaceSeg" :seg="seg" />
		<AtSegComp v-else-if="seg instanceof AtSeg" :seg="seg" :show-to-me="showToMe" />
		<AtAllSegComp v-else-if="seg instanceof AtAllSeg" :seg="seg" :show-to-me="showToMe" />
		<!-- 单个消息 -->
		<FileSegComp v-else-if="seg instanceof FileSeg" :seg="seg" />
		<ReplySegComp v-else-if="seg instanceof ReplySeg" :seg="seg" />
		<PokeSegComp v-else-if="seg instanceof PokeSeg" :seg="seg" />
		<VideoSegComp v-else-if="seg instanceof VideoSeg" :seg="seg" />
		<ForwardSegComp v-else-if="seg instanceof ForwardSeg" :seg="seg" />
		<SuperFaceSegComp v-else-if="seg instanceof SuperFaceSeg" :seg="seg" />
		<!-- 卡片消息 -->
		<JsonSegComp v-else-if="seg instanceof JsonSeg" :seg="seg" />
		<XmlSegComp v-else-if="seg instanceof XmlSeg" :seg="seg" />
		<!-- 兜底 -->
		<ErrorSegComp v-else-if="seg instanceof ErrorSeg" :seg="seg" />
		<UnkonwnSegComp v-else :seg="seg" />
	</template>
</template>