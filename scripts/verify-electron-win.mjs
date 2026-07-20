import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Windows Electron 构建烟雾测试脚本。
 *
 * 流程：构建 -> 启动可执行文件 -> 采集日志 -> 检查关键标记 -> 可选二次构建探测。
 * 产物会写入 artifacts/electron-smoke/<timestamp>/attempt-xx 目录。
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

/**
 * 解析命令行参数。
 * @param {string[]} argv 参数列表
 * @returns {{ retries: number, runSeconds: number, skipBuild: boolean, probeRebuild: boolean }} 运行选项
 */
function parseArgs(argv) {
    const options = {
        retries: 3,
        runSeconds: 30,
        skipBuild: false,
        probeRebuild: true
    }

    for (const arg of argv) {
        if (arg === '--skip-build') options.skipBuild = true
        else if (arg === '--no-probe-rebuild') options.probeRebuild = false
        else if (arg.startsWith('--retries=')) options.retries = Number(arg.split('=')[1])
        else if (arg.startsWith('--run-seconds=')) options.runSeconds = Number(arg.split('=')[1])
    }

    if (!Number.isFinite(options.retries) || options.retries < 1) {
        throw new Error('Invalid --retries value, must be >= 1')
    }
    if (!Number.isFinite(options.runSeconds) || options.runSeconds < 5) {
        throw new Error('Invalid --run-seconds value, must be >= 5')
    }

    return options
}

function nowStamp() {
    return new Date().toISOString().replaceAll(':', '-').replace(/\..+$/, '')
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true })
}

function writeText(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf8')
}

function appendText(filePath, content) {
    fs.appendFileSync(filePath, content, 'utf8')
}

/**
 * 读取运行日志并检查关键健康标记。
 * @param {string} filePath 日志文件路径
 * @returns {{ ok: boolean, missingMarkers: string[], hitForbiddenMarkers: string[], homeStateLine: string | undefined }} 检查结果
 */
function inspectRuntimeLog(filePath) {
    const text = fs.readFileSync(filePath, 'utf8')
    const requiredMarkers = [
        'ready-to-show',
        'did-finish-load',
        '[boot] option.init done',
        '[boot] win.init done',
        '[boot] win.state',
        '[boot] app.mount done',
        '[home] state=',
    ]
    const forbiddenMarkers = [
        '配置管理器未初始化',
        "Cannot read properties of undefined (reading 'close_ga')",
        "Cannot read properties of undefined (reading 'log_level')",
        "Cannot read properties of undefined (reading 'side_bar_width')",
        "Cannot read properties of undefined (reading 'dev_mode')",
        '[boot] app.mount failed',
        'did-fail-load',
        'render-process-gone',
    ]

    const missingMarkers = requiredMarkers.filter((marker) => !text.includes(marker))
    const hitForbiddenMarkers = forbiddenMarkers.filter((marker) => text.includes(marker))
    const homeStateLine = text
        .split(/\r?\n/)
        .find((line) => line.includes('[home] state='))

    return {
        ok: missingMarkers.length === 0 && hitForbiddenMarkers.length === 0,
        missingMarkers,
        hitForbiddenMarkers,
        homeStateLine,
    }
}

function quoteArgWindows(arg) {
    if (/\s/.test(arg)) return `"${arg.replaceAll('"', '\\"')}"`
    return arg
}

/**
 * 运行外部命令并可选落盘输出日志。
 * @param {string} command 可执行命令
 * @param {string[]} args 命令参数
 * @param {{ cwd?: string, logFile?: string }} [options] 执行选项
 * @returns {Promise<{ code: number }>} 退出码
 */
function runCommand(command, args, options = {}) {
    return new Promise((resolve) => {
        let actualCommand = command
        let actualArgs = args
        if (process.platform === 'win32' && command === 'pnpm') {
            actualCommand = 'cmd.exe'
            const cmdLine = ['pnpm', ...args].map(quoteArgWindows).join(' ')
            actualArgs = ['/d', '/s', '/c', cmdLine]
        }

        const proc = spawn(actualCommand, actualArgs, {
            cwd: options.cwd ?? rootDir,
            shell: false,
            env: process.env,
            windowsHide: true
        })

        const logFile = options.logFile
        if (logFile) appendText(logFile, `\n$ ${actualCommand} ${actualArgs.join(' ')}\n`)

        proc.stdout.on('data', (chunk) => {
            const text = chunk.toString()
            process.stdout.write(text)
            if (logFile) appendText(logFile, text)
        })

        proc.stderr.on('data', (chunk) => {
            const text = chunk.toString()
            process.stderr.write(text)
            if (logFile) appendText(logFile, text)
        })

        proc.on('close', (code) => {
            resolve({ code: code ?? 1 })
        })
    })
}

function getExeCandidates() {
    const candidates = []
    const unpacked = path.join(rootDir, 'dist_electron', 'win-unpacked', 'Stapxs QQ Lite X.exe')
    if (fs.existsSync(unpacked)) candidates.push(unpacked)

    const distDir = path.join(rootDir, 'dist_electron')
    if (fs.existsSync(distDir)) {
        for (const item of fs.readdirSync(distDir)) {
            if (!item.toLowerCase().endsWith('.exe')) continue
            if (item.toLowerCase().includes('setup')) continue
            candidates.push(path.join(distDir, item))
        }
    }

    return [...new Set(candidates)]
}

async function killByImage(logFile) {
    await runCommand('taskkill', ['/F', '/IM', 'Stapxs QQ Lite X.exe', '/T'], { logFile })
}

async function snapshotProcessList(filePath) {
    const lines = []
    const result = await new Promise((resolve) => {
        const proc = spawn('tasklist', ['/FI', 'IMAGENAME eq Stapxs QQ Lite X.exe', '/FO', 'CSV'], {
            shell: false,
            windowsHide: true
        })

        proc.stdout.on('data', (chunk) => lines.push(chunk.toString()))
        proc.stderr.on('data', (chunk) => lines.push(chunk.toString()))
        proc.on('close', (code) => resolve({ code: code ?? 1 }))
    })

    writeText(filePath, `tasklist exit code: ${result.code}\n${lines.join('')}`)
}

async function copyIfExists(src, dest) {
    if (!fs.existsSync(src)) return
    ensureDir(path.dirname(dest))
    await fs.promises.cp(src, dest, { recursive: true, force: true })
}

async function collectExternalLogs(targetDir) {
    const appData = process.env.APPDATA ?? ''
    const localAppData = process.env.LOCALAPPDATA ?? ''

    const logDirCandidates = [
        path.join(appData, 'Stapxs QQ Lite X', 'logs'),
        path.join(appData, 'stapxs-qq-lite-x', 'logs')
    ]

    let index = 0
    for (const src of logDirCandidates) {
        if (!src) continue
        if (!fs.existsSync(src)) continue
        const name = `source-${String(index + 1).padStart(2, '0')}`
        const dest = path.join(targetDir, 'external-logs', name)
        await copyIfExists(src, dest)
        index += 1
    }

    const crashDir = path.join(localAppData, 'CrashDumps')
    if (fs.existsSync(crashDir)) {
        const dumpFiles = fs
            .readdirSync(crashDir)
            .filter((name) => name.toLowerCase().endsWith('.dmp'))
            .filter((name) => {
                const lower = name.toLowerCase()
                return lower.includes('stapxs qq lite x') || lower.includes('stapxs-qq-lite-x')
            })
            .map((name) => {
                const fullPath = path.join(crashDir, name)
                const stat = fs.statSync(fullPath)
                return { name, fullPath, mtime: stat.mtimeMs }
            })
            .sort((a, b) => b.mtime - a.mtime)
            .slice(0, 5)

        if (dumpFiles.length > 0) {
            const dumpDestDir = path.join(targetDir, 'external-logs', 'crash-dumps')
            ensureDir(dumpDestDir)
            for (const dump of dumpFiles) {
                await fs.promises.copyFile(dump.fullPath, path.join(dumpDestDir, dump.name))
            }
        }
    }
}

/**
 * 启动 Electron 可执行文件并观察固定时间窗口。
 * @param {string} exePath 可执行文件路径
 * @param {number} runSeconds 观测秒数
 * @param {string} attemptDir 当前尝试目录
 * @returns {Promise<{ ok: boolean, reason: string }>} 运行结果
 */
async function runExeForWindow(exePath, runSeconds, attemptDir) {
    const runtimeLog = path.join(attemptDir, 'runtime.log')
    const stderrLog = path.join(attemptDir, 'runtime.stderr.log')
    writeText(runtimeLog, `exe=${exePath}\nwindow=${runSeconds}s\n`)
    writeText(stderrLog, '')

    return new Promise((resolve) => {
        const proc = spawn(exePath, [], {
            cwd: path.dirname(exePath),
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe']
        })

        let settled = false

        proc.stdout.on('data', (chunk) => appendText(runtimeLog, chunk.toString()))
        proc.stderr.on('data', (chunk) => appendText(stderrLog, chunk.toString()))

        proc.on('error', async (err) => {
            if (settled) return
            settled = true
            appendText(runtimeLog, `\nspawn_error=${String(err)}\n`)
            await killByImage(runtimeLog)
            resolve({ ok: false, reason: `spawn_error:${String(err)}` })
        })

        proc.on('exit', async (code, signal) => {
            if (settled) return
            settled = true
            appendText(runtimeLog, `\nexit code=${String(code)} signal=${String(signal)}\n`)
            await killByImage(runtimeLog)
            resolve({ ok: false, reason: `early_exit: code=${String(code)} signal=${String(signal)}` })
        })

        setTimeout(async () => {
            if (settled) return
            settled = true
            appendText(runtimeLog, `\nstatus=alive_for_${runSeconds}s\n`)
            await killByImage(runtimeLog)
            resolve({ ok: true, reason: `alive_for_${runSeconds}s` })
        }, runSeconds * 1000)
    })
}

/**
 * 主流程入口。
 * @returns {Promise<void>}
 */
async function main() {
    const options = parseArgs(process.argv.slice(2))
    const runRoot = path.join(rootDir, 'artifacts', 'electron-smoke', nowStamp())
    ensureDir(runRoot)
    console.log(`[verify] artifacts: ${runRoot}`)

    for (let i = 1; i <= options.retries; i += 1) {
        const attemptDir = path.join(runRoot, `attempt-${String(i).padStart(2, '0')}`)
        ensureDir(attemptDir)
        const buildLog = path.join(attemptDir, 'build.log')
        const summary = path.join(attemptDir, 'summary.txt')
        writeText(summary, `attempt=${i}\n`)

        if (!options.skipBuild) {
            const build = await runCommand('pnpm', ['run', 'build:electron'], { logFile: buildLog })
            if (build.code !== 0) {
                writeText(summary, `result=failed\nphase=build\ncode=${build.code}\n`)
                await snapshotProcessList(path.join(attemptDir, 'tasklist.txt'))
                await collectExternalLogs(attemptDir)
                continue
            }
        }

        const candidates = getExeCandidates()
        if (candidates.length === 0) {
            writeText(summary, 'result=failed\nphase=locate_exe\nreason=no_exe_found\n')
            await snapshotProcessList(path.join(attemptDir, 'tasklist.txt'))
            await collectExternalLogs(attemptDir)
            continue
        }

        const chosenExe = candidates[0]
        writeText(path.join(attemptDir, 'exe.txt'), candidates.join('\n'))

        const runtime = await runExeForWindow(chosenExe, options.runSeconds, attemptDir)
        await snapshotProcessList(path.join(attemptDir, 'tasklist.txt'))
        await collectExternalLogs(attemptDir)

        if (!runtime.ok) {
            writeText(summary, `result=failed\nphase=runtime\nreason=${runtime.reason}\n`)
            continue
        }

        const runtimeHealth = inspectRuntimeLog(path.join(attemptDir, 'runtime.log'))
        if (!runtimeHealth.ok) {
            const detailLines = [
                'result=failed',
                'phase=runtime_health',
                `reason=${runtime.reason}`,
                `missingMarkers=${runtimeHealth.missingMarkers.join(' | ') || 'none'}`,
                `forbiddenMarkers=${runtimeHealth.hitForbiddenMarkers.join(' | ') || 'none'}`,
                `homeState=${runtimeHealth.homeStateLine ?? 'missing'}`,
                '',
            ]
            writeText(summary, detailLines.join('\n'))
            continue
        }

        if (options.probeRebuild) {
            const probe = await runCommand('pnpm', ['run', 'build:electron'], {
                logFile: path.join(attemptDir, 'probe-build.log')
            })
            if (probe.code !== 0) {
                writeText(summary, `result=failed\nphase=probe_rebuild\ncode=${probe.code}\n`)
                await snapshotProcessList(path.join(attemptDir, 'tasklist-after-probe.txt'))
                continue
            }
        }

        writeText(
            summary,
            `result=passed\nreason=${runtime.reason}\nhomeState=${runtimeHealth.homeStateLine ?? 'missing'}\n`,
        )
        console.log(`[verify] passed on attempt ${i}`)
        process.exit(0)
    }

    console.error('[verify] all attempts failed')
    process.exit(1)
}

main().catch((err) => {
    console.error('[verify] fatal error', err)
    process.exit(1)
})
