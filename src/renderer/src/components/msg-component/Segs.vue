<script setup lang="ts">
import {
	AtAllSeg,
	AtSeg,
	BlockquoteSeg,
	BreakSeg,
	CodeSeg,
	DeleteSeg,
	EmphasisSeg,
	ErrorSeg,
	FaceSeg,
	FileSeg,
	ForwardSeg,
	HeadingSeg,
	ImgSeg,
	InlineCodeSeg,
	JsonSeg,
	LinkSeg,
	ListSeg,
	MfaceSeg,
	PokeSeg,
	ReplySeg,
	Seg,
	StrongSeg,
	SuperFaceSeg,
	TableSeg,
	TextSeg,
	ThematicBreakSeg,
	VideoSeg,
	XmlSeg,
} from '@renderer/function/model/segs'

import ErrorSegComp from '@renderer/components/msg-component/ErrorSegComp.vue'
import UnknownSegComp from '@renderer/components/msg-component/UnknownSegComp.vue'
import ImgSegComp from '@renderer/components/msg-component/ImgSegComp.vue'
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
import TextSegComp from '@root/src/renderer/src/components/msg-component/TextSegComp.vue'
import BreakSegComp from '@root/src/renderer/src/components/msg-component/BreakSegComp.vue'
import LinkSegComp from '@root/src/renderer/src/components/msg-component/LinkSegComp.vue'
import BlockquoteSegDataComp from '@root/src/renderer/src/components/msg-component/BlockquoteSegDataComp.vue'
import DeleteSegComp from '@root/src/renderer/src/components/msg-component/DeleteSegComp.vue'
import CodeSegComp from '@root/src/renderer/src/components/msg-component/CodeSegComp.vue'
import EmphasisSegComp from '@root/src/renderer/src/components/msg-component/EmphasisSegComp.vue'
import HeadingSegComp from '@root/src/renderer/src/components/msg-component/HeadingSegComp.vue'
import InlineCodeSegComp from '@root/src/renderer/src/components/msg-component/InlineCodeSegComp.vue'
import ListSegComp from '@root/src/renderer/src/components/msg-component/ListSegComp.vue'
import StrongSegComp from '@root/src/renderer/src/components/msg-component/StrongSegComp.vue'
import TableSegComp from '@root/src/renderer/src/components/msg-component/TableSegComp.vue'
import ThematicBreakSegComp from '@root/src/renderer/src/components/msg-component/ThematicBreakSegComp.vue'
import ButtonSegComp from '@root/src/renderer/src/components/msg-component/ButtonSegComp.vue'
import { ButtonSeg } from '@root/src/renderer/src/function/model/segs/buttonSeg'

const { segs, showToMe = false } = defineProps<{
	segs: Seg[]
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
		<!-- Markdown -->
		<TextSegComp v-if="seg instanceof TextSeg" :seg="seg" />
		<BreakSegComp v-else-if="seg instanceof BreakSeg" :seg="seg" />
		<LinkSegComp v-else-if="seg instanceof LinkSeg" :seg="seg" />
		<InlineCodeSegComp
			v-else-if="seg instanceof InlineCodeSeg"
			:seg="seg"
		/>

		<CodeSegComp v-else-if="seg instanceof CodeSeg" :seg="seg" />

		<BlockquoteSegDataComp
			v-else-if="seg instanceof BlockquoteSeg"
			:seg="seg"
			:show-to-me="showToMe"
			@image-loaded="(height) => emit('imageLoaded', height)"
		/>
		<DeleteSegComp
			v-else-if="seg instanceof DeleteSeg"
			:seg="seg"
			:show-to-me="showToMe"
			@image-loaded="(height) => emit('imageLoaded', height)"
		/>
		<EmphasisSegComp
			v-else-if="seg instanceof EmphasisSeg"
			:seg="seg"
			:show-to-me="showToMe"
			@image-loaded="(height) => emit('imageLoaded', height)"
		/>
		<HeadingSegComp
			v-else-if="seg instanceof HeadingSeg"
			:seg="seg"
			:show-to-me="showToMe"
			@image-loaded="(height) => emit('imageLoaded', height)"
		/>
		<StrongSegComp
			v-else-if="seg instanceof StrongSeg"
			:seg="seg"
			:show-to-me="showToMe"
			@image-loaded="(height) => emit('imageLoaded', height)"
		/>

		<!-- 表 -->
		<ListSegComp
			v-else-if="seg instanceof ListSeg"
			:seg="seg"
			:show-to-me="showToMe"
			@image-loaded="(height) => emit('imageLoaded', height)"
		/>
		<TableSegComp
			v-else-if="seg instanceof TableSeg"
			:seg="seg"
			:show-to-me="showToMe"
			@image-loaded="(height) => emit('imageLoaded', height)"
		/>

		<ThematicBreakSegComp
			v-else-if="seg instanceof ThematicBreakSeg"
			:seg="seg"
		/>

		<!-- 常规 -->
		<ImgSegComp
			v-else-if="seg instanceof ImgSeg"
			:pos="getSegPos(seg)"
			:seg="seg"
			@image-loaded="(height) => emit('imageLoaded', height)"
		/>
		<ImgSegComp
			v-else-if="seg instanceof MfaceSeg"
			:pos="getSegPos(seg)"
			:seg="seg"
			@image-loaded="(height) => emit('imageLoaded', height)"
		/>
		<FaceSegComp v-else-if="seg instanceof FaceSeg" :seg="seg" />
		<AtSegComp
			v-else-if="seg instanceof AtSeg"
			:seg="seg"
			:show-to-me="showToMe"
		/>
		<AtAllSegComp
			v-else-if="seg instanceof AtAllSeg"
			:seg="seg"
			:show-to-me="showToMe"
		/>
		<ButtonSegComp v-else-if="seg instanceof ButtonSeg" :seg="seg" />
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
		<UnknownSegComp v-else :seg="seg" />
	</template>
</template>
