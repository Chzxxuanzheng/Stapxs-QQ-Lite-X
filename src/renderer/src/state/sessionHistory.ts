import { Session } from '@renderer/function/model/session'
import { defineStore } from 'pinia'
import { shallowRef } from 'vue'

const MAX_LENGTH = 50

export const useSessionHistoryStore = defineStore('session-history', () => {
    const record = shallowRef<Session[]>([])

    function add(session: Session) {
        record.value = [
            session,
            ...record.value.filter((i) => i.id !== session.id),
        ]
        if (record.value.length > MAX_LENGTH) {
            record.value.pop()
            record.value = [...record.value]
        }
    }

    return {
        record,
        add,
    }
})
