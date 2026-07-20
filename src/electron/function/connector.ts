/**
 * 后端和前端的简易通信器，封装一些常用的交互
 */

import WebSocket from 'ws'
import { BrowserWindow, ipcMain } from 'electron'
import { logLevel } from '../index.ts'
import { getLogger } from './logger.ts'

export class Connector {
    private readonly logger = getLogger('connector')

    private readonly win: BrowserWindow
    private websocket: WebSocket | undefined
    private reconnectTimes = 0

    constructor(win: BrowserWindow) {
        this.logger.level = logLevel
        this.win = win
        // 初始化 ipc
        ipcMain.on('onebot:send', (_, json) => {
            this.websocket?.send(json)
        })
        ipcMain.on('onebot:close', () => {
            this.websocket?.close(1000)
            this.websocket = undefined
        })
        this.logger.info('后端连接器已初始化')
    }

    connect(url: string) {
        if (!url.includes('ws://') && !url.includes('wss://')) {
            url = 'wss://' + url
        }

        if (!this.websocket) {
            this.logger.info('正在连接到：', url)
            this.websocket = new WebSocket(url)
        } else {
            // 如果前端发起了连接请求，说明前端在未连接状态；断开已有连接，重新连接
            // PS：这种情况一般不会发生，大部分情况是因为 debug 模式前端热重载导致的
            this.websocket.close(1000)
            this.connect(url)
        }

        this.websocket.onopen = () => {
            this.reconnectTimes = 0
            this.logger.info('已成功连接到', url)
            this.win.webContents.send('onebot:onopen', {
                address: url,
            })
        }
        this.websocket.onmessage = (e) => {
            this.win.webContents.send('onebot:onmessage', e.data)
        }
        this.websocket.onclose = (e) => {
            this.websocket = undefined

            this.logger.info('连接已关闭，代码：', e.code)
            if (e.code != 1006 && e.code != 1015) {
                // 除了需要重连的情况，其他情况都直接常规处理
                this.win.webContents.send('onebot:onclose', {
                    code: e.code,
                    message: e.reason,
                    address: url,
                })
            } else {
                this.win.webContents.send('onebot:onclose', {
                    code: -1,
                    message: e.reason,
                    address: url,
                })
            }
            if (this.reconnectTimes < 4) {
                setTimeout(() => {
                    if (e.code == 1006) {
                        // 连接失败，尝试轮替协议重连
                        if (url.includes('wss://')) {
                            url = url.replace('wss://', 'ws://')
                        } else {
                            url = url.replace('ws://', 'wss://')
                        }
                        this.logger.warn('连接失败，尝试重连...')
                        this.connect(url)
                    }
                    this.reconnectTimes++
                }, 1500)
            }
        }
        this.websocket.onerror = (e) => {
            this.websocket = undefined
            this.logger.error('连接错误：', e)
        }
    }
    static async httpRequest(
        url: string,
        data: Record<string, unknown>,
        header: Record<string, unknown>,
        method: 'GET' | 'POST',
    ) {
        const params = { method, headers: header } as RequestInit
        if (method === 'GET') {
            const urlObj = new URL(url)
            Object.keys(data).forEach((key) => {
                urlObj.searchParams.append(key, String(data[key]))
            })
            url = urlObj.toString()
        } else {
            params.body = JSON.stringify(data)
            params.headers = {
                ...params.headers,
                'Content-Type': 'application/json',
            }
        }
        const response = await fetch(url, params)
        if (!response.ok) throw new Error('网络请求失败')
        return await response.text()
    }
}
