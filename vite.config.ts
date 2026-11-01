import ViteYaml from '@modyfi/vite-plugin-yaml'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import updateRecordPlugin from './plugin/update-record.ts'

import { resolve } from 'node:path'
import { visualizer } from 'rollup-plugin-visualizer'
import {
    defineConfig,
    loadEnv,
    UserConfigFnObject,
    type PluginOption,
} from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import qfaceInfo from './src/renderer/src/assets/img/qq-face/public/assets/qq_emoji/_index.json' with { type: 'json' }

export function configFactory(outPath: string): UserConfigFnObject {
    return ({ mode }) => {
        const env = loadEnv(mode, process.cwd())
        const useLocalLib = env.VITE_LOCAL_LIB == 'true'

        const plugins: PluginOption[] = [
            vue(),
            vueDevTools(),
            ViteYaml(),
            updateRecordPlugin(),
            VitePWA({
                registerType: 'autoUpdate',
                workbox: {
                    // 调高预缓存文件大小限制（例如设置为 10MB）
                    maximumFileSizeToCacheInBytes: 1024 * 1024 * 10,
                },
            }),
            visualizer() as PluginOption,
        ]

        if (useLocalLib) {
            const apngList: string[] = []
            const lottieList: string[] = []
            for (const info of qfaceInfo) {
                for (const pathInfo of info.assets) {
                    if (pathInfo.type === 2)
                        apngList.push(
                            `src/assets/img/qq-face/public/${pathInfo.path}`,
                        )
                    else if (pathInfo.type === 3)
                        lottieList.push(
                            `src/assets/img/qq-face/public/${pathInfo.path}`,
                        )
                }
            }

            const targets: any = []
            for (const src of apngList) {
                targets.push({
                    src: src,
                    dest: 'img/qface/',
                })
            }
            for (const src of lottieList) {
                targets.push({
                    src: src,
                    dest: 'img/qface/',
                })
            }

            plugins.push(
                viteStaticCopy({
                    targets: targets,
                }),
            )
        }

        return {
            root: './src/renderer',
            envDir: '../../',
            base: env.VITE_CDN_BASE || './',
            server: {
                port: 8080,
                proxy: {
                    '/api': {
                        target: 'http://localhost:3000',
                        changeOrigin: true,
                        rewrite: (path) => path.replace(/^\/api/, ''),
                    },
                },
            },
            plugins: plugins,
            resolve: {
                alias: {
                    '@renderer': resolve(__dirname, 'src/renderer/src'),
                },
            },
            build: {
                outDir: outPath,
                emptyOutDir: true,
                chunkSizeWarningLimit: 1100,
                rollupOptions: {
                    input: { main: resolve('src/renderer/index.html') },
                    external: [
                        resolve('src/renderer/src/assets/img/qq-face/docs'),
                    ],
                    onwarn: (warning) => {
                        if (warning.code === 'CIRCULAR_DEPENDENCY') return
                    },
                    output: {
                        chunkFileNames: 'assets/js/[name]-[hash].js',
                        entryFileNames: 'assets/js/[name]-[hash].js',
                        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
                        manualChunks(id) {
                            if (!id.includes('node_modules')) return

                            // 让每个插件都打包成独立的文件
                            // 兼容 pnpm 的虚拟存储结构，过滤掉 .pnpm 所在的路径部分
                            const parts = id.toString().split('node_modules/')
                            const name = parts.findLast(
                                (p) => p && !p.startsWith('.pnpm'),
                            )
                            if (name) return name.split('/')[0].toString()
                            return
                        },
                    },
                },
            },
        }
    }
}

// https://vite.dev/config/
/** @type {import('vite').UserConfig} */
export default defineConfig(configFactory(resolve(__dirname, 'dist')))
