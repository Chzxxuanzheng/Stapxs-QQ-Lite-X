import { defineScopedState } from '@renderer/function/utils/vueUtil'
import { computed, shallowReactive, shallowRef } from 'vue'
import { Msg } from '@renderer/function/model/msg'
import {
	ErrorSeg,
	JsonSeg,
	MdSeg,
	UnknownSeg,
	XmlSeg,
} from '@renderer/function/model/seg'
import { Message } from '@renderer/function/model/message'

const BLACK_SEGS = [MdSeg, JsonSeg, XmlSeg, ErrorSeg, UnknownSeg]

function isCantSendMsg(msg: Msg): boolean {
	for (const seg of msg.message) {
		for (const badSegCan of BLACK_SEGS) {
			if (seg instanceof badSegCan) return true
		}
	}
	return false
}

const useMultiselectState = defineScopedState(() => {
	const multiselectMode = shallowRef(false)
	const selected = shallowReactive<Set<Msg>>(new Set())
	const cantSendMsgNum = shallowRef(0)

	function start() {
		multiselectMode.value = true
	}
	function select(msg: Msg) {
		if (!multiselectMode) throw new Error('只能在多选模式下添加选中消息')
		selected.add(msg)
		if (isCantSendMsg(msg)) cantSendMsgNum.value++
	}
	function unselect(msg: Msg) {
		if (!multiselectMode) throw new Error('只能在多选模式下移除选中消息')
		selected.delete(msg)
		if (isCantSendMsg(msg)) cantSendMsgNum.value--
	}
	function end() {
		selected.clear()
		multiselectMode.value = false
		cantSendMsgNum.value = 0
	}
	function toggleSelect(msg: Msg) {
		if (selected.has(msg)) unselect(msg)
		else select(msg)
	}
	function createSelectedList(msgs: Message[]): Msg[] {
		if (!multiselectMode)
			throw new Error('只能在多选模式下生成选中消息列表')

		return msgs.filter((m) => m instanceof Msg && has(m)) as Msg[]
	}
	function has(msg: Msg): boolean {
		return selected.has(msg)
	}
	return {
		active: computed(() => multiselectMode.value),
		length: computed(() => selected.size),
		start,
		end,
		select,
		unselect,
		toggleSelect,
		createSelectedList,
		has,
		hasCantSend: computed(() => cantSendMsgNum.value > 0),
	}
})

export default useMultiselectState

export type MultiselectState = ReturnType<typeof useMultiselectState>
