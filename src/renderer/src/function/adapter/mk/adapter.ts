import driver from '@renderer/function/driver'
import { GroupFile, GroupFileFolder } from '@renderer/function/model/file'
import { Msg } from '@renderer/function/model/msg'
import {
    GroupSession,
    Session,
    UserSession,
} from '@renderer/function/model/session'
import { Member } from '@renderer/function/model/user'
import {
    AdapterInterface,
    AtAllSegData,
    AtSegData,
    BanEventData,
    BanLiftEventData,
    EssenceData,
    EssenceSeg,
    EventData,
    FaceSegData,
    FilesData,
    FileSegData,
    ForwardNodeData,
    ForwardSegData,
    FriendData,
    GroupAnnouncementData,
    GroupData,
    ImgSegData,
    ImplInfo,
    JoinEventData,
    JsonSegData,
    LeaveEventData,
    LoginInfo,
    MemberData,
    MfaceSegData,
    MsgData,
    MsgEventData,
    PokeEventData,
    RecallEventData,
    ReplySegData,
    ResponseEventData,
    SegData,
    SenderData,
    SessionData,
    TextSegData,
    UnknownSegData,
    UserData,
    VideoSegData,
    XmlSegData,
} from '../interface'

import { handleEvent } from '@renderer/function/event'
import { Resource } from '@renderer/function/model/resource'
import {
    AtAllSeg,
    AtSeg,
    FaceSeg,
    ForwardSeg,
    ImgSeg,
    JsonSeg,
    MfaceSeg,
    ReplySeg,
    Seg,
    TxtSeg,
    UnknownSeg,
    VideoSeg,
    XmlSeg,
} from '@renderer/function/model/seg'
import { queueWait } from '@renderer/function/utils/baseUtil'
import * as MilkyTypeLib from '@saltify/milky-types'
import {
    Event,
    IncomingForwardedMessage,
    IncomingMessage,
    IncomingSegment,
    OutgoingForwardedMessage,
    OutgoingSegment,
} from '@saltify/milky-types'
import { Component } from 'vue'
import z from 'zod'
import * as ISeg from './incomeSeg'
import MkInfo from './MkInfo.vue'
import * as OSeg from './outgoingSeg'
import {
    $t,
    camelCaseToUnderline,
    checkMilkyVersion,
    createSender,
    fileToBase64,
    getGender,
    getProp,
    getRole,
    versionCompare,
} from './utils'
import { logger, popInfo } from '@renderer/function/base'

type MilkyType = typeof MilkyTypeLib

type ApiNames = keyof {
    [K in keyof MilkyType as K extends `${infer N}${'Input' | 'Output'}`
        ? N
        : never]: 1
}

type ApiInfos = {
    [K in ApiNames]: {
        name: K
        input: `${K}Input` extends keyof MilkyType
            ? z.input<MilkyType[`${K}Input`]>
            : Record<string, never>
        output: `${K}Output` extends keyof MilkyType
            ? z.output<MilkyType[`${K}Output`]>
            : Record<string, never>
    }
}

type ApiOutput<T extends ApiNames> = ApiInfos[T]['output']
type ApiInput<T extends ApiNames> = ApiInfos[T]['input']

type KeyOfEvents = keyof {
    [K in keyof MilkyType as K extends `${infer N}Event` ? N : never]: any
}

type MkEvent<T extends KeyOfEvents> = z.infer<MilkyType[`${T}Event`]>

interface MkOkResponse<T extends ApiNames> {
    status: 'ok'
    retcode: 0
    data: ApiOutput<T>
}

interface MkErrorResponse {
    status: 'failed'
    retcode: number
    message: string
}

type MkResponse<T extends ApiNames> = MkOkResponse<T> | MkErrorResponse

// 定义 API 装饰器：在方法外层包裹 try/catch，失败时返回 undefined
function api(_: any, propertyKey: string, descriptor: PropertyDescriptor) {
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

export class MilkyAdapter implements AdapterInterface {
    readonly name = 'Milky'
    readonly version = '0.0.1'
    readonly protocol = 'mk'

    constructor() {
        this.init()
    }

    protected init() {
        this.segParsers['text'] = this.textParser.bind(this)
        this.segParsers['image'] = this.imageParser.bind(this)
        this.segParsers['face'] = this.faceParser.bind(this)
        this.segParsers['market_face'] = this.marketFaceParser.bind(this)
        this.segParsers['mention'] = this.mentionParser.bind(this)
        this.segParsers['mention_all'] = this.mentionAllParser.bind(this)
        this.segParsers['video'] = this.videoParser.bind(this)
        this.segParsers['forward'] = this.forwardParser.bind(this)
        this.segParsers['reply'] = this.replyParser.bind(this)
        this.segParsers['file'] = this.fileParser.bind(this)
        // this.segParsers['poke'] = this.pokeParser.bind(this)
        this.segParsers['xml'] = this.xmlParser.bind(this)
        this.segParsers['light_app'] = this.lightAppParser.bind(this)

        this.segSerializer['text'] = this.textSerializer.bind(this)
        this.segSerializer['image'] = this.imageSerializer.bind(this)
        this.segSerializer['face'] = this.faceSerializer.bind(this)
        this.segSerializer['mface'] = this.mfaceSerializer.bind(this)
        this.segSerializer['at'] = this.atSerializer.bind(this)
        this.segSerializer['atall'] = this.atallSerializer.bind(this)
        this.segSerializer['video'] = this.videoSerializer.bind(this)
        this.segSerializer['forward'] = this.forwardSerializer.bind(this)
        this.segSerializer['reply'] = this.replySerializer.bind(this)
        // this.segSerializer['poke'] = this.pokeSerializer.bind(this)
        this.segSerializer['xml'] = this.xmlSerializer.bind(this)
        this.segSerializer['json'] = this.jsonSerializer.bind(this)

        this.eventProcessers['message_receive'] =
            this.messageReceiveEvent.bind(this)
        this.eventProcessers['group_member_increase'] =
            this.groupMemberIncreaseEvent.bind(this)
        this.eventProcessers['group_member_decrease'] =
            this.groupMemberDecreaseEvent.bind(this)
        this.eventProcessers['group_mute'] = this.groupBanEvent.bind(this)
        this.eventProcessers['message_recall'] = this.recallEvent.bind(this)
        this.eventProcessers['group_nudge'] = this.pokeEvent.bind(this)
        this.eventProcessers['group_message_reaction'] =
            this.groupMessageReaction.bind(this)
    }

    optInfo(): Component {
        return MkInfo
    }

    /**
     * 连接到协议段
     * @param url 协议层路径
     * @param ssl 是否使用 SSL
     * @param token 访问令牌
     * @returns 是否连接成功
     */
    async connect(url: string, ssl: boolean, token: string): Promise<boolean> {
        driver.reset(url, ssl, token, 'event')
        driver.onMessage(this.handleEvent.bind(this))
        const re = await driver.open()
        if (!re) return re

        const implInfo = await this.getImplInfoRaw()
        if (!implInfo) return false

        let version = checkMilkyVersion(implInfo.milky_version)
        if (!version) {
            version = '1.0'
            popInfo.error(
                $t('版本号{version}格式异常，某些功能可能无法使用', {
                    version: implInfo.milky_version,
                }),
            )
        }

        // 根据协议段版本禁用不支持的API
        if (versionCompare(version, '1.1') === -1) {
            this.getCustomFace = undefined as any
            this.setNickname = undefined as any
            this.setSign = undefined as any
            this.segParsers['market_face'] = this.v1MarketFaceParser.bind(this)
        }

        return re
    }
    async close(): Promise<true | undefined> {
        await driver.close()
        return true
    }
    /**
     * 重定向到其他适配器
     */
    async redirect?(): Promise<AdapterInterface | undefined>

    /**
     * 获取当前适配器信息
     */
    async getAdapterInfo(): Promise<{ [key: string]: string } | undefined> {
        return await this.getImplInfoRaw()
    }
    //#region == API ===============================================
    //#region  == 基础信息 =====================
    /**
     * 获取登陆基本信息
     * @return 返回登录信息(uin, 昵称)
     */
    @api
    async getLoginInfo(): Promise<LoginInfo | undefined> {
        const data = await this.callApi('GetLoginInfo', {})
        return {
            uin: data.uin,
            nickname: data.nickname,
        }
    }
    /**
     * 获取协议段信息
     */
    @api
    async getImplInfo(): Promise<ImplInfo> {
        const data = await this.getImplInfoRaw()
        return {
            name: data.impl_name,
            version: data.impl_version,
        }
    }
    @api
    async getImplInfoRaw(): Promise<ApiOutput<'GetImplInfo'>> {
        const data = await this.callApi('GetImplInfo', {})
        return data
    }
    //#endregion

    //#region == 获取信息 ======================
    /**
     * 获取好友列表
     * @param useCache 是否使用缓存
     */
    @api
    async getFriendList(
        useCache: boolean = true,
    ): Promise<FriendData[] | undefined> {
        const data = await this.callApi('GetFriendList', {
            no_cache: !useCache,
        })
        return data.friends.map((friend) => ({
            user_id: friend.user_id,
            nickname: friend.nickname,
            remark:
                friend.remark === friend.nickname ? undefined : friend.remark,
            class_id: friend.category?.category_id ?? 495,
            class_name: friend.category?.category_name ?? '未分组的好友',
        }))
    }
    /**
     * 获取群组列表
     * @param useCache 是否使用缓存
     */
    @api
    async getGroupList(
        useCache: boolean = true,
    ): Promise<GroupData[] | undefined> {
        const data = await this.callApi('GetGroupList', { no_cache: !useCache })
        return data.groups.map((group) => ({
            group_id: group.group_id,
            group_name: group.group_name,
            member_count: group.member_count,
            max_member_count: group.max_member_count,
        }))
    }
    /**
     * 获取用户信息
     * @param userId 用户id
     * @param useCache 是否使用缓存
     */
    @api
    async getUserInfo(
        userId: number,
        _?: boolean,
    ): Promise<UserData | undefined> {
        const data = await this.callApi('GetUserProfile', { user_id: userId })
        return {
            id: userId,
            remark: data.remark,
            nickname: data.nickname,
            longNick: data.bio,
            qid: data.qid,
            country: data.country,
            city: data.city,
            regTime: Date.now(),
            qqLevel: data.level ?? 0,
            age: data.age,
            sex: getGender(data.sex),
        }
    }
    /**
     * 获取群成员信息
     * @param group 群组会话
     * @param useCache 是否使用缓存
     */
    @api
    async getMemberList(
        group: GroupSession,
        useCache: boolean = true,
    ): Promise<MemberData[] | undefined> {
        const data = await this.callApi('GetGroupMemberList', {
            group_id: group.id,
            no_cache: !useCache,
        })
        return data.members.map((member) => ({
            age: 0,
            card: member.card === '' ? undefined : member.card,
            group_id: group.id,
            join_time: member.join_time,
            last_sent_time: member.last_sent_time,
            level: String(member.level),
            nickname: member.nickname,
            role: getRole(member.role),
            sex: getGender(member.sex),
            title: member.title,
            user_id: member.user_id,
            unfriendly: false,
            banTime: member.shut_up_end_time ?? undefined,
        }))
    }
    /**
     * 获取群公告信息
     * @param group
     */
    @api
    async getGroupAnnouncement(
        group: GroupSession,
    ): Promise<GroupAnnouncementData[]> {
        const data = await this.callApi('GetGroupAnnouncements', {
            group_id: group.id,
        })
        return data.announcements.map((item) => ({
            content: item.content ?? undefined,
            img: item.image_url ?? undefined,
            time: item.time,
            sender: item.user_id,
        }))
    }
    /**
     * 获取群精华消息
     * @param group
     * @todo TODO:加分页
     */
    @api
    async getGroupEssence(group: GroupSession): Promise<EssenceData[]> {
        const messages: ApiOutput<'GetGroupEssenceMessages'>['messages'] = []
        for (let id = 0; true; id++) {
            const data = await this.callApi('GetGroupEssenceMessages', {
                group_id: group.id,
                page_index: id,
                page_size: 50,
            })
            messages.push(...data.messages)
            if (data.is_end) break
        }

        const out: Promise<EssenceData>[] = []
        for (const item of messages) {
            out.push(
                (async () => ({
                    sender: createSender(item.sender_id, item.sender_name),
                    sender_time: item.message_time,
                    operator: createSender(
                        item.operator_id,
                        item.operator_name,
                    ),
                    operator_time: item.operation_time,
                    content: (await this.parseSeg(
                        item.segments,
                    )) as EssenceSeg[],
                }))(),
            )
        }

        return await Promise.all(out)
    }
    /**
     * 获取用户自定义表情
     * @param userId
     */
    @api
    async getCustomFace(): Promise<string[] | undefined> {
        const data = await this.callApi('GetCustomFaceUrlList', {})
        return data?.urls ?? undefined
    }
    /**
     * 获取资源url
     * @param id 资源id
     */
    @api
    async getResource(id: string): Promise<string | undefined> {
        const data = await this.callApi('GetResourceTempUrl', {
            resource_id: id,
        })
        return data.url
    }
    //#endregion

    //#region == 群聊相关 ======================
    /**
     * 设置群名称
     * @param group 群组
     * @param name 新名称
     */
    @api
    async setGroupName(group: GroupSession, name: string): Promise<true> {
        await this.callApi('SetGroupName', {
            group_id: group.id,
            new_group_name: name,
        })
        return true
    }
    /**
     * 为群成员设置新的群内名称
     * @param group 群组
     * @param mem 群成员
     * @param card 新名称
     */
    @api
    async setMemberCard(
        group: GroupSession,
        mem: Member,
        card: string,
    ): Promise<true> {
        await this.callApi('SetGroupMemberCard', {
            group_id: group.id,
            user_id: mem.user_id,
            card: card,
        })
        return true
    }
    /**
     * 为群成员设置头衔,头衔为''或者没有时表示清除头衔
     * @param group
     * @param mem
     * @param title
     */
    @api
    async setMemberTitle(
        group: GroupSession,
        mem: Member,
        title: string,
    ): Promise<true> {
        await this.callApi('SetGroupMemberSpecialTitle', {
            group_id: group.id,
            user_id: mem.user_id,
            special_title: title,
        })
        return true
    }
    /**
     * 群禁言
     * @param group 群组
     * @param mem 被禁言的成员
     * @param time 禁言时间
     */
    @api
    async banMember(
        group: GroupSession,
        mem: Member,
        time: number,
    ): Promise<true> {
        await this.callApi('SetGroupMemberMute', {
            group_id: group.id,
            user_id: mem.user_id,
            duration: time,
        })
        return true
    }
    /**
     * 踢出群成员
     * @param group 群组
     * @param mem 群成员
     */
    @api
    async kickMember(group: GroupSession, mem: Member): Promise<true> {
        await this.callApi('KickGroupMember', {
            group_id: group.id,
            user_id: mem.user_id,
            reject_add_request: false,
        })
        return true
    }
    /**
     * 退出群组
     * @param group 群组
     */
    @api
    async leaveGroup(group: GroupSession): Promise<true> {
        await this.callApi('QuitGroup', { group_id: group.id })
        return true
    }
    //#endregion

    //#region == 消息相关 ======================
    /**
     * 设置已读消息
     * @param session 目标会话
     * @param msg 目标消息
     */
    @api
    async setMsgReaded(session: Session, msg: Msg): Promise<true> {
        await this.callApi('MarkMessageAsRead', {
            message_scene: this.getScene(session.type),
            peer_id: session.id,
            message_seq: Number(msg.message_id),
        })

        return true
    }
    /**
     * 获取消息
     * @param session 会话
     * @param msgId 消息id
     */
    @api
    async getMsg(
        session: Session,
        msgId: string,
    ): Promise<MsgData | undefined> {
        const data = await this.callApi('GetMessage', {
            message_scene: this.getScene(session.type),
            peer_id: session.id,
            message_seq: Number(msgId),
        })
        return this.parseMsg(data.message)
    }
    /**
     * 获取消息历史
     * @param session 会话
     * @param count 获取消息数量
     * @param start 起始消息
     */
    @api
    async getHistoryMsg(
        session: Session,
        count: number,
        start?: Msg,
    ): Promise<MsgData[]> {
        let out: IncomingMessage[] = []
        let startId: number | undefined = start?.message_id
            ? Number(start.message_id)
            : undefined

		if (startId === 0) return []

        while (out.length < count) {
            // 拉消息
            const data = await this._getHistoryMsg(
                session,
                startId,
                count - out.length,
            )
            if (!data || data.messages.length === 0) break

            out = [...data.messages, ...out]

            // 保存头部消息
            startId = data.next_message_seq ?? data.messages.at(0)?.message_seq
            if (!startId) break
        }
        return await Promise.all(out.map((item) => this.parseMsg(item)))
    }
    /**
     * 发送消息
     * @param session 目标会话
     * @param msg 消息内容
     */
    @api
    async sendMsg(msg: Msg): Promise<string> {
        let data: ApiOutput<'SendGroupMessage' | 'SendPrivateMessage'>
        if (msg.session?.type === 'group') {
            data = await this.callApi('SendGroupMessage', {
                group_id: msg.session.id,
                message: await this.serializeMsg(msg),
            })
        } else if (msg.session?.type === 'user') {
            data = await this.callApi('SendPrivateMessage', {
                user_id: msg.session.id,
                message: await this.serializeMsg(msg),
            })
        } else {
            throw new Error('milky 不支持发送临时会话消息')
        }

        if (data.message_seq <= 0) throw new Error('发送消息失败')

        return data.message_seq.toString()
    }
    /**
     * 撤回消息
     * @param msg 要撤回的消息
     */
    @api
    async recallMsg(msg: Msg): Promise<true> {
        if (msg.session?.type === 'group') {
            await this.callApi('RecallGroupMessage', {
                group_id: msg.session.id,
                message_seq: Number(msg.message_id),
            })
        } else if (msg.session?.type === 'user') {
            await this.callApi('RecallPrivateMessage', {
                user_id: msg.session.id,
                message_seq: Number(msg.message_id),
            })
        } else {
            throw new Error('milky 不支持撤回临时会话消息')
        }
        return true
    }
    /**
     * 群聊发送戳一戳
     * @param session 当前会话
     * @param target 目标成员
     */
    @api
    async sendGroupPoke(session: GroupSession, target: Member): Promise<true> {
        await this.callApi('SendGroupNudge', {
            group_id: session.id,
            user_id: target.user_id,
        })
        return true
    }
    /**
     * 私聊发送戳一戳
     * @param session
     */
    @api
    async sendPrivatePoke(session: UserSession): Promise<true> {
        await this.callApi('SendFriendNudge', {
            user_id: session.id,
        })
        return true
    }
    /**
     * 设置消息表情响应
     * @param msg 要设置表情的消息
     * @param emojiId 表情ID
     * @param add 是否添加表情,如果为false则表示删除表情
     * @returns 返回是否成功
     */
    @api
    async setResponse(msg: Msg, emojiId: string, add?: boolean): Promise<true> {
        await this.callApi('SendGroupMessageReaction', {
            group_id: msg.session!.id,
            message_seq: Number(msg.message_id),
            reaction: emojiId,
            is_add: add,
        })

        return true
    }
    /**
     * 获取合并转发内容
     * @param id
     * @returns
     */
    @api
    async getForwardMsg(id: string): Promise<ForwardNodeData[] | undefined> {
        const data = await this.callApi('GetForwardedMessages', {
            forward_id: id,
        })
        return Promise.all(data.messages.map((node) => this.nodeParser(node)))
    }
    //#endregion

    //#region == 文件相关 ======================
    /**
     * 获取群文件根目录
     * @param group 群组会话
     */
    @api
    async getGroupFile(group: GroupSession): Promise<FilesData> {
        const data = await this.callApi('GetGroupFiles', { group_id: group.id })
        return this.parseFiles(data)
    }
    /**
     * 获取群文件夹内容
     * PS: 文件夹对象塞GroupSession不知道为啥会报循环错误,所以用的是groupId
     * @param groupId 群组id
     * @param folderId 文件夹id
     */
    @api
    async getGroupFolderFile(
        group: GroupSession,
        folderId: string,
    ): Promise<FilesData> {
        const data = await this.callApi('GetGroupFiles', {
            group_id: group.id,
            parent_folder_id: folderId,
        })
        return this.parseFiles(data)
    }
    /**
     * 获取文件下载连接
     * @param file 要下载的文件
     */
    @api
    async getGroupFileUrl(file: GroupFile): Promise<string> {
        const data = await this.callApi('GetGroupFileDownloadUrl', {
            group_id: file.group.id,
            file_id: file.id,
        })

        return data.download_url
    }
    /**
     * 发送文件到群里
     * @param group
     * @param file
     * @param fold
     */
    @api
    async sendGroupFile(
        group: GroupSession,
        file: File,
        fold?: GroupFileFolder,
    ): Promise<string | undefined> {
        const data = await this.callApi('UploadGroupFile', {
            group_id: group.id,
            parent_folder_id: fold?.id ?? '/',
            file_uri: `base64://${await fileToBase64(file)}`,
            file_name: file.name,
        })
        return data.file_id
    }
    /**
     * 发送文件到私聊
     * @param session
     * @param file
     */
    @api
    async sendPrivateFile(
        session: UserSession,
        file: File,
    ): Promise<string | undefined> {
        const data = await this.callApi('UploadPrivateFile', {
            user_id: session.id,
            file_uri: `base64://${await fileToBase64(file)}`,
            file_name: file.name,
        })
        return data.file_id
    }
    /**
     * 创建群文件夹
     * @param group
     * @param folderName
     */
    @api
    async createFileFolder(
        group: GroupSession,
        folderName: string,
    ): Promise<string | undefined> {
        const data = await this.callApi('CreateGroupFolder', {
            group_id: group.id,
            folder_name: folderName,
        })
        return data.folder_id
    }
    /**
     * 删除群文件
     * @param file
     */
    @api
    async deleteGroupFile(file: GroupFile): Promise<true | undefined> {
        await this.callApi('DeleteGroupFile', {
            group_id: file.group.id,
            file_id: file.id,
        })
        return true
    }
    /**
     * 删除群文件夹
     * @param folder
     */
    @api
    async deleteGroupFileFolder(
        folder: GroupFileFolder,
    ): Promise<true | undefined> {
        await this.callApi('DeleteGroupFolder', {
            group_id: folder.group.id,
            folder_id: folder.id,
        })
        return true
    }
    /**
     * 重命名群文件
     * @param file
     * @param newName
     */
    @api
    async renameGroupFile(
        file: GroupFile,
        newName: string,
    ): Promise<true | undefined> {
        await this.callApi('RenameGroupFile', {
            group_id: file.group.id,
            file_id: file.id,
            parent_folder_id: file.folder?.id ?? '/',
            new_file_name: newName,
        })

        return true
    }
    /**
     * 重命名群文件夹
     * @param folder
     * @param newName
     */
    @api
    async renameGroupFileFolder(
        folder: GroupFileFolder,
        newName: string,
    ): Promise<true | undefined> {
        await this.callApi('RenameGroupFolder', {
            group_id: folder.group.id,
            folder_id: folder.id,
            new_folder_name: newName,
        })

        return true
    }
    //#endregion
    //#region == 个人信息 ======================
    /**
     * 设置昵称
     * @param nickname 新昵称
     */
    @api
    async setNickname(nickname: string): Promise<true | undefined> {
        await this.callApi('SetNickname', { new_nickname: nickname })
        return true
    }
    /**
     * 设置个性签名
     * @param sign 新签名
     */
    @api
    async setSign(sign: string): Promise<true | undefined> {
        await this.callApi('SetBio', { new_bio: sign })
        return true
    }
    //#endregion
    //#endregion

    //#region == 消息相关 ===========================================
    /**
     * 解析消息
     * @param data 收到的消息
     * @returns 标准消息数据
     */
    async parseMsg(data: IncomingMessage): Promise<MsgData> {
        const message = await this.parseSeg(data.segments, data)

        // 组装发送者信息
        let sender: SenderData
        switch (data.message_scene) {
            case 'friend':
                sender = {
                    id: data.sender_id,
                    nickname: data.friend.nickname,
                    sex: getGender(data.friend.sex),
                }
                break
            case 'group':
                sender = {
                    id: data.sender_id,
                    nickname: data.group_member.nickname,
                    sex: getGender(data.group_member.sex),
                }
                break
            case 'temp':
                sender = createSender(data.sender_id)
                break
        }

        return {
            message_id: data.message_seq.toString(),
            session: this.parseSession(data),
            sender: sender,
            time: data.time,
            message: message,
            isDelete: this.isDelete(data),
        }
    }
    /**
     * 分析收到消息的会话
     * @param data 收到的消息
     * @returns 会话数据
     */
    parseSession(data: IncomingMessage): SessionData {
        // 组装会话信息
        switch (data.message_scene) {
            case 'friend':
                return {
                    id: data.peer_id,
                    type: 'user',
                }
            case 'group':
                return {
                    id: data.peer_id,
                    type: 'group',
                }
            case 'temp':
                return {
                    id: data.peer_id,
                    group_id: data.group?.group_id,
                    type: 'temp',
                }
        }
    }
    /**
     * 序列化消息
     * @param msg 消息
     * @returns 发送消息数据
     */
    async serializeMsg(msg: Msg): Promise<OutgoingSegment[]> {
        return await Promise.all(
            msg.message.map((seg) => this.serializeSeg(seg)),
        )
    }
    //#region == 反序列化 ===========================
    segParsers: Record<
        string,
        (data: any, msg?: IncomingMessage) => Promise<SegData>
    > = {}
    async parseSeg(
        data: IncomingSegment,
        msg?: IncomingMessage,
    ): Promise<SegData>
    async parseSeg(
        data: IncomingSegment[],
        msg?: IncomingMessage,
    ): Promise<SegData[]>
    async parseSeg(
        data: IncomingSegment | IncomingSegment[],
        msg?: IncomingMessage,
    ): Promise<SegData | SegData[]> {
        if (Array.isArray(data)) {
            return await Promise.all(data.map((d) => this.parseSeg(d, msg)))
        } else {
            try {
                const parser = this.segParsers[data.type]
                if (parser) return await parser(data, msg)
                return this.unknownParser(data, msg)
            } catch (err) {
                logger.error(
                    err as Error,
                    '消息段解析失败:' + JSON.stringify(data),
                )
                return { type: 'error' }
            }
        }
    }
    async textParser(
        data: ISeg.TextSeg,
        _?: IncomingMessage,
    ): Promise<TextSegData> {
        return {
            type: 'text',
            text: data.data.text,
        }
    }
    async imageParser(
        data: ISeg.ImageSeg,
        _?: IncomingMessage,
    ): Promise<ImgSegData> {
        return {
            type: 'image',
            url: Resource.fromUrl(data.data.temp_url, data.data.resource_id),
            isFace: data.data.sub_type === 'sticker',
            width: data.data.width,
            height: data.data.height,
        }
    }
    async marketFaceParser(
        data: ISeg.MarketFaceSeg,
        _?: IncomingMessage,
    ): Promise<MfaceSegData> {
        return {
            type: 'mface',
            url: data.data.url,
            summary: data.data.summary,
            packageId: data.data.emoji_package_id,
            id: data.data.emoji_id,
            key: data.data.key,
        }
    }
    async v1MarketFaceParser(
        data: ISeg.MarketFaceSeg,
        _?: IncomingMessage,
    ): Promise<MfaceSegData> {
        return {
            type: 'mface',
            url: data.data.url,
            summary: '[动画表情]',
            packageId: 0,
            id: '',
            key: '',
        }
    }
    async faceParser(
        data: ISeg.FaceSeg,
        _?: IncomingMessage,
    ): Promise<FaceSegData> {
        return {
            type: 'face',
            id: Number(data.data.face_id),
        }
    }
    async mentionParser(
        data: ISeg.MentionSeg,
        _?: IncomingMessage,
    ): Promise<AtSegData> {
        return {
            type: 'at',
            user_id: data.data.user_id,
        }
    }
    async mentionAllParser(
        _data: ISeg.MentionAllSeg,
        _?: IncomingMessage,
    ): Promise<AtAllSegData> {
        return {
            type: 'atall',
        }
    }
    async videoParser(
        data: ISeg.VideoSeg,
        _?: IncomingMessage,
    ): Promise<VideoSegData> {
        return {
            type: 'video',
            file: $t('[视频]'),
            url: Resource.fromUrl(data.data.temp_url, data.data.resource_id),
        }
    }
    async forwardParser(
        data: ISeg.ForwardSeg,
        _?: IncomingMessage,
    ): Promise<ForwardSegData> {
        const id: string = data.data.forward_id
        const nodes = await this.getForwardMsg(id)
        if (!nodes) throw new Error('获取合并转发消息失败')
        return {
            type: 'forward',
            id,
            content: nodes,
        }
    }
    async replyParser(
        data: ISeg.ReplySeg,
        _?: IncomingMessage,
    ): Promise<ReplySegData> {
        return {
            type: 'reply',
            id: data.data.message_seq.toString(),
        }
    }
    async fileParser(
        data: ISeg.FileSeg,
        msg?: IncomingMessage,
    ): Promise<FileSegData> {
        let url: string
        try {
            if (msg?.message_scene === 'group') {
                const re = await this.callApi('GetGroupFileDownloadUrl', {
                    group_id: msg.peer_id,
                    file_id: data.data.file_id,
                })
                url = re.download_url
            } else if (msg?.message_scene === 'friend') {
                const re = await this.callApi('GetPrivateFileDownloadUrl', {
                    user_id: msg.peer_id,
                    file_id: data.data.file_id,
                    file_hash: data.data.file_hash!,
                })
                url = re.download_url
            } else {
                url = ''
            }
        } catch {
            url = ''
        }
        return {
            type: 'file',
            name: data.data.file_name,
            size: data.data.file_size,
            url: url,
            file_id: data.data.file_id,
        }
    }
    // async pokeParser(_: ObPokeSeg): Promise<PokeSegData> {
    //     return { type: 'poke' }
    // }
    async xmlParser(
        data: ISeg.XmlSeg,
        _?: IncomingMessage,
    ): Promise<XmlSegData> {
        return {
            type: 'xml',
            data: data.data.xml_payload,
            id: data.data.service_id.toString(),
        }
    }
    async lightAppParser(
        data: ISeg.LightAppSeg,
        _?: IncomingMessage,
    ): Promise<JsonSegData | ForwardSegData> {
        if (data.data.app_name === 'com.tencent.multimsg') {
            const jsonData = JSON.parse(data.data.json_payload)
            const forwardId = jsonData['meta']['detail']['resid']
            if (!forwardId) throw new Error('获取合并转发消息ID失败')
            const nodes = await this.getForwardMsg(forwardId)
            if (!nodes) throw new Error('获取合并转发消息失败')
            return {
                type: 'forward',
                id: forwardId,
                content: nodes,
            }
        }

        return {
            type: 'json',
            data: data.data.json_payload,
            id: data.data.app_name,
        }
    }

    unknownParser(data: IncomingSegment, _?: IncomingMessage): UnknownSegData {
        return {
            type: 'unknown',
            segType: data.type,
            data: data,
        }
    }
    async nodeParser(
        data: IncomingForwardedMessage,
        _?: IncomingMessage,
    ): Promise<ForwardNodeData> {
        return {
            sender: {
                nickname: data.sender_name,
                face: data.avatar_url,
            },
            content: await this.parseSeg(data.segments),
        }
    }
    //#endregion

    //#region == 序列化 =============================
    segSerializer: Record<
        string,
        (data: any) => Promise<z.input<OutgoingSegment>>
    > = {}
    async serializeSeg(seg: Seg): Promise<OutgoingSegment>
    async serializeSeg(seg: Seg[]): Promise<OutgoingSegment[]>
    async serializeSeg(
        seg: Seg | Seg[],
    ): Promise<OutgoingSegment | OutgoingSegment[]> {
        if (Array.isArray(seg)) {
            return Promise.all(seg.map((d) => this.serializeSeg(d)))
        } else {
            const serializer = this.segSerializer[seg.type]
            if (serializer) return OutgoingSegment.parse(await serializer(seg))
            return this.unmatchSerializer(seg)
        }
    }
    async textSerializer(seg: TxtSeg): Promise<OSeg.TextSeg> {
        return {
            type: 'text',
            data: {
                text: seg.text,
            },
        }
    }
    async imageSerializer(seg: ImgSeg): Promise<OSeg.ImageSeg> {
        return {
            type: 'image',
            data: {
                uri: seg.rawUrl,
                sub_type: seg.isFace ? 'sticker' : 'normal',
            },
        }
    }
    async faceSerializer(seg: FaceSeg): Promise<OSeg.FaceSeg> {
        return {
            type: 'face',
            data: {
                face_id: seg.id.toString(),
            },
        }
    }
    async atSerializer(seg: AtSeg): Promise<OSeg.MentionSeg> {
        return {
            type: 'mention',
            data: {
                user_id: seg.user_id,
            },
        }
    }
    async atallSerializer(_: AtAllSeg): Promise<OSeg.MentionAllSeg> {
        return {
            type: 'mention_all',
            data: {},
        }
    }
    async videoSerializer(seg: VideoSeg): Promise<OSeg.VideoSeg> {
        return {
            type: 'video',
            data: {
                uri: seg.rawUrl,
            },
        }
    }
    async forwardSerializer(seg: ForwardSeg): Promise<OSeg.ForwardSeg> {
        const msgs = seg.content
        const messagesList = await Promise.all(
            msgs.map((msg) => this.serializeMsg(msg)),
        )
        const out: OSeg.ForwardSeg = {
            type: 'forward',
            data: {
                messages: [],
            },
        }
        for (let i = 0; i < messagesList.length; i++) {
            out.data.messages.push({
                user_id:
                    msgs[i].sender.user_id === 0
                        ? 1094950020
                        : msgs[i].sender.user_id,
                sender_name: msgs[i].sender.name,
                segments: messagesList[i],
            })
        }

        return out
    }
    async replySerializer(seg: ReplySeg): Promise<OSeg.ReplySeg> {
        return {
            type: 'reply',
            data: {
                message_seq: Number(seg.id),
            },
        }
    }
    async mfaceSerializer(data: MfaceSeg): Promise<OSeg.ImageSeg> {
        return {
            type: 'image',
            data: {
                uri: data.rawUrl,
                sub_type: 'sticker',
                summary: data.summary,
            },
        }
    }
    // async pokeSerializer(_: PokeSeg): Promise<ObPokeSeg> {
    //     return {
    //         type: 'poke',
    //         data: {
    //             type: '1',
    //             id: '-1',
    //         }
    //     }
    // }
    async xmlSerializer(_: XmlSeg): Promise<OSeg.XmlSeg> {
        throw new Error('不支持发送xml消息')
    }
    async jsonSerializer(_: JsonSeg): Promise<OSeg.LightAppSeg> {
        throw new Error('不支持发送json消息')
    }
    async unknownSerializer(seg: UnknownSeg): Promise<OutgoingSegment> {
        return seg.data as OutgoingSegment
    }

    async nodeSerializer(msg: Msg): Promise<OutgoingForwardedMessage> {
        return {
            sender_name: msg.sender.name,
            user_id: msg.sender.user_id,
            segments: await this.serializeSeg(msg.message),
        }
    }
    unmatchSerializer(seg: Seg): OutgoingSegment {
        const data = {}
        for (const key in seg) {
            if (key === 'type') continue
            data[key] = seg[key]
        }
        return {
            type: seg.type as any,
            data: data,
        }
    }

    /**
     * 序列化构造合并转发
     * @param seg
     * @returns
     */
    async customForwardSerializer(seg: ForwardSeg): Promise<OSeg.ForwardSeg[]> {
        const msgs = seg.content
        const messagesList = await Promise.all(
            msgs.map((msg) => this.serializeMsg(msg)),
        )
        const out: OSeg.ForwardSeg = {
            type: 'forward',
            data: {
                messages: [],
            },
        }
        for (let i = 0; i < messagesList.length; i++) {
            out.data.messages.push({
                user_id: msgs[i].sender.user_id,
                sender_name: msgs[i].sender.name,
                segments: messagesList[i],
            })
        }
        return [out]
    }
    //#endregion
    //#endregion

    //#region == 事件处理 ===========================================
    eventProcessers: Record<
        Event['event_type'],
        (event: Event, data: any) => Promise<EventData | undefined>
    > = {} as any
    async messageReceiveEvent(
        event: Event,
        data: IncomingMessage,
    ): Promise<MsgEventData> {
        const process = async (data: IncomingMessage) => {
            const msgData = await this.parseMsg(data)
            const out: MsgEventData = {
                type: 'msg',
                message: msgData,
                message_id: msgData.message_id!,
                session: msgData.session,
                time: event.time,
            }
            return out
        }
        return await queueWait(
            process(data),
            `${data.message_scene}-${data.peer_id}`,
        )
    }
    async groupMemberIncreaseEvent(
        event: Event,
        data: MkEvent<'GroupMemberIncrease'>,
    ): Promise<JoinEventData> {
        return {
            type: 'join',
            session: {
                id: data.group_id,
                type: 'group',
            },
            user: createSender(data.user_id),
            operator: data.operator_id
                ? createSender(data.operator_id)
                : undefined,
            inviter: data.invitor_id
                ? createSender(data.invitor_id)
                : undefined,
            time: event.time,
        }
    }
    async groupMemberDecreaseEvent(
        event: Event,
        data: MkEvent<'GroupMemberDecrease'>,
    ): Promise<LeaveEventData> {
        return {
            type: 'leave',
            session: {
                id: data.group_id,
                type: 'group',
            },
            user: createSender(data.user_id),
            operator: createSender(data.operator_id ?? data.user_id),
            time: event.time,
        }
    }
    async groupBanEvent(
        event: Event,
        data: MkEvent<'GroupMute'>,
    ): Promise<BanEventData | BanLiftEventData> {
        if (data.duration > 0) {
            return {
                type: 'ban',
                session: {
                    id: data.group_id,
                    type: 'group',
                },
                user: createSender(data.user_id),
                operator: createSender(data.operator_id),
                duration: data.duration,
                time: event.time,
            }
        } else {
            return {
                type: 'banLift',
                session: {
                    id: data.group_id,
                    type: 'group',
                },
                user: createSender(data.user_id),
                operator: createSender(data.operator_id),
                time: event.time,
            }
        }
    }
    async recallEvent(
        event: Event,
        data: MkEvent<'MessageRecall'>,
    ): Promise<RecallEventData> {
        return {
            type: 'recall',
            session: {
                id: data.peer_id,
                type: this.parseScene(data.message_scene),
            },
            user: createSender(data.sender_id),
            operator: createSender(data.operator_id),
            recallId: data.message_seq.toString(),
            time: event.time,
            suffix: data.display_suffix ?? '',
        }
    }
    async pokeEvent(
        event: Event,
        data: MkEvent<'GroupNudge'>,
    ): Promise<PokeEventData> {
        return {
            type: 'poke',
            session: {
                id: data.group_id,
                type: 'group',
            },
            sender: createSender(data.sender_id),
            target: createSender(data.receiver_id),
            action: data.display_action ?? '戳了戳',
            suffix: data.display_suffix ?? '',
            ico:
                data.display_action_img_url ??
                'https://tianquan.gtimg.cn/nudgeaction/item/0/expression.jpg',
            time: event.time,
        }
    }
    async groupMessageReaction(
        event: Event,
        data: MkEvent<'GroupMessageReaction'>,
    ): Promise<ResponseEventData> {
        return {
            type: 'response',
            session: {
                id: data.group_id,
                type: 'group',
            },
            operator: createSender(data.user_id),
            message_id: data.message_seq.toString(),
            emojiId: data.face_id,
            add: data.is_add,
            time: event.time,
        }
    }

    async handleEvent(json: string): Promise<void> {
        const data = Event.parse(JSON.parse(json))
        const processor = this.eventProcessers[data.event_type]
        if (!processor) return
        const eventData = await processor(data, data.data)
        if (!eventData) return
        handleEvent(eventData)
    }
    //#endregion

    //#region == 私有工具 ===========================================
    protected async callApi<T extends ApiNames>(
        apiName: T,
        args: ApiInput<T>,
    ): Promise<ApiOutput<T>> {
        const inputCheck = getProp(MilkyTypeLib, `${apiName}Input`) as
            | undefined
            | z.ZodTypeAny
        let sendArg = {}
        if (inputCheck) sendArg = inputCheck.parse(args) as Record<string, any>
        const api = camelCaseToUnderline(apiName)
        const json = await driver.post(`api/${api}`, sendArg)
        if (!json) throw new Error('未与协议段连接')
        const data = JSON.parse(json) as MkResponse<T>
        if (data.status === 'ok') {
            const outputCheck = getProp(MilkyTypeLib, `${apiName}Output`) as
                | undefined
                | z.ZodTypeAny
            if (outputCheck) {
                return outputCheck.parse(data.data) as ApiOutput<T>
            }
            return {}
        }

        throw new Error(
            `API调用失败: ${data.message} (retcode: ${data.retcode})`,
        )
    }

    @api
    protected async _getHistoryMsg(
        session: Session,
        startId: number | undefined,
        limit: number,
    ): Promise<ApiOutput<'GetHistoryMessages'>> {
        const data = await this.callApi('GetHistoryMessages', {
            message_scene: this.getScene(session.type),
            peer_id: session.id,
            start_message_seq: startId,
            limit: limit,
        })
        if (data.messages.at(-1)?.message_seq === startId) data.messages.pop() // 移除起始消息
        return data
    }
    protected getScene(
        type: 'user' | 'group' | 'temp',
    ): 'friend' | 'group' | 'temp' {
        switch (type) {
            case 'user':
                return 'friend'
            case 'group':
                return 'group'
            case 'temp':
                return 'temp'
        }
    }
    protected parseScene(
        type: 'group' | 'temp' | 'friend',
    ): 'user' | 'group' | 'temp' {
        switch (type) {
            case 'friend':
                return 'user'
            case 'group':
                return 'group'
            case 'temp':
                return 'temp'
        }
    }
    protected parseFiles(data: ApiOutput<'GetGroupFiles'>): FilesData {
        return {
            files: data.files.map((file) => ({
                file_id: file.file_id,
                file_name: file.file_name,
                size: file.file_size,
                download_times: file.downloaded_times,
                dead_time: file.expire_time ?? undefined,
                upload_time: file.uploaded_time,
                uploader_id: file.uploader_id,
            })),
            folders: data.folders.map((folder) => ({
                folder_id: folder.folder_id,
                folder_name: folder.folder_name,
                count: folder.file_count,
                create_time: folder.created_time,
                creator_id: folder.creator_id,
            })),
        }
    }
    protected isDelete(msg: IncomingMessage): boolean {
        return msg.sender_id === 0
    }
    //#endregion
}

export default new MilkyAdapter()
