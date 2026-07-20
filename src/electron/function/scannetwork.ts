import os from 'os'
import http from 'http'

import { logLevel } from '../index.ts'
import { getLogger } from './logger.ts'

class ScanNetwork {

    private logger = getLogger('ScanNetwork')
    private win: Electron.BrowserWindow

    constructor(win: Electron.BrowserWindow) {
        this.logger.level = logLevel
        this.win = win
    }

    /**
     * 获取局域网网段
     * @returns {string[]} 所有可能的 IP 地址
     */
    private getLocalSubnetIPs(): string[] {
        const interfaces = os.networkInterfaces()
        const ips = [] as string[]

        Object.entries(interfaces).forEach(([name, network]) => {
            if (!name.startsWith('bridge')) {
                network?.forEach(({ family, address, netmask }) => {
                    if (family === 'IPv4' && !address.startsWith('127') && !address.startsWith('169.254')) {
                        const subnetParts = address.split('.').map(Number)
                        const netmaskParts = netmask.split('.').map(Number)

                        this.logger.info(`IP: ${address}, Netmask: ${netmask}`)

                        for (let i = 1; i <= 254; i++) {
                            const possibleIP = subnetParts.map((part, index) => {
                                return (part & netmaskParts[index]) | ((i & ~netmaskParts[index]) & 0xff)
                            }).join('.')
                            ips.push(possibleIP === address ? '127.0.0.1' : possibleIP)
                        }
                    }
                })
            }
        })

        return [...new Set(ips)]
    }

    /**
     * 检查指定 IP 和端口是否可连接
     * @param {string} ip - 目标 IP
     * @param {number} port - 目标端口
     * @returns {Promise<boolean>} 是否可连接
    **/
    private isPortOpen(ip: string, port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const req = http.get(`http://${ip}:${port}`, {
                timeout: 200
            }, (res) => {
                resolve(true)
                res.destroy()
            })

            req.on('error', () => {
                resolve(false)
            })

            req.on('timeout', () => {
                req.destroy()
                resolve(false)
            })
        })
    }

    /**
     * 遍历局域网 IP 并检测端口
     * @param {number} port - 要检查的端口
     */
    public async scanNetwork() {
        const portList = [3001, 5700]
        const ips = this.getLocalSubnetIPs()
        if(ips.length < 1000) {
            const results = await Promise.all(
                portList.flatMap(port =>
                    ips.map((ip) => this.isPortOpen(ip, port).then((isOpen) => ({ ip, port, isOpen })))
                )
            )
            this.logger.info('以下 IP 的端口开放：')
            results.filter(({ isOpen }) => isOpen)
                .forEach(({ ip, port }) => {
                    this.logger.info(`${ip}:${port}`)
                    this.win.webContents.send('sys:serviceFound', {
                        address: ip,
                        port: port
                    })
                })
        } else {
            this.logger.error('IP 数量过多，放弃扫描')
        }

    }
}

export default ScanNetwork
