<script setup lang="ts">
import { CodeSeg } from '@renderer/function/model/segs'

const { seg } = defineProps<{
	seg: CodeSeg
}>()
</script>

<template>
	<pre class="msg-code"><code>{{ seg.content }}</code></pre>
</template>
