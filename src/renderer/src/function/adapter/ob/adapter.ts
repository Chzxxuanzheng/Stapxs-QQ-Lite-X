import { handleEvent } from '@renderer/function/event'
import { Msg } from '@renderer/function/model/msg'
import { Resource } from '@renderer/function/model/resource'
import {
    AtAllSeg,
    AtSeg,
    FaceSeg,
    ForwardSeg,
    ImgSeg,
    JsonSeg,
    PokeSeg,
    ReplySeg,
    Seg,
    TxtSeg,
    UnknownSeg,
    VideoSeg,
    XmlSeg,
} from '@renderer/function/model/seg'
import {
    GroupSession,
    Session,
    UserSession,
} from '@renderer/function/model/session'
import { Member } from '@renderer/function/model/user'
import { queueWait } from '@renderer/function/utils/baseUtil'
import { shallowReactive, shallowRef, ShallowRef } from 'vue'
import type {
    AdapterInterface,
    AtAllSegData,
    AtSegData,
    BanEventData,
    BanLiftEventData,
    EventData,
    FaceSegData,
    ForwardNodeData,
    ForwardSegData,
    FriendData,
    GroupData,
    ImgSegData,
    ImplInfo,
    JoinEventData,
    JsonSegData,
    LeaveEventData,
    MemberData,
    MsgData,
    MsgEventData,
    PokeEventData,
    PokeSegData,
    RecallEventData,
    ReplySegData,
    SegData,
    SenderData,
    SessionData,
    TextSegData,
    UnknownSegData,
    UserData,
    VideoSegData,
    XmlSegData,
} from '../interface'
import { LoginInfo } from '../interface'
import ObInfo from './ObInfo.vue'
import type {
    ObAnonymousSender,
    ObAtSeg,
    ObFaceSeg,
    ObForwardNodeSeg,
    ObForwardSeg,
    ObFriendRecallEvent,
    ObGetForwardMsg,
    ObGetFriendList,
    ObGetGroupList,
    ObGetGroupMemberList,
    ObGetLoginInfo,
    ObGetMsg,
    ObGetStrangerInfo,
    ObGetVersionInfo,
    ObGroupBanEvent,
    ObGroupDecreaseEvent,
    ObGroupIncreaseEvent,
    ObGroupRecallEvent,
    ObGroupSender,
    ObHeartEvent,
    ObImgSeg,
    ObJsonSeg,
    ObMessageEvent,
    ObMsg,
    ObNoticeEvent,
    ObPokeEvent,
    ObPokeSeg,
    ObPrivateSender,
    ObReplySeg,
    ObSeg,
    ObSendMsg,
    ObTextSeg,
    ObVideoSeg,
    ObXmlSeg,
} from './type'
import { $t, createSender, getGender, getRole, ObConnector } from './utils'
import { logger } from '@renderer/function/base'

// 定义 API 装饰器：在方法外层包裹 try/catch，失败时返回 undefined
export function api(
    _: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
) {
    const original = descriptor.value
    descriptor.value = async function (...args: any[]) {
        try {
            return await original.apply(this, args)
        } catch (err) {
            logger.error(err as Error, `[API ${propertyKey} 调用失败]:`)
            return undefined
        }
    }
}

export class OneBotAdapter implements AdapterInterface {
    name = 'OneBot'
    version = '0.0.1'
    protocol = 'ob'
    heartBeatInfo = shallowReactive({
        lastBeatTime: 0,
        interval: -1,
        expectInterval: -1,
    })
    botInfo: ShallowRef<ObGetVersionInfo | undefined> = shallowRef(undefined)
    protected url: string = ''
    protected ssl: boolean = false
    protected token?: string
    protected connector: ObConnector = new ObConnector(
        this.onmessage.bind(this),
    )

    constructor() {
        this.init()
    }
    protected init() {
        this.segParsers['text'] = this.textParser.bind(this)
        this.segParsers['image'] = this.imageParser.bind(this)
        this.segParsers['face'] = this.faceParser.bind(this)
        this.segParsers['at'] = this.atParser.bind(this)
        this.segParsers['video'] = this.videoParser.bind(this)
        this.segParsers['forward'] = this.forwardParser.bind(this)
        this.segParsers['reply'] = this.replyParser.bind(this)
        this.segParsers['poke'] = this.pokeParser.bind(this)
        this.segParsers['xml'] = this.xmlParser.bind(this)
        this.segParsers['json'] = this.jsonParser.bind(this)

        this.segSerializer['text'] = this.textSerializer.bind(this)
        this.segSerializer['image'] = this.imageSerializer.bind(this)
        this.segSerializer['face'] = this.faceSerializer.bind(this)
        this.segSerializer['at'] = this.atSerializer.bind(this)
        this.segSerializer['atall'] = this.atallSerializer.bind(this)
        this.segSerializer['video'] = this.videoSerializer.bind(this)
        this.segSerializer['forward'] = this.forwardSerializer.bind(this)
        this.segSerializer['reply'] = this.replySerializer.bind(this)
        this.segSerializer['poke'] = this.pokeSerializer.bind(this)
        this.segSerializer['xml'] = this.xmlSerializer.bind(this)
        this.segSerializer['json'] = this.jsonSerializer.bind(this)

        this.eventProcessers['message'] = this.messageEvent.bind(this)
        this.eventProcessers['meta_event'] = this.metaEvent.bind(this)
        this.eventProcessers['notice'] = this.noticeEvent.bind(this)

        this.noticeEventProcessers['group_increase'] =
            this.groupIncreaseEvent.bind(this)
        this.noticeEventProcessers['group_decrease'] =
            this.groupDecreaseEvent.bind(this)
        this.noticeEventProcessers['group_ban'] = this.groupBanEvent.bind(this)
        this.noticeEventProcessers['group_recall'] =
            this.groupRecallEvent.bind(this)
        this.noticeEventProcessers['friend_recall'] =
            this.friendRecallEvent.bind(this)
        this.noticeEventProcessers['poke'] = this.pokeEvent.bind(this)
    }

    async connect(url: string, ssl: boolean, token?: string): Promise<boolean> {
        // 连接逻辑
        this.url = url
        this.ssl = ssl
        this.token = token

        this.resetCache()
        return await this.connector.open(url, ssl, token)
    }

    async close(): Promise<true> {
        // 关闭连接
        await this.connector.close()
        return true
    }

    async redirect(): Promise<AdapterInterface | undefined> {
        const implInfo = await this.getImplInfo()
        if (!implInfo) return undefined

        const LagrangeOneBot = (await import('./LagrangeOneBot')).default
        const NapCatOneBot = (await import('./NapCapOneBot')).default
        const LLBTOneBot = (await import('./LLBotOneBot')).default
        if (LagrangeOneBot.match(implInfo))
            return new LagrangeOneBot(this.connector, this.botInfo.value)
        if (NapCatOneBot.match(implInfo))
            return new NapCatOneBot(this.connector, this.botInfo.value)
        if (LLBTOneBot.match(implInfo))
            return new LLBTOneBot(this.connector, this.botInfo.value)
        return undefined
    }

    async getAdapterInfo(): Promise<{ [key: string]: string } | undefined> {
        // 获取适配器信息
        const data: ObGetVersionInfo = await this.connector.send(
            'get_version_info',
            {},
        )
        return data.data
    }

    optInfo() {
        // 返回适配器信息页面的组件
        return ObInfo
    }

    //#region == API ===============================================
    //#region == 基础消息 ======================
    @api
    async getLoginInfo(): Promise<LoginInfo> {
        const data: ObGetLoginInfo = await this.connector.send(
            'get_login_info',
            {},
        )
        return {
            uin: data.data.user_id,
            nickname: data.data.nickname,
        }
    }

    @api
    async getImplInfo(): Promise<ImplInfo | undefined> {
        // 获取协议段信息
        const data: ObGetVersionInfo = await this.connector.send(
            'get_version_info',
            {},
        )
        // 更新 botInfo
        this.botInfo.value = data
        return {
            name: data.data.app_name,
            version: data.data.app_version,
        }
    }
    //#endregion

    //#region == 获取消息 ======================
    // 获取用户信息没这个里面的数据,这个保存下,到时候往这里面查资料
    protected friendListCache: FriendData[] | null = null
    @api
    async getFriendList(useCache: boolean = true): Promise<FriendData[]> {
        if (useCache && this.friendListCache) return this.friendListCache

        const friendData = new Map<number, FriendData>()
        // 加载好友列表
        const data: ObGetFriendList = await this.connector.send(
            'get_friend_list',
            {},
        )
        for (const item of data.data) {
            if (friendData.has(item.user_id)) continue
            friendData.set(item.user_id, {
                user_id: item.user_id,
                nickname: item.nickname,
                remark: item.remark === '' ? undefined : item.remark,
                class_id: 0, // 默认分类ID为0
                class_name: $t('好友'), // 默认分类名称
            })
        }

        this.friendListCache = Array.from(friendData.values())

        return this.friendListCache
    }

    @api
    async getGroupList(_: boolean = true): Promise<GroupData[]> {
        const groupData = new Map<number, GroupData>()
        // 加载群组列表
        const data: ObGetGroupList = await this.connector.send(
            'get_group_list',
            {},
        )
        for (const item of data.data) {
            if (groupData.has(item.group_id)) continue
            groupData.set(item.group_id, {
                group_id: item.group_id,
                group_name: item.group_name,
                member_count: item.member_count,
                max_member_count: item.max_member_count,
            })
        }

        return Array.from(groupData.values())
    }

    @api
    async getUserInfo(
        userId: number,
        useCache: boolean = true,
    ): Promise<UserData> {
        // 获取用户信息
        const data: ObGetStrangerInfo = await this.connector.send(
            'get_stranger_info',
            {
                user_id: userId,
                no_cache: !useCache,
            },
        )
        if (!this.friendListCache) await this.getFriendList()
        const baseInfo = this.friendListCache?.find((f) => f.user_id === userId)
        return {
            id: userId,
            remark: baseInfo?.remark,
            nickname: baseInfo?.nickname || data.data.nickname,
            qid: $t('不支持'),
            regTime: Date.now(),
            qqLevel: 0,
            age: data.data.age,
            sex: getGender(data.data.sex),
        }
    }

    @api
    async getMemberList(
        group: GroupSession,
        _: boolean,
    ): Promise<MemberData[]> {
        const data: ObGetGroupMemberList = await this.connector.send(
            'get_group_member_list',
            { group_id: group.id },
        )
        return data.data.map((item) => ({
            age: item.age,
            card: item.card,
            group_id: item.group_id,
            join_time: item.join_time,
            last_sent_time: item.last_sent_time,
            level: item.level,
            nickname: item.nickname,
            role: getRole(item.role),
            sex: getGender(item.sex),
            title: item.title,
            user_id: item.user_id,
            unfriendly: item.unfriendly,
        }))
    }
    //#endregion

    //#region == 群聊相关 ======================
    @api
    async setMemberCard(
        group: GroupSession,
        mem: Member,
        card: string,
    ): Promise<true> {
        await this.connector.send('set_group_card', {
            group_id: group.id,
            user_id: mem.user_id,
            card: card,
        })
        return true
    }
    @api
    async setMemberTitle(
        group: GroupSession,
        mem: Member,
        title: string,
    ): Promise<true> {
        await this.connector.send('set_group_special_title', {
            group_id: group.id,
            user_id: mem.user_id,
            special_title: title,
        })
        return true
    }
    @api
    async banMember(
        group: GroupSession,
        mem: Member,
        time: number,
    ): Promise<true> {
        await this.connector.send('set_group_ban', {
            group_id: group.id,
            user_id: mem.user_id,
            duration: time,
        })
        return true
    }
    @api
    async kickMember(group: GroupSession, mem: Member): Promise<true> {
        await this.connector.send('set_group_kick', {
            group_id: group.id,
            user_id: mem.user_id,
        })
        return true
    }
    //#region == 消息相关 ===========================
    @api
    async getForwardMsg(
        forwardId: string,
        msg?: ObMsg,
    ): Promise<ForwardNodeData[]> {
        const { data }: ObGetForwardMsg = await this.connector.send(
            'get_forward_msg',
            {
                id: forwardId,
            },
        )
        return await Promise.all(
            data.message.map((node) => this.nodeParser(node, msg)),
        )
    }
    @api
    async getMsg(_: Session, msgId: string): Promise<MsgData | undefined> {
        const data: ObGetMsg = await this.connector.send('get_msg', {
            message_id: msgId,
        })
        if (!data.data) return undefined

        // 解析消息
        const msgData = await this.parseMsg(data.data)
        return msgData
    }
    @api
    async sendMsg(msg: Msg): Promise<string> {
        const message = await this.serializeMsg(msg)
        let data: ObSendMsg
        if (msg.session instanceof UserSession) {
            data = await this.connector.send('send_private_msg', {
                user_id: msg.session.id,
                message: message,
            })
        } else if (msg.session instanceof GroupSession) {
            data = await this.connector.send('send_group_msg', {
                group_id: msg.session.id,
                message: message,
            })
        } else {
            throw new Error('OneBot 不支持发送临时会话消息')
        }
        if (!data.data.message_id)
            throw new Error('发送消息失败，返回值无message_id')

        return data.data.message_id.toString()
    }
    @api
    async recallMsg(msg: Msg): Promise<true> {
        await this.connector.send('delete_msg', {
            message_id: msg.message_id,
        })
        return true
    }
    //#endregion
    //#endregion
    //#endregion

    //#region == 消息相关 ===========================================
    async parseMsg(data: ObMsg): Promise<MsgData> {
        const message = await this.parseSeg(data.message, data)

        // 组装发送者信息
        let sender: SenderData
        if (data.message_type === 'group' && data.sub_type === 'anonymous') {
            const msgSender = data.sender as ObAnonymousSender
            sender = createSender(Number(msgSender.id), msgSender.id)
        } else {
            const msgSender = data.sender as ObPrivateSender | ObGroupSender
            sender = createSender(Number(msgSender.user_id), msgSender.nickname)
        }
        return {
            message_id: data.message_id.toString(),
            session: this.parseSession(data),
            sender: sender,
            time: data.time,
            message: message,
            isDelete: this.isDelete(data),
        }
    }
    parseSession(data: ObMessageEvent | ObMsg): SessionData {
        let session_info
        // 组装会话信息
        if (data.message_type === 'group') {
            session_info = {
                id: data.group_id,
                type: 'group',
            }
        } else if (
            data.message_type === 'private' &&
            data.sub_type === 'group'
        ) {
            session_info = {
                id: data.user_id,
                group_id: data.group_id,
                type: 'temp',
            }
        } else {
            session_info = {
                id: data.user_id,
                type: 'user',
            }
        }
        return session_info
    }
    async serializeMsg(msg: Msg): Promise<ObSeg<string, any>[]> {
        const data = await Promise.all(
            msg.message.map((seg) => this.serializeSeg(seg)),
        )
        return data
    }

    //#region == 反序列化 ===========================
    segParsers: Record<
        string,
        (data: ObSeg<any, any>, msg?: ObMsg) => Promise<SegData>
    > = {}
    async parseSeg(data: ObSeg<string, any>, msg?: ObMsg): Promise<SegData>
    async parseSeg(data: ObSeg<string, any>[], msg?: ObMsg): Promise<SegData[]>
    async parseSeg(
        data: ObSeg<string, any> | ObSeg<string, any>[],
        msg?: ObMsg,
    ): Promise<SegData | SegData[]> {
        if (Array.isArray(data)) {
            return await Promise.all(data.map((d) => this.parseSeg(d, msg)))
        } else {
            try {
                const parser = this.segParsers[data.type]
                if (parser) return await parser(data, msg)
                return this.unknownParser(data)
            } catch (err) {
                logger.error(
                    err as Error,
                    '消息段解析失败:' + JSON.stringify(data),
                )
                return { type: 'error' }
            }
        }
    }
    async textParser(data: ObTextSeg, _?: ObMsg): Promise<TextSegData> {
        return {
            type: 'text',
            text: data.data.text,
        }
    }
    async imageParser(data: ObImgSeg, _?: ObMsg): Promise<ImgSegData> {
        return {
            type: 'image',
            url: Resource.fromUrl(data.data.url),
            isFace: false,
        }
    }
    async faceParser(data: ObFaceSeg, _?: ObMsg): Promise<FaceSegData> {
        return {
            type: 'face',
            id: Number(data.data.id),
        }
    }
    async atParser(
        data: ObAtSeg,
        _?: ObMsg,
    ): Promise<AtSegData | AtAllSegData> {
        if (data.data.qq === 'all') {
            return {
                type: 'atall',
            }
        } else {
            return {
                type: 'at',
                user_id: Number(data.data.qq),
            }
        }
    }
    async videoParser(data: ObVideoSeg, _?: ObMsg): Promise<VideoSegData> {
        return {
            type: 'video',
            file: data.data.file,
            url: Resource.fromUrl(data.data.url),
        }
    }
    async forwardParser(
        data: ObForwardSeg,
        msg?: ObMsg,
    ): Promise<ForwardSegData> {
        const id: string = data.data.id
        const nodes = await this.getForwardMsg(id, msg)
        if (!nodes) throw new Error('获取合并转发消息失败')
        return {
            type: 'forward',
            id,
            content: nodes,
        }
    }
    async replyParser(data: ObReplySeg, _?: ObMsg): Promise<ReplySegData> {
        return {
            type: 'reply',
            id: data.data.id,
        }
    }
    async pokeParser(_data: ObPokeSeg, _?: ObMsg): Promise<PokeSegData> {
        return { type: 'poke' }
    }
    async xmlParser(data: ObXmlSeg, _?: ObMsg): Promise<XmlSegData> {
        return {
            type: 'xml',
            data: data.data.data,
            id: crypto.randomUUID(),
        }
    }
    async jsonParser(data: ObJsonSeg, _?: ObMsg): Promise<JsonSegData> {
        const jsonData = JSON.parse(data.data.data)
        return {
            type: 'json',
            data: data.data.data,
            id: jsonData['app'],
        }
    }

    unknownParser(data: ObSeg<string, any>, _?: ObMsg): UnknownSegData {
        return {
            type: 'unknown',
            segType: data.type,
            data: data,
        }
    }
    async nodeParser(
        data: ObForwardNodeSeg,
        msg?: ObMsg,
    ): Promise<ForwardNodeData> {
        return {
            sender: {
                nickname: data.data.nickname,
                face: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${data.data.user_id}`,
            },
            content: await this.parseSeg(data.data.content, msg),
        }
    }
    //#endregion

    //#region == 序列化 =============================
    segSerializer: Record<string, (data: any) => Promise<ObSeg<string, any>>> =
        {}
    async serializeSeg(seg: Seg): Promise<ObSeg<string, any>>
    async serializeSeg(seg: Seg[]): Promise<ObSeg<string, any>[]>
    async serializeSeg(
        seg: Seg | Seg[],
    ): Promise<ObSeg<string, any> | ObSeg<string, any>[]> {
        if (Array.isArray(seg)) {
            return Promise.all(seg.map((d) => this.serializeSeg(d)))
        } else {
            const serializer = this.segSerializer[seg.type]
            if (serializer) return await serializer(seg)
            return this.unmatchSerializer(seg)
        }
    }
    async textSerializer(seg: TxtSeg): Promise<ObTextSeg> {
        return {
            type: 'text',
            data: {
                text: seg.text,
            },
        }
    }
    async imageSerializer(seg: ImgSeg): Promise<ObImgSeg> {
        return {
            type: 'image',
            data: {
                url: seg.rawUrl,
                file: seg.rawUrl,
            },
        }
    }
    async faceSerializer(seg: FaceSeg): Promise<ObFaceSeg> {
        return {
            type: 'face',
            data: {
                id: seg.id.toString(),
            },
        }
    }
    async atSerializer(seg: AtSeg): Promise<ObAtSeg> {
        return {
            type: 'at',
            data: {
                qq: seg.user_id.toString(),
            },
        }
    }
    async atallSerializer(_: AtAllSeg): Promise<ObAtSeg> {
        return {
            type: 'at',
            data: {
                qq: 'all',
            },
        }
    }
    async videoSerializer(seg: VideoSeg): Promise<ObVideoSeg> {
        return {
            type: 'video',
            data: {
                file: seg.rawUrl,
                url: seg.rawUrl,
            },
        }
    }
    async forwardSerializer(seg: ForwardSeg): Promise<ObForwardSeg> {
        const id = seg.id
        if (!id) throw new Error('合并转发消息没id无法序列化为标准Ob消息')

        return {
            type: 'forward',
            data: {
                id: id,
            },
        }
    }
    async replySerializer(seg: ReplySeg): Promise<ObReplySeg> {
        return {
            type: 'reply',
            data: {
                id: seg.id,
            },
        }
    }
    async pokeSerializer(_seg: PokeSeg): Promise<ObPokeSeg> {
        return {
            type: 'poke',
            data: {
                type: '1',
                id: '-1',
            },
        }
    }
    async xmlSerializer(seg: XmlSeg): Promise<ObXmlSeg> {
        return {
            type: 'xml',
            data: {
                data: seg.data,
            },
        }
    }
    async jsonSerializer(seg: JsonSeg): Promise<ObJsonSeg> {
        return {
            type: 'json',
            data: {
                data: seg.data,
            },
        }
    }
    async unknownSerializer(seg: UnknownSeg): Promise<ObSeg<string, any>> {
        return seg.data as ObSeg<string, any>
    }
    async nodeSerializer(msg: Msg): Promise<ObForwardNodeSeg> {
        return {
            type: 'node',
            data: {
                nickname: msg.sender.name,
                user_id: msg.sender.user_id.toString(),
                content: await this.serializeSeg(msg.message),
            },
        }
    }
    unmatchSerializer(seg: Seg): ObSeg<string, any> {
        const data = {}
        for (const key in seg) {
            if (key === 'type') continue
            data[key] = seg[key]
        }
        return {
            type: seg.type,
            data: data,
        }
    }
    //#endregion
    //#endregion

    //#region == 事件相关 ===========================================
    eventProcessers: Record<
        string,
        (event: any) => Promise<EventData | undefined>
    > = {}
    async messageEvent(event: ObMessageEvent): Promise<MsgEventData> {
        const process = async (data: ObMessageEvent) => {
            if (data.sub_type === 'other')
                throw new Error('不支持 other 类型的消息')
            if (data.sub_type === 'notice')
                throw new Error('不支持 notice 类型的消息')

            const originMsg: ObMsg = {
                time: data.time,
                message_type: data.message_type,
                sub_type: data.sub_type,
                message_id: data.message_id,
                real_id: 0,
                sender: data.sender,
                message: data.message,
                user_id: data.user_id,
                group_id: data?.group_id,
            }

            const msgData = await this.parseMsg(originMsg)
            const out: MsgEventData = {
                type: 'msg',
                message: msgData,
                message_id: data.message_id.toString(),
                time: data.time,
                session: msgData.session,
            }
            return out
        }
        const sessionId =
            event.message_type === 'group' ? event.group_id : event.user_id
        return await queueWait(
            process(event),
            `${event.message_type}-${sessionId}`,
        )
    }
    async metaEvent(event: ObHeartEvent): Promise<undefined> {
        if (event.meta_event_type !== 'heartbeat') return

        if (this.heartBeatInfo.expectInterval === -1) {
            this.heartBeatInfo.expectInterval = event.interval / 1000
            this.heartBeatInfo.lastBeatTime = event.time
            return
        }

        this.heartBeatInfo.interval =
            event.time - this.heartBeatInfo.lastBeatTime
        this.heartBeatInfo.lastBeatTime = event.time
        this.heartBeatInfo.expectInterval = event.interval / 1000
    }
    noticeEventProcessers: Record<
        string,
        (event: any) => Promise<EventData | undefined>
    > = {}
    async noticeEvent(event: ObNoticeEvent): Promise<undefined | EventData> {
        const eventType =
            event.notice_type === 'notify' ? event.sub_type : event.notice_type
        const processor = this.noticeEventProcessers[eventType ?? '']
        if (!processor) return
        const sessionId = event.group_id || event.user_id
        const type = event.group_id ? 'group' : 'user'
        return await queueWait(processor(event), `${type}-${sessionId}`)
    }
    async groupIncreaseEvent(
        event: ObGroupIncreaseEvent,
    ): Promise<JoinEventData> {
        const user = event.user_id
        const eventOperator =
            event.operator_id === event.user_id ? undefined : event.operator_id
        const operator =
            event.sub_type === 'approve' ? eventOperator : undefined
        const inviter = event.sub_type === 'invite' ? eventOperator : undefined
        return {
            type: 'join',
            session: {
                id: event.group_id,
                type: 'group',
            },
            user: createSender(user),
            operator: operator ? createSender(operator) : undefined,
            inviter: inviter ? createSender(inviter) : undefined,
            time: event.time,
        }
    }
    async groupDecreaseEvent(
        event: ObGroupDecreaseEvent,
    ): Promise<LeaveEventData> {
        return {
            type: 'leave',
            session: {
                id: event.group_id,
                type: 'group',
            },
            user: createSender(event.user_id),
            operator: createSender(event.operator_id),
            time: event.time,
        }
    }
    async groupBanEvent(
        event: ObGroupBanEvent,
    ): Promise<BanEventData | BanLiftEventData> {
        if (event.sub_type === 'ban') {
            return {
                type: 'ban',
                session: {
                    id: event.group_id,
                    type: 'group',
                },
                user: createSender(event.user_id),
                operator: createSender(event.operator_id),
                time: event.time,
                duration: event.duration,
            }
        } else {
            return {
                type: 'banLift',
                session: {
                    id: event.group_id,
                    type: 'group',
                },
                user: createSender(event.user_id),
                operator: createSender(event.operator_id),
                time: event.time,
            }
        }
    }
    async groupRecallEvent(
        event: ObGroupRecallEvent,
    ): Promise<RecallEventData> {
        return {
            type: 'recall',
            session: {
                id: event.group_id,
                type: 'group',
            },
            user: createSender(event.user_id),
            operator: createSender(event.operator_id),
            time: event.time,
            recallId: event.message_id.toString(),
            suffix: '',
        }
    }
    async friendRecallEvent(
        event: ObFriendRecallEvent,
    ): Promise<RecallEventData> {
        return {
            type: 'recall',
            session: {
                id: event.user_id,
                type: 'user',
            },
            user: createSender(event.user_id),
            operator: createSender(event.user_id),
            time: event.time,
            recallId: event.message_id.toString(),
            suffix: '',
        }
    }
    async pokeEvent(event: ObPokeEvent): Promise<PokeEventData> {
        let session: SessionData
        if (event.group_id) {
            session = {
                id: event.group_id,
                type: 'group',
            }
        } else {
            session = {
                id: event.user_id,
                type: 'user',
            }
        }
        return {
            type: 'poke',
            session,
            sender: createSender(event.user_id),
            target: createSender(event.target_id),
            action: '戳了戳',
            suffix: '',
            ico: 'https://tianquan.gtimg.cn/nudgeaction/item/0/expression.jpg',
            time: event.time,
        }
    }
    //#endregion
    get selfInfo(): { [key: string]: string } {
        if (!this.botInfo.value) return {}
        return {
            协议端名称: this.botInfo.value.data.app_name,
            协议端版本: this.botInfo.value.data.app_version,
            'OneBot 版本': this.botInfo.value.data.protocol_version,
        }
    }
    protected onmessage(data: any) {
        return this.handleEvent(data)
    }

    /**
     * 事件处理
     * @param event 事件
     * @returns
     */
    protected handleEvent(event: any) {
        const eventProcessor = this.eventProcessers[event.post_type]
        if (!eventProcessor) return
        eventProcessor(event).then((data) => {
            if (!data) return
            handleEvent(data)
        })
    }

    private resetCache() {
        // 重置缓存
        this.friendListCache = null
    }

    protected isDelete(_: ObMsg): boolean {
        return false
    }
}

export default new OneBotAdapter()
