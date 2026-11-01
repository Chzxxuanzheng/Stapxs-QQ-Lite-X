import { logger } from '@renderer/function/base'
import useRuntimeData from '@renderer/state/runtimeData'
import { shallowRef, watchEffect, markRaw } from 'vue'

export type WinAction = 'maximize' | 'minimize' | 'unmaximize' | 'close'

const win = markRaw({
    _darkMode: shallowRef<boolean | undefined>(undefined),
    _vibrancyMode: shallowRef<boolean>(false),

    hasInit: false,

    /**
     * 初始化
     */
    async init() {
        const runtimeData = useRuntimeData()

        // 添加样式
        await this.loadAppendStyle()
        // 安全区域规划
        document.body.style.setProperty(
            '--safe-area-bottom',
            Math.max(runtimeData.sysConfig.fs_adaptation, 0) + 'px',
        )
        document.body.style.setProperty('--safe-area-top', '0')
        document.body.style.setProperty('--safe-area-left', '0')
        document.body.style.setProperty('--safe-area-right', '0')
        // 添加配置监听
        // 亮暗模式
        this.refreshDarkMode()
        watchEffect(() => {
            this.refreshDarkMode()
        })
        // 透明模式
        this.refreshVibrancyState()
        watchEffect(() => {
            this.refreshVibrancyState()
        })

        this.hasInit = true
    },

    async loadAppendStyle() {
        logger.info('正在装载补充样式……')
        await import('@renderer/assets/css/append/append_vibrancy.css')
        logger.info('透明 UI 附加样式加载完成')
    },

    /**
     * 刷新透明效果状态
     */
    refreshVibrancyState() {
        const runtimeData = useRuntimeData()
        if (this.hasInit) this.changeAnimation()

        const useVibrancy = runtimeData.sysConfig.vibrancy
        if (useVibrancy === this._vibrancyMode.value) return
        this.setVibrancy(useVibrancy)
    },
    /**
     * 设置透明效果
     */
    setVibrancy(use: boolean) {
        const runtimeData = useRuntimeData()
        if (use) {
            document.body.classList.add('vibrancy')
            runtimeData.tags.vibrancy = true
            logger.info('透明 UI 附加样式启用')
        } else {
            document.body.classList.remove('vibrancy')
            runtimeData.tags.vibrancy = false
            logger.info('已移除透明 UI 效果禁用')
        }

        this._vibrancyMode.value = use
    },

    /**
     * 刷新暗色模式
     */
    refreshDarkMode() {
        const runtimeData = useRuntimeData()
        let darkMode: boolean
        switch (runtimeData.sysConfig.opt_dark_mode) {
            case 'auto':
                darkMode = runtimeData.defaultColorMode === 'dark'
                break
            case 'dark':
                darkMode = true
                break
            case 'light':
                darkMode = false
                break
        }
        if (darkMode === this._darkMode.value) return
        this.setDarkMode(darkMode)
    },
    /**
     * 设置暗色模式
     * @param dark 是否启用
     */
    setDarkMode(dark: boolean) {
        if (this.hasInit) this.changeAnimation()
        if (dark) {
            document.body.classList.remove('light')
            document.body.classList.add('dark')
        } else {
            document.body.classList.remove('dark')
            document.body.classList.add('light')
        }
        this._darkMode.value = dark
    },

    /**
     * 样式切换动画
     */
    changeAnimation(time: number = 300) {
        document.body.style.transition = `${time}ms`
        setTimeout(() => {
            document.body.style.transition = ''
        }, time)
    },

    get darkMode() {
        return this._darkMode.value
    },
    get vibrancyMode() {
        return this._vibrancyMode.value
    },
})

export default win
