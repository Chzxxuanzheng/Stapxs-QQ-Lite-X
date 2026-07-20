import { createRequire } from 'module'

export type AppLogger = {
    level: string
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
    error: (...args: unknown[]) => void
}

function createFallbackLogger(name: string): AppLogger {
    return {
        level: 'info',
        info: (...args: unknown[]) => console.log(`[${name}]`, ...args),
        warn: (...args: unknown[]) => console.warn(`[${name}]`, ...args),
        error: (...args: unknown[]) => console.error(`[${name}]`, ...args),
    }
}

export function getLogger(name: string): AppLogger {
    try {
        const require = createRequire(import.meta.url)
        const mod = require('log4js')
        return mod.getLogger(name) as AppLogger
    } catch (err) {
        console.error(`[${name}] Failed to load log4js, fallback to console logger:`, err)
        return createFallbackLogger(name)
    }
}
