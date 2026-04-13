<template>
    <div class="history-box">
        <div v-if="history.record.length === 0" class="space">
            <font-awesome-icon :icon="['fas', 'inbox']" />
            <span>{{ $t('空空如也') }}</span>
        </div>
        <div v-else class="main">
            <TinySessionBody
                v-for="session in history.record"
                :key="session.id"
                :session="session"
                @click="changeSession(session)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { changeSession } from '@renderer/function/utils/msgUtil'
import { useSessionHistoryStore } from '@renderer/state/sessionHistory'
import TinySessionBody from '../TinySessionBody.vue'

const history = useSessionHistoryStore()
</script>
