import app from '@renderer/main'
import { toRaw } from 'vue'
import type {
    AtAllSegData,
    AtSegData,
    ErrorSegData,
    FaceSegData,
    FileSegData,
    ForwardSegData,
    ImgSegData,
    JsonSegData,
    MdSegData,
    MfaceSegData,
    PokeSegData,
    ReplySegData,
    SegData,
    TextSegData,
    UnknownSegData,
    VideoSegData,
    XmlSegData,
} from '../adapter/interface'
import { popInfo } from '../base'
import { downloadFile } from '../utils/appUtil'
import { getSizeFromBytes } from '../utils/systemUtil'
import Emoji from './emoji'
import { Img } from './img'
import { ForwardMsg, Msg } from './msg'
import { ProxyUrl } from './proxyUrl'
import { Resource } from './resource'
import { autoMarkRaw } from './utils'

export const segType = {}
type SegCon<T extends Seg> = { new (...args: any[]): T; type: string }
function registerSegType<T extends Seg>(segClass: SegCon<T>): void {
    segType[segClass.type] = segClass
}

export abstract class Seg {
    declare static readonly type: string
    declare static readonly inline: boolean

    abstract plaintext(msg?: Msg): string

    abstract serializeData(): SegData

    init?(): void | Promise<void>
    getImgData?(): { url: string; id: string } | undefined

    static parse(data: SegData): Seg {
        const type = data.type
        const SegClass = segType[type] || UnknownSeg
        return new SegClass(data)
    }

    get type(): string {
        return (this.constructor as typeof Seg).type
    }

    get inline(): boolean {
        return (this.constructor as typeof Seg).inline
    }

    toString(): string {
        return this.plaintext()
    }

    copy(): typeof this {
        return Seg.parse(this.serializeData()) as typeof this
    }
}

@registerSegType
@autoMarkRaw
export class TxtSeg extends Seg {
    static readonly type = 'text'
    static readonly inline = true
    text: string
    praseMsg: {type: 'txt' | 'link', content: string}[]
    links: string[]
    /** 允许的一级域名（TLD）白名单，未收录的后缀一律不视为链接 */
    private static readonly topLevelDomains = new Set(
        (
            // 通用顶级域名
            'com net org edu gov mil int info biz name pro mobi asia ' +
            'tel cat jobs travel museum aero coop post xxx ' +
            // 常用新顶级域名
            'io dev app xyz me tv cc co ai top site online shop store ' +
            'cloud tech link live vip club work art fun space website ' +
            'blog wiki email page one run zone plus today world life ' +
            'news chat design studio tools media group team systems ' +
            'agency company center city global ltd inc moe ' +
            // 国家和地区顶级域名（节选）
            'cn hk tw mo jp kr sg my th vn id ph in pk bd lk np mm kh la ' +
            'uk us ca au nz za mx ar br cl pe de fr it es pt nl be ch at ' +
            'se no fi dk ie is pl cz sk hu ro bg gr hr si rs ua by kz ru ' +
            'su tr il sa ae eg ma ng ke eu ' +
            // 内网与约定后缀
            'lan local test'
        ).split(/\s+/),
    )
    constructor(text: string)
    constructor(data: TextSegData)
    constructor(data: string | TextSegData) {
        super()
        if (typeof data === 'string') this.text = data
        else this.text = data.text
        const { text, links } = this.parseTextMsg(this.text)
        this.praseMsg = text
        this.links = links
    }

    /**
     * 解析文本中的链接，切分为文本与链接片段
     * @param text 原始文本
     */
    parseTextMsg(text: string): {
        text: { type: 'txt' | 'link', content: string }[]
        links: string[]
    } {
        const result: { type: 'txt' | 'link', content: string }[] = []
        const links: string[] = []
        // 支持带协议、裸域名、localhost:端口；路径遇到空白、引号、中文即停止
        const urlRegex =
            /(?:(?:[a-z][a-z0-9+.-]*:\/\/)?(?:localhost|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+)(?::\d{1,5})?)(?:[/?#][^\s<>"'`，。！？；：、（）【】《》「」『』“”‘’…—～·\u4e00-\u9fff]*)?/gi

        let lastIndex = 0
        let match: RegExpExecArray | null
        while ((match = urlRegex.exec(text)) !== null) {
            const url = this.trimUrlTail(match[0])
            // 一级域名不在白名单内则视为普通文本（如 bot.py）
            if (!url || !this.isValidHost(url)) continue
            const index = match.index

            if (index > lastIndex) {
                result.push({
                    type: 'txt',
                    content: text.substring(lastIndex, index),
                })
            }
            result.push({ type: 'link', content: url })
            links.push(url)
            lastIndex = index + url.length
        }

        if (lastIndex < text.length) {
            result.push({ type: 'txt', content: text.substring(lastIndex) })
        }

        return { text: result, links }
    }

    /**
     * 去除链接末尾被误识别的标点
     * @param url 原始匹配到的链接
     */
    private trimUrlTail(url: string): string {
        const tailPunctuation = '.,!?;:，。！？；：、\'"'
        const bracketPairs: [string, string][] = [
            ['(', ')'],
            ['[', ']'],
            ['{', '}'],
            ['（', '）'],
            ['【', '】'],
            ['《', '》'],
        ]

        let result = url
        while (result.length > 0) {
            const last = result.charAt(result.length - 1)
            if (tailPunctuation.includes(last)) {
                result = result.substring(0, result.length - 1)
                continue
            }

            // 仅当右括号多于左括号时才去除
            const pair = bracketPairs.find(([, right]) => right === last)
            if (pair) {
                const [left] = pair
                const leftCount = result.split(left).length - 1
                const rightCount = result.split(last).length - 1
                if (rightCount > leftCount) {
                    result = result.substring(0, result.length - 1)
                    continue
                }
            }
            break
        }
        return result
    }

    /**
     * 判断匹配结果是否为合法链接，按一级域名白名单校验
     * @param url 已裁剪的匹配结果
     */
    private isValidHost(url: string): boolean {
        const host = url
            .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
            .split(/[/?#:]/)[0]
            .toLowerCase()
        if (!host) return false
        // 本地主机与 IPv4 地址直接放行
        if (host === 'localhost') return true
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return true

        const tld = host.split('.').pop()
        return !!tld && tld !== host && TxtSeg.topLevelDomains.has(tld)
    }

    plaintext(_?: Msg): string {
        return this.text
    }

    override serializeData(): TextSegData {
        return {
            type: 'text',
            text: this.text,
        }
    }
}

@registerSegType
@autoMarkRaw
export class MdSeg extends Seg {
    static readonly type = 'markdown'
    static readonly inline = true
    content: string
    constructor(data: MdSegData) {
        super()
        this.content = data.content
    }

    plaintext(_?: Msg): string {
        // TODO 消 # 一帮md符号
        return this.content
    }

    override serializeData(): MdSegData {
        return {
            type: 'md',
            content: this.content,
        }
    }
}

@registerSegType
@autoMarkRaw
export class ImgSeg extends Seg {
    static readonly type = 'image'
    static readonly inline = false
    _url: Resource
    summary: string
    isFace: boolean = false
    imgData: Img
    width?: number
    height?: number
    constructor(url: string, isFace?: boolean)
    constructor(data: ImgSegData)
    constructor(arg1: string | ImgSegData, arg2: boolean = false) {
        super()
        const { $t } = app.config.globalProperties
        if (typeof arg1 === 'string') {
            // constructor(url: string, isFace ?: boolean)
            const url = arg1
            const isFace = arg2 as boolean | undefined
            this._url = Resource.fromUrl(url)
            this.isFace = isFace || false
            this.summary = $t('[图片]')
        } else {
            // constructor(data: ImgSegData)
            const data = arg1
            this._url = data.url
            this.summary = data.summary ?? $t('[图片]')
            this.isFace = data.isFace
            this.width = data.width
            this.height = data.height
        }
        this.imgData = new Img(this._url)
    }

    plaintext(_?: Msg): string {
        const { $t } = app.config.globalProperties
        return this.summary ?? '[' + $t('图片') + ']'
    }

    setSize(width: number, height: number): void {
        if (this.width) throw new Error('图片宽度已设置，不能重复设置')
        this.width = width
        this.height = height
    }

    get url(): string {
        return this._url.url
    }

    get rawUrl(): string {
        return this._url.rawUrl
    }

    get src(): string {
        if (this.url.startsWith('base64:'))
            return 'data:image/png;base64,' + this.url.substring(9)
        return this.url
    }

    override serializeData(): ImgSegData {
        return {
            type: 'image',
            url: this._url,
            summary: this.summary,
            isFace: this.isFace,
            width: this.width,
            height: this.height,
        }
    }
}

@registerSegType
@autoMarkRaw
export class MfaceSeg extends Seg {
    static readonly type = 'mface'
    static readonly inline = false
    _url: ProxyUrl
    summary: string
    packageId: number
    id: string
    key: string
    imgData: Img

    constructor(data: MfaceSegData) {
        super()
        this._url = new ProxyUrl(data.url)
        this.summary = data.summary
        this.packageId = data.packageId
        this.id = data.id
        this.key = data.key
        this.imgData = new Img(data.url)
    }

    plaintext(_?: Msg): string {
        const { $t } = app.config.globalProperties
        return this.summary ?? '[' + $t('表情') + ']'
    }

    get url(): string {
        return this._url.url
    }

    get rawUrl(): string {
        return this._url.raw
    }

    get src(): string {
        return this.url
    }

    override serializeData(): MfaceSegData {
        return {
            type: 'mface',
            url: this._url.raw,
            summary: this.summary,
            packageId: this.packageId,
            id: this.id,
            key: this.key,
        }
    }
}

@registerSegType
@autoMarkRaw
export class FaceSeg extends Seg {
    static readonly type = 'face'
    static readonly inline = true
    text?: string
    id: number
    face?: Emoji
    constructor(id: number)
    constructor(data: FaceSegData)
    constructor(arg: number | FaceSegData) {
        super()
        if (typeof arg === 'number') {
            this.id = arg
        } else {
            this.text = arg.text
            this.id = arg.id
        }
        this.face = Emoji.get(this.id)
    }

    plaintext(_?: Msg): string {
        const { $t } = app.config.globalProperties
        if (this.text) return '[' + this.text + ']'
        else return '[' + $t('表情') + ']'
    }

    override serializeData(): FaceSegData {
        return {
            type: 'face',
            id: this.id,
            text: this.text,
        }
    }
}

@registerSegType
@autoMarkRaw
export class AtSeg extends Seg {
    static readonly type = 'at'
    static readonly inline = true
    user_id: number
    constructor(user_id: number)
    constructor(data: AtSegData)
    constructor(arg: AtSegData | number) {
        super()
        if (typeof arg === 'number') this.user_id = arg
        else this.user_id = Number(arg.user_id)
    }

    plaintext(msg?: Msg): string {
        if (!msg?.session) return `@${this.user_id}`

        const user = msg.session.getUserById(Number(this.user_id))
        if (user) return '@' + user.name
        return `@${this.user_id}`
    }

    override serializeData(): AtSegData {
        return {
            type: 'at',
            user_id: this.user_id,
        }
    }
}

@registerSegType
@autoMarkRaw
export class AtAllSeg extends Seg {
    static readonly type = 'atall'
    static readonly inline = true
    constructor()
    constructor(_: AtAllSegData)
    constructor(_?: AtAllSegData) {
        super()
    }

    plaintext(_?: Msg): string {
        const { $t } = app.config.globalProperties
        return '@' + $t('所有人')
    }

    override serializeData(): AtAllSegData {
        return {
            type: 'atall',
        }
    }
}

@registerSegType
@autoMarkRaw
export class FileSeg extends Seg {
    static readonly type = 'file'
    static readonly inline = false
    name: string
    file_id?: string
    _url: ProxyUrl
    size: number
    ext: string
    download_percent?: number
    static readonly viewerSupport = [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'bmp',
        'webp',
        'mp4',
        'avi',
        'mkv',
        'flv',
        'txt',
        'md',
    ]
    constructor(file: string, name: string, size: number)
    constructor(data: FileSegData)
    constructor(arg1: string | FileSegData, arg2?: string, arg3?: number) {
        super()
        if (typeof arg1 === 'string') {
            const file = arg1
            const name = arg2 as string
            const size = arg3 as number
            this._url = new ProxyUrl(file)
            this.name = name
            this.ext = name.split('.').pop() || 'unknown'
            this.size = size
        } else {
            const data = arg1
            if (!data.file_id) throw new Error('文件ID缺失')
            this.file_id = data.file_id
            this.name = data.name
            this.size = data.size
            this.ext = this.name.split('.').pop() || 'unknown'
            this._url = new ProxyUrl(data.url)
        }
    }

    get formatSize(): string {
        const { $t } = app.config.globalProperties

        if (!this.size) return $t('未知大小')
        return getSizeFromBytes(this.size)
    }

    plaintext(_?: Msg): string {
        const { $t } = app.config.globalProperties

        return this.name ?? '[' + $t('文件') + ']'
    }

    get url(): string {
        return this._url.url
    }

    get rawUrl(): string {
        return this._url.raw
    }

    get fileView(): { url: string; ext: string; txt?: string } | undefined {
        if (!this.url) return undefined
        if (!FileSeg.viewerSupport.includes(this.ext)) return undefined
        return {
            url: this.url,
            ext: this.ext,
        }
    }

    download(): void {
        const { $t } = app.config.globalProperties
        if (this.url === '') {
            popInfo.info($t('url加载失败，无法下载'))
            return
        }
        if (this.download_percent !== undefined) {
            popInfo.info($t('别催了，已经在下了(>_<)'))
            return
        }
        this.download_percent = 0
        // 传原始链接，由 downloadFile 统一走代理，避免对已代理的链接二次包装
        downloadFile(
            this._url,
            this.name,
            (event: ProgressEvent) => {
                if (!event.lengthComputable) return
                const percent = Math.floor((event.loaded / event.total) * 100)
                this.download_percent = percent
            },
            () => {
                this.download_percent = undefined
            },
        )
    }

    override serializeData(): FileSegData {
        if (!this.file_id) throw new Error('文件ID缺失')
        return {
            type: 'file',
            name: this.name,
            size: this.size,
            url: this.url,
            file_id: this.file_id,
        }
    }
}

@registerSegType
@autoMarkRaw
export class VideoSeg extends Seg {
    static readonly type = 'video'
    static readonly inline = false
    file: string
    _url: Resource
    constructor(data: VideoSegData) {
        super()
        this.file = data.file
        this._url = data.url
    }
    plaintext(_?: Msg): string {
        const { $t } = app.config.globalProperties
        return '[' + $t('视频') + ']'
    }
    get url(): string {
        return this._url.url
    }
    get rawUrl(): string {
        return this._url.rawUrl
    }

    override serializeData(): VideoSegData {
        return {
            type: 'video',
            file: this.file,
            url: this._url,
        }
    }
}

@registerSegType
@autoMarkRaw
export class ForwardSeg extends Seg {
    static readonly type = 'forward'
    static readonly inline = false
    id?: string
    content: Msg[]
    constructor(msgs?: Msg[])
    constructor(data: ForwardSegData)
    constructor(arg1?: Msg[] | ForwardSegData) {
        if (Array.isArray(arg1)) {
            const msgs = arg1
            super()
            this.content = msgs
        } else {
            super()
            const data = arg1 as ForwardSegData
            this.id = data.id
            this.content = data.content.map((item) => new ForwardMsg(item))
            // 图片拼装
            let tail: undefined | Img
            for (const msg of this.content) {
                if (msg.imgList.length === 0) continue
                const imgList = toRaw(msg.imgList)
                if (tail) {
                    tail.concatNext(imgList.at(-1)!)
                }
                tail = imgList.at(0)
            }
        }
    }

    plaintext(_?: Msg): string {
        const { $t } = app.config.globalProperties
        return '[' + $t('合并转发') + ']'
    }

    get sending(): boolean {
        return this.id === undefined
    }

    override serializeData(): ForwardSegData {
        if (!this.id) throw new Error('转发消息ID缺失')
        return {
            type: 'forward',
            id: this.id,
            content: this.content.map((item) =>
                (item as ForwardMsg).serializeNodeData(),
            ),
        }
    }
}

@registerSegType
@autoMarkRaw
export class ReplySeg extends Seg {
    static readonly type = 'reply'
    static readonly inline = false
    id: string
    msg?: Msg
    constructor(msgId: string)
    constructor(data: ReplySegData)
    constructor(data: ReplySegData | string) {
        super()
        if (typeof data === 'string') this.id = data
        else this.id = data.id
    }

    plaintext(_?: Msg): string {
        return ''
    }

    override serializeData(): ReplySegData {
        if (!this.id) throw new Error('回复消息ID缺失')
        return {
            type: 'reply',
            id: this.id,
        }
    }
}

@registerSegType
@autoMarkRaw
export class PokeSeg extends Seg {
    static readonly type = 'poke'
    static readonly inline = false
    constructor(_: PokeSegData) {
        super()
    }
    plaintext(_?: Msg): string {
        return '戳了戳你'
    }

    override serializeData(): PokeSegData {
        return {
            type: 'poke',
        }
    }
}

@registerSegType
@autoMarkRaw
export class XmlSeg extends Seg {
    static readonly type = 'xml'
    static readonly inline = false
    readonly data: string
    readonly id: string
    constructor(data: XmlSegData) {
        super()
        this.data = data.data
        this.id = data.id
    }

    plaintext(_?: Msg): string {
        let name = this.data.substring(this.data.indexOf('<source name="') + 14)
        name = name.substring(0, name.indexOf('"'))
        return '[' + name + ']'
    }

    override serializeData(): XmlSegData {
        return {
            type: 'xml',
            data: this.data,
            id: this.id,
        }
    }
}

@registerSegType
@autoMarkRaw
export class JsonSeg extends Seg {
    static readonly type = 'json'
    static readonly inline = false
    readonly data: string
    readonly id: string
    constructor(data: JsonSegData) {
        super()
        this.data = data.data
        this.id = data.id
    }

    plaintext(_?: Msg): string {
        try {
            return JSON.parse(this.data).prompt
        } catch {
            const { $t } = app.config.globalProperties
            return '[' + $t('卡片消息') + ']'
        }
    }

    override serializeData(): JsonSegData {
        return {
            type: 'json',
            data: this.data,
            id: this.id,
        }
    }
}

@registerSegType
@autoMarkRaw
export class ErrorSeg extends Seg {
    static readonly type = 'error'
    static readonly inline = false

    plaintext(_?: Msg): string {
        const { $t } = app.config.globalProperties
        return $t('加载失败')
    }

    override serializeData(): ErrorSegData {
        return {
            type: 'error',
        }
    }
}

@autoMarkRaw
export class UnknownSeg extends Seg {
    static readonly type = 'unknown'
    static readonly inline = false
    private readonly _type: string
    data: object
    constructor(data: UnknownSegData) {
        super()
        this._type = data.segType
        this.data = data.data
    }

    get type(): string {
        return this._type
    }

    plaintext(_?: Msg): string {
        return `[不支持的消息类型: ${this._type}]`
    }

    override serializeData(): UnknownSegData {
        return {
            type: 'unknown',
            segType: this._type,
            data: this.data,
        }
    }
}
