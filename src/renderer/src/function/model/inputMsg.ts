/*
 * @FileDescription: 输入消息模块
 * @Author: Mr.Lee
 * @Date:
 *      2025/10/6
 * @Description: 用于处理用户输入消息
 */
// eslint-disable-next-line no-restricted-imports
import { shallowRef, shallowReactive, computed, nextTick, reactive } from 'vue'
import { Msg } from './msg'
import { AtSeg, ImgSeg, ReplySeg, Seg, TxtSeg } from './seg'
import { autoMarkRaw } from './utils'
import useRuntimeData from '@renderer/state/runtimeData'
import { Session } from './session'
import { queueWait } from '../utils/baseUtil'
import { logger, popInfo } from '../base'
import imageCompression from 'browser-image-compression'
import app from '@renderer/main'

interface ImgCache {
    state: 'compressing' | 'done' | 'error'
    dataurl?: string
    id: number
}

@autoMarkRaw
export class InputMsg {
    private readonly _reply = shallowRef<Msg | undefined>()
    private readonly _content = shallowRef<string>('')
    private readonly _isVoid = computed<boolean>(() => {
        if (this.reply) return false
        return this.content.trim().length === 0
    })
    private readonly _sqList = computed(() => {
        const reg = /\[SQ:\d+\]/gm
        return this.content.match(reg) || []
    })
    private readonly selfUUID = crypto.randomUUID()
    readonly sqCache = shallowReactive<Seg[]>([])
    readonly imgCache = reactive<Map<string, ImgCache>>(new Map())

    constructor(readonly session: Session) {}

    /**
     * 设置当前回复消息
     * @param msg
     */
    setReply(msg: Msg) {
        this._reply.value = msg
        const runtimeData = useRuntimeData()
        if (
            runtimeData.sysConfig.reply_with_at === 'insert' &&
            msg.sender?.user_id && 
			msg.sender.user_id !== runtimeData.loginInfo!.uin
        ) {
            this.addSq(new AtSeg(msg.sender.user_id))
        }
        this.focus()
    }
    /**
     * 移除当前回复消息
     */
    rmReply() {
        this._reply.value = undefined
    }
    /**
     * 添加一个特殊消息段
     * @param seg
     */
    addSq(seg: Seg): number {
        const id = this.sqCache.length
        this.sqCache.push(seg)

        const sqCode = `[SQ:${id}]`
        this.insertContent(sqCode)
        this.focus()
        return id
    }

    insertContent(content: string): void {
        const inputDom = document.getElementById(
            'main-input',
        ) as HTMLTextAreaElement | null
        const selectionStart = inputDom?.selectionStart
        const selectionEnd = inputDom?.selectionEnd ?? selectionStart
        if (
            inputDom?.value === this.content &&
            selectionStart &&
            selectionStart < this.content.length
        ) {
            const first = this.content.substring(0, selectionStart)
            const last = this.content.substring(
                selectionEnd!,
                this.content.length,
            )
            this.content = first + content + last
            nextTick(() => {
                inputDom.selectionStart = selectionStart + content.length
                inputDom.selectionEnd = selectionStart + content.length
            })
        } else {
            this.content += content
        }
    }

    /**
     * 添加一个图片
     * @param img
     */
    async addImg(img: File) {
        const main = async (): Promise<number> => {
            const sampleSize = 16 * 1024 // 每段采样 16KB，总共处理约 48KB 数据
            let combined: Uint8Array

            if (img.size > sampleSize * 3) {
                const midPos =
                    Math.floor(img.size / 2) - Math.floor(sampleSize / 2)
                const [start, mid, end] = await Promise.all([
                    img.slice(0, sampleSize).arrayBuffer(),
                    img.slice(midPos, midPos + sampleSize).arrayBuffer(),
                    img.slice(img.size - sampleSize).arrayBuffer(),
                ])

                combined = new Uint8Array(
                    start.byteLength + mid.byteLength + end.byteLength,
                )
                combined.set(new Uint8Array(start), 0)
                combined.set(new Uint8Array(mid), start.byteLength)
                combined.set(
                    new Uint8Array(end),
                    start.byteLength + mid.byteLength,
                )
            } else {
                // 文件极小时读取全量
                combined = new Uint8Array(await img.arrayBuffer())
            }

            const hashBuffer = await crypto.subtle.digest(
                'SHA-256',
                combined.buffer as ArrayBuffer,
            )
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            // 结果拼接 16 进制的文件长度，作为额外混淆
            const hash =
                hashArray.map((b) => b.toString(16).padStart(2, '0')).join('') +
                '-' +
                img.size.toString(16)

            if (!this.imgCache.has(hash)) {
                this.imgCache.set(hash, {
                    state: 'compressing',
                    id: this.sqCache.length,
                })
                this.sqCache.push(new TxtSeg('')) // 占位，等待图片处理完成后更新
                this.processImgFile(img, hash)
            }

            return this.imgCache.get(hash)!.id
        }
        const id = await queueWait(main(), this.selfUUID + '-img')
        const sqCode = `[SQ:${id}]`
        this.insertContent(sqCode)
    }

    /**
     * 移除一张图片
     * @param index
     */
    rmImg(hash: string): void {
        const info = this.imgCache.get(hash)
        if (!info) return
        this.imgCache.delete(hash)
        this.content = this.content.replaceAll(`[SQ:${info.id}]`, '')
    }

    /**
     * 渲染出消息序列
     */
    render(): Seg[] {
        const $t = app.config.globalProperties.$t
        // 解析图片
        for (const info of this.imgCache.values()) {
            let seg: Seg
            switch (info.state) {
                case 'compressing':
                    seg = new TxtSeg(`[${$t('正在处理图片')}]`)
                    break
                case 'error':
                    seg = new TxtSeg(`[${$t('图片处理失败')}]`)
                    break
                case 'done':
                    seg = new ImgSeg(
                        'base64://' +
                            info.dataurl!.substring(
                                info.dataurl!.indexOf('base64,') + 7,
                                info.dataurl!.length,
                            ),
                    )
                    break
            }
            this.sqCache[info.id] = seg
        }
        // 解析消息
        let back = this.parseMsgToSegs()
        const runtimeData = useRuntimeData()
        // 插入引用
        if (this.reply?.message_id) {
            const front: Seg[] = [new ReplySeg(this.reply.message_id)]
            if (
                runtimeData.sysConfig.reply_with_at === 'prefix' &&
                this.reply.sender?.user_id &&
				this.reply.sender?.user_id !== runtimeData.loginInfo!.uin
		)
                front.push(new AtSeg(this.reply.sender.user_id))
            back = [...front, ...back]
        }
        // 插入小尾巴
        if (runtimeData.sysConfig.msg_tail) {
            const tail = runtimeData.sysConfig.msg_tail.replaceAll('\\n', '\n')
            if (tail && tail != '') {
                for (let i = back.length - 1; i >= 0; i--) {
                    const seg = back[i]
                    if (seg instanceof TxtSeg) {
                        seg.text += tail
                        break
                    }
                }
            }
        }
        return back
    }

    clear(): void {
        this.content = ''
        this.sqCache.length = 0
        this.imgCache.clear()
        this.rmReply()
    }

    reeditFromMsg(msg: Msg): void {
        this.clear()
        this.focus()
        for (const seg of msg.message) {
            // TODO 支持图片
            if (seg instanceof ReplySeg) {
                const replyMsg = this.session.getMsgById(seg.id)
                if (replyMsg) this.setReply(replyMsg)
            } else if (seg instanceof TxtSeg) {
                this.content += seg.text
            } else {
                this.addSq(seg)
            }
        }
    }

    /**
     * 将自身输入框设置为焦点
     * @return 是否成功设置焦点
     */
    focus(): boolean {
        const inputDom = document.getElementById(
            'main-input',
        ) as HTMLTextAreaElement | null
        if (!inputDom) return false
        if (inputDom.dataset.sessionId !== String(this.session.id)) return false
        inputDom.focus()
        return true
    }

    private async processImgFile(img: File, hash: string): Promise<void> {
        const $t = app.config.globalProperties.$t
        // 图片太大
        if (img.size > 3145728) {
            const options = { maxSizeMB: 3, useWebWorker: true }
            try {
                popInfo.info($t('正在压缩图片 ……'))
                const compressedFile = await imageCompression(img, options)
                logger.info(
                    '图片压缩成功，原大小：' +
                        img.size / 1024 / 1024 +
                        ' MB，压缩后大小：' +
                        compressedFile.size / 1024 / 1024 +
                        ' MB',
                )
                img = compressedFile
            } catch (error) {
                const imgInfo = this.imgCache.get(hash)
                if (!imgInfo) return
                imgInfo.state = 'error'
                logger.error(error as Error, '图片压缩失败')
                popInfo.error($t('压缩图片失败'))
                return
            }
        }

        const dataurl = await imageCompression.getDataUrlFromFile(img)
        const imgInfo = this.imgCache.get(hash)
        if (!imgInfo) return
        imgInfo.state = 'done'
        imgInfo.dataurl = dataurl
    }

    /**
     * 输入文本内容
     */
    get content(): string {
        return this._content.value
    }
    /**
     * 输入文本内容
     */
    set content(val: string) {
        this._content.value = val
    }

    /**
     * 获取当前回复消息
     */
    get reply(): Msg | undefined {
        return this._reply.value
    }

    /**
     * 当前消息内的 SQCode 列表
     */
    get sqList(): string[] {
        return this._sqList.value
    }

    /**
     * 当前输入内容是否为空
     */
    get isVoid(): boolean {
        return this._isVoid.value
    }

    /**
     * 当前输入内容的行数
     */
    get lines(): number {
        return this.content.split('\n').length
    }

    /**
     * 解析输入消息成为消息段
     * @returns
     */
    private parseMsgToSegs(): Seg[] {
        const re: Seg[] = []

        let cacheTxt: string = ''

        for (let idx = 0; idx < this.content.length; ) {
            const chr = this.content.charAt(idx)

            // SQ码检测
            if (chr === '[' && this.content.substring(idx).startsWith('[SQ:')) {
                let sqId = ''
                let isSqCode = true
                let currentIdx = idx + 4
                // SQ码 id 解析
                while (currentIdx < this.content.length) {
                    const currentChr = this.content.charAt(currentIdx)
                    // 结束
                    if (currentChr === ']') break
                    // 非数字，非 SQ 码
                    if (currentChr < '0' || currentChr > '9') {
                        isSqCode = false
                        break
                    }
                    sqId += currentChr
                    currentIdx++
                }
                const segId = Number(sqId)
                const seg = this.sqCache.at(segId)
                if (!seg) isSqCode = false

                // 是 SQ 码，处理缓存文本
                if (isSqCode) {
                    // 处理缓存文本
                    if (cacheTxt.length > 0) {
                        re.push(new TxtSeg(cacheTxt))
                        cacheTxt = ''
                    }
                    // 添加 SQ 码消息段
                    re.push(seg!)
                    // 移动索引
                    idx = currentIdx + sqId.length
                    continue
                }
            }

            // 文本处理
            cacheTxt += chr
            idx++
        }

        if (cacheTxt.length > 0) {
            re.push(new TxtSeg(cacheTxt))
        }

        return re
    }
}
