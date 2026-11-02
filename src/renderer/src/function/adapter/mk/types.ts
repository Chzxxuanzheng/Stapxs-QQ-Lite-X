/**
 * Milky 协议类型定义（对齐 Milky 1.3.0）
 *
 * 数据来源：官方文档 http://milky.ntqqrev.org
 *   - struct/Event、struct/IncomingSegment、struct/OutgoingSegment
 *   - struct/IncomingMessage、struct/IncomingForwardedMessage、struct/OutgoingForwardedMessage
 *   - struct/FriendEntity、struct/FriendCategoryEntity、struct/GroupEntity
 *   - struct/GroupMemberEntity、struct/GroupAnnouncementEntity、struct/GroupFileEntity
 *   - struct/GroupFolderEntity、struct/FriendRequest、struct/GroupNotification
 *   - struct/GroupEssenceMessage
 *   - api/system、api/message、api/friend、api/group、api/file
 *
 * 设计约定（与官方 @saltify/milky-types 的写法标准保持一致）：
 *   1. 本文件以 **zod schema 为唯一真相源**，TS 类型由 `z.infer` / `z.input` 推导，
 *      不再手写重复的 interface，避免“类型与校验规则漂移”。
 *   2. 适配器 **不直接依赖 zod**，也不做任何 `z.input<>` / `z.output<>` 解包；
 *      所有解析入口收敛为本文件底部导出的 `parseXxx()` 函数。
 *   3. 字段可选性严格按官方文档：
 *      - 文档字段名后带 `?` 的 → `.optional()`；
 *      - 文档未带 `?` 的 → 必填；
 *      - 文档标注“默认值：xxx”的 → `.default(xxx)`（入参可省略、出参必有值）。
 *   4. 属性发生过变动的模型，除当前形态外额外提供 `XxxV1` 旧版本模型
 *      （1.0.x 形态），仅用于低版本协议端数据的类型收窄，不参与校验。
 *      递归结构（消息段 / 消息 / 事件包络）的类型先行声明，
 *      对应 schema 使用 `z.ZodType<T>` 反向约束，保证 schema 与类型不脱节。
 */

import { z } from 'zod'

// #region == 基础类型 ===========================================

/** 消息场景（会话类型） */
export const MilkyMessageSceneSchema = z.enum(['friend', 'group', 'temp'])
export type MilkyMessageScene = z.infer<typeof MilkyMessageSceneSchema>

/** 用户性别 */
export const MilkySexSchema = z.enum(['male', 'female', 'unknown'])
export type MilkySex = z.infer<typeof MilkySexSchema>

/** 群成员角色 */
export const MilkyGroupRoleSchema = z.enum(['owner', 'admin', 'member'])
export type MilkyGroupRole = z.infer<typeof MilkyGroupRoleSchema>

/** 图片消息段子类型 */
export const MilkyImageSubTypeSchema = z.enum(['normal', 'sticker'])
export type MilkyImageSubType = z.infer<typeof MilkyImageSubTypeSchema>

/** 表情回应类型（v1.2 起） */
export const MilkyReactionTypeSchema = z.enum(['face', 'emoji'])
export type MilkyReactionType = z.infer<typeof MilkyReactionTypeSchema>

/** 协议端使用的 QQ 协议平台 */
export const MilkyProtocolTypeSchema = z.enum([
    'windows',
    'linux',
    'macos',
    'android_pad',
    'android_phone',
    'ipad',
    'iphone',
    'harmony',
    'watch',
])
export type MilkyProtocolType = z.infer<typeof MilkyProtocolTypeSchema>

/** 请求状态 */
export const MilkyRequestStateSchema = z.enum([
    'pending',
    'accepted',
    'rejected',
    'ignored',
])
export type MilkyRequestState = z.infer<typeof MilkyRequestStateSchema>

/** 群请求通知类型 */
export const MilkyGroupRequestTypeSchema = z.enum([
    'join_request',
    'invited_join_request',
])
export type MilkyGroupRequestType = z.infer<typeof MilkyGroupRequestTypeSchema>

/** 无字段结构体的 data 形态 */
export const MilkyEmptySchema = z.object({})
export type MilkyEmptyData = z.infer<typeof MilkyEmptySchema>

// #endregion

// #region == 实体类型 ===========================================

/** 好友分组实体 */
export const FriendCategoryEntitySchema = z.object({
    category_id: z.number().int(),
    category_name: z.string(),
})
export type FriendCategoryEntity = z.infer<typeof FriendCategoryEntitySchema>

/** 好友实体 */
export const FriendEntitySchema = z.object({
    user_id: z.number().int(),
    nickname: z.string(),
    sex: MilkySexSchema,
    qid: z.string(),
    remark: z.string(),
    category: FriendCategoryEntitySchema,
})
export type FriendEntity = z.infer<typeof FriendEntitySchema>

/** 群实体（1.3.0 当前形态，v1.2 起新增 remark / created_time / description / question / announcement） */
export const GroupEntitySchema = z.object({
    group_id: z.number().int(),
    group_name: z.string(),
    member_count: z.number().int(),
    max_member_count: z.number().int(),
    /** v1.2 新增：群备注 */
    remark: z.string(),
    /** v1.2 新增：群创建时间，Unix 时间戳（秒） */
    created_time: z.number().int(),
    /** v1.2 新增：群简介 */
    description: z.string(),
    /** v1.2 新增：加群验证问题 */
    question: z.string(),
    /** v1.2 新增：群公告预览 */
    announcement: z.string(),
})
export type GroupEntity = z.infer<typeof GroupEntitySchema>

/** 群实体（1.0.x–1.1.x 旧形态，不含 v1.2 新增的 5 个字段） */
export interface GroupEntityV1 {
    group_id: number
    group_name: string
    member_count: number
    max_member_count: number
}

/** 群成员实体 */
export const GroupMemberEntitySchema = z.object({
    user_id: z.number().int(),
    nickname: z.string(),
    sex: MilkySexSchema,
    group_id: z.number().int(),
    card: z.string(),
    title: z.string(),
    level: z.number().int(),
    role: MilkyGroupRoleSchema,
    join_time: z.number().int(),
    last_sent_time: z.number().int(),
    /** 禁言结束时间，Unix 时间戳（秒） */
    shut_up_end_time: z.number().int().nullable().optional(),
})
export type GroupMemberEntity = z.infer<typeof GroupMemberEntitySchema>

/** 群公告实体 */
export const GroupAnnouncementEntitySchema = z.object({
    group_id: z.number().int(),
    announcement_id: z.string(),
    user_id: z.number().int(),
    time: z.number().int(),
    content: z.string(),
    image_url: z.string().optional(),
})
export type GroupAnnouncementEntity = z.infer<
    typeof GroupAnnouncementEntitySchema
>

/** 群文件实体 */
export const GroupFileEntitySchema = z.object({
    group_id: z.number().int(),
    file_id: z.string(),
    file_name: z.string(),
    parent_folder_id: z.string(),
    file_size: z.number().int(),
    uploaded_time: z.number().int(),
    /** v1.3 新增：过期时间，Unix 时间戳（秒） */
    expire_time: z.number().int().nullable().optional(),
    uploader_id: z.number().int(),
    downloaded_times: z.number().int(),
})
export type GroupFileEntity = z.infer<typeof GroupFileEntitySchema>

/** 群文件夹实体 */
export const GroupFolderEntitySchema = z.object({
    group_id: z.number().int(),
    folder_id: z.string(),
    parent_folder_id: z.string(),
    folder_name: z.string(),
    created_time: z.number().int(),
    last_modified_time: z.number().int(),
    creator_id: z.number().int(),
    file_count: z.number().int(),
})
export type GroupFolderEntity = z.infer<typeof GroupFolderEntitySchema>

/** 好友请求实体 */
export const FriendRequestSchema = z.object({
    time: z.number().int(),
    initiator_id: z.number().int(),
    initiator_uid: z.string(),
    target_user_id: z.number().int(),
    target_user_uid: z.string(),
    state: MilkyRequestStateSchema,
    comment: z.string(),
    via: z.string(),
    is_filtered: z.boolean(),
})
export type FriendRequest = z.infer<typeof FriendRequestSchema>

/** 群通知实体：用户入群请求 */
export const GroupNotificationJoinRequestSchema = z.object({
    type: z.literal('join_request'),
    group_id: z.number().int(),
    notification_seq: z.number().int(),
    is_filtered: z.boolean(),
    initiator_id: z.number().int(),
    state: MilkyRequestStateSchema,
    operator_id: z.number().int().optional(),
    comment: z.string(),
})

/** 群通知实体：群管理员变更通知 */
export const GroupNotificationAdminChangeSchema = z.object({
    type: z.literal('admin_change'),
    group_id: z.number().int(),
    notification_seq: z.number().int(),
    target_user_id: z.number().int(),
    is_set: z.boolean(),
    operator_id: z.number().int(),
})

/** 群通知实体：群成员被移除通知 */
export const GroupNotificationKickSchema = z.object({
    type: z.literal('kick'),
    group_id: z.number().int(),
    notification_seq: z.number().int(),
    target_user_id: z.number().int(),
    operator_id: z.number().int(),
})

/** 群通知实体：群成员退群通知 */
export const GroupNotificationQuitSchema = z.object({
    type: z.literal('quit'),
    group_id: z.number().int(),
    notification_seq: z.number().int(),
    target_user_id: z.number().int(),
})

/** 群通知实体：群成员邀请他人入群请求 */
export const GroupNotificationInvitedJoinRequestSchema = z.object({
    type: z.literal('invited_join_request'),
    group_id: z.number().int(),
    notification_seq: z.number().int(),
    initiator_id: z.number().int(),
    target_user_id: z.number().int(),
    state: MilkyRequestStateSchema,
    operator_id: z.number().int().optional(),
})

/** 群通知实体 */
export const GroupNotificationSchema = z.discriminatedUnion('type', [
    GroupNotificationJoinRequestSchema,
    GroupNotificationAdminChangeSchema,
    GroupNotificationKickSchema,
    GroupNotificationQuitSchema,
    GroupNotificationInvitedJoinRequestSchema,
])
export type GroupNotification = z.infer<typeof GroupNotificationSchema>

// #endregion

// #region == 入站消息段 =========================================

/** 文本消息段 */
export const IncomingTextSegSchema = z.object({
    type: z.literal('text'),
    data: z.object({
        text: z.string(),
    }),
})
export type IncomingTextSeg = z.infer<typeof IncomingTextSegSchema>

/** 提及消息段（v1.2 起新增 name） */
export const IncomingMentionSegSchema = z.object({
    type: z.literal('mention'),
    data: z.object({
        user_id: z.number().int(),
        /** v1.2 新增：去掉 `@` 前缀的提及的名称 */
        name: z.string(),
    }),
})
export type IncomingMentionSeg = z.infer<typeof IncomingMentionSegSchema>

/** 提及消息段（1.0.x–1.1.x 旧形态） */
export interface IncomingMentionSegV1 {
    type: 'mention'
    data: {
        user_id: number
    }
}

/** 提及全体消息段 */
export const IncomingMentionAllSegSchema = z.object({
    type: z.literal('mention_all'),
    data: MilkyEmptySchema,
})
export type IncomingMentionAllSeg = z.infer<typeof IncomingMentionAllSegSchema>

/** 表情消息段（v1.1 起新增 is_large） */
export const IncomingFaceSegSchema = z.object({
    type: z.literal('face'),
    data: z.object({
        face_id: z.string(),
        /** v1.1 新增：是否为超级表情 */
        is_large: z.boolean(),
    }),
})
export type IncomingFaceSeg = z.infer<typeof IncomingFaceSegSchema>

/** 表情消息段（1.0.x 旧形态） */
export interface IncomingFaceSegV1 {
    type: 'face'
    data: {
        face_id: string
    }
}

/** 回复消息段（递归结构，类型先行、schema 受类型约束） */
export interface IncomingReplySeg {
    type: 'reply'
    data: {
        message_seq: number
        /** v1.2 新增：被引用消息的发送者 QQ 号 */
        sender_id: number
        /** v1.2 新增：仅在合并转发中能够获取 */
        sender_name?: string
        /** v1.2 新增：被引用消息的 Unix 时间戳（秒） */
        time: number
        /** v1.2 新增：被引用的消息内容 */
        segments: IncomingSegment[]
    }
}

/**
 * 回复消息段 schema
 * `segments` 通过 `z.lazy` 反向引用 `IncomingSegmentSchema`，以打破类型循环。
 */
export const IncomingReplySegSchema = z.object({
    type: z.literal('reply'),
    data: z.object({
        message_seq: z.number().int(),
        sender_id: z.number().int(),
        sender_name: z.string().optional(),
        time: z.number().int(),
        segments: z.array(z.lazy(() => IncomingSegmentSchema)),
    }),
})

/** 回复消息段（1.0.x–1.1.x 旧形态） */
export interface IncomingReplySegV1 {
    type: 'reply'
    data: {
        message_seq: number
    }
}

/** 图片消息段 */
export const IncomingImageSegSchema = z.object({
    type: z.literal('image'),
    data: z.object({
        resource_id: z.string(),
        temp_url: z.string(),
        width: z.number().int(),
        height: z.number().int(),
        summary: z.string(),
        sub_type: MilkyImageSubTypeSchema,
    }),
})
export type IncomingImageSeg = z.infer<typeof IncomingImageSegSchema>

/** 语音消息段（v1.1 起新增） */
export const IncomingRecordSegSchema = z.object({
    type: z.literal('record'),
    data: z.object({
        resource_id: z.string(),
        temp_url: z.string(),
        /** 语音时长（秒） */
        duration: z.number(),
    }),
})
export type IncomingRecordSeg = z.infer<typeof IncomingRecordSegSchema>

/** 视频消息段 */
export const IncomingVideoSegSchema = z.object({
    type: z.literal('video'),
    data: z.object({
        resource_id: z.string(),
        temp_url: z.string(),
        width: z.number().int(),
        height: z.number().int(),
        /** 视频时长（秒） */
        duration: z.number(),
    }),
})
export type IncomingVideoSeg = z.infer<typeof IncomingVideoSegSchema>

/** 文件消息段 */
export const IncomingFileSegSchema = z.object({
    type: z.literal('file'),
    data: z.object({
        file_id: z.string(),
        file_name: z.string(),
        file_size: z.number().int(),
        /** 文件的 TriSHA1 哈希值，仅在私聊文件中存在 */
        file_hash: z.string().optional(),
    }),
})
export type IncomingFileSeg = z.infer<typeof IncomingFileSegSchema>

/** 合并转发消息段（v1.1 起新增 title / preview / summary） */
export const IncomingForwardSegSchema = z.object({
    type: z.literal('forward'),
    data: z.object({
        forward_id: z.string(),
        /** v1.1 新增：合并转发标题 */
        title: z.string(),
        /** v1.1 新增：合并转发预览文本 */
        preview: z.array(z.string()),
        /** v1.1 新增：合并转发摘要 */
        summary: z.string(),
    }),
})
export type IncomingForwardSeg = z.infer<typeof IncomingForwardSegSchema>

/** 合并转发消息段（1.0.x 旧形态） */
export interface IncomingForwardSegV1 {
    type: 'forward'
    data: {
        forward_id: string
    }
}

/** 市场表情消息段（v1.1 起新增 emoji_package_id / emoji_id / key / summary） */
export const IncomingMarketFaceSegSchema = z.object({
    type: z.literal('market_face'),
    data: z.object({
        /** v1.1 新增：市场表情包 ID */
        emoji_package_id: z.number().int(),
        /** v1.1 新增：市场表情 ID */
        emoji_id: z.string(),
        /** v1.1 新增：市场表情 Key */
        key: z.string(),
        /** v1.1 新增：市场表情预览文本 */
        summary: z.string(),
        url: z.string(),
    }),
})
export type IncomingMarketFaceSeg = z.infer<typeof IncomingMarketFaceSegSchema>

/** 市场表情消息段（1.0.x 旧形态，仅有 url） */
export interface IncomingMarketFaceSegV1 {
    type: 'market_face'
    data: {
        url: string
    }
}

/** 小程序消息段 */
export const IncomingLightAppSegSchema = z.object({
    type: z.literal('light_app'),
    data: z.object({
        app_name: z.string(),
        json_payload: z.string(),
    }),
})
export type IncomingLightAppSeg = z.infer<typeof IncomingLightAppSegSchema>

/** XML 消息段 */
export const IncomingXmlSegSchema = z.object({
    type: z.literal('xml'),
    data: z.object({
        service_id: z.number().int(),
        xml_payload: z.string(),
    }),
})
export type IncomingXmlSeg = z.infer<typeof IncomingXmlSegSchema>

/** Markdown 消息段（v1.3 新增） */
export const IncomingMarkdownSegSchema = z.object({
    type: z.literal('markdown'),
    data: z.object({
        content: z.string(),
    }),
})
export type IncomingMarkdownSeg = z.infer<typeof IncomingMarkdownSegSchema>

/** 入站消息段联合（1.3.0 当前形态，全部 14 种） */
export type IncomingSegment =
    | IncomingTextSeg
    | IncomingMentionSeg
    | IncomingMentionAllSeg
    | IncomingFaceSeg
    | IncomingReplySeg
    | IncomingImageSeg
    | IncomingRecordSeg
    | IncomingVideoSeg
    | IncomingFileSeg
    | IncomingForwardSeg
    | IncomingMarketFaceSeg
    | IncomingLightAppSeg
    | IncomingXmlSeg
    | IncomingMarkdownSeg

/**
 * 入站消息段联合（1.0.x 旧形态）
 * 仅用于低版本协议端数据的类型收窄，不参与校验。
 */
export type IncomingSegmentV1 =
    | IncomingTextSeg
    | IncomingMentionSegV1
    | IncomingMentionAllSeg
    | IncomingFaceSegV1
    | IncomingReplySegV1
    | IncomingImageSeg
    | IncomingRecordSeg
    | IncomingVideoSeg
    | IncomingFileSeg
    | IncomingForwardSegV1
    | IncomingMarketFaceSegV1
    | IncomingLightAppSeg
    | IncomingXmlSeg

/**
 * 入站消息段 schema（全部 14 种）
 * 因 `reply` 段递归引用本 schema，联合体整体标注为 `z.ZodType<IncomingSegment>`，
 * 由 zod 的 `z.lazy` 打破推导循环。
 */
export const IncomingSegmentSchema = z.lazy(() =>
    z.discriminatedUnion('type', [
        IncomingTextSegSchema,
        IncomingMentionSegSchema,
        IncomingMentionAllSegSchema,
        IncomingFaceSegSchema,
        IncomingReplySegSchema,
        IncomingImageSegSchema,
        IncomingRecordSegSchema,
        IncomingVideoSegSchema,
        IncomingFileSegSchema,
        IncomingForwardSegSchema,
        IncomingMarketFaceSegSchema,
        IncomingLightAppSegSchema,
        IncomingXmlSegSchema,
        IncomingMarkdownSegSchema,
    ]),
) as unknown as z.ZodType<IncomingSegment>

// #endregion

// #region == 出站消息段 =========================================

/** 文本消息段 */
export const OutgoingTextSegSchema = z.object({
    type: z.literal('text'),
    data: z.object({
        text: z.string(),
    }),
})
export type OutgoingTextSeg = z.infer<typeof OutgoingTextSegSchema>

/** 提及消息段 */
export const OutgoingMentionSegSchema = z.object({
    type: z.literal('mention'),
    data: z.object({
        user_id: z.number().int(),
    }),
})
export type OutgoingMentionSeg = z.infer<typeof OutgoingMentionSegSchema>

/** 提及全体消息段 */
export const OutgoingMentionAllSegSchema = z.object({
    type: z.literal('mention_all'),
    data: MilkyEmptySchema,
})
export type OutgoingMentionAllSeg = z.infer<typeof OutgoingMentionAllSegSchema>

/** 表情消息段（v1.1 起新增 is_large，默认值 false） */
export const OutgoingFaceSegSchema = z.object({
    type: z.literal('face'),
    data: z.object({
        face_id: z.string(),
        /** v1.1 新增：是否为超级表情，默认值 false（可省略） */
        is_large: z.boolean().optional(),
    }),
})
export type OutgoingFaceSeg = z.infer<typeof OutgoingFaceSegSchema>

/** 表情消息段（1.0.x 旧形态） */
export interface OutgoingFaceSegV1 {
    type: 'face'
    data: {
        face_id: string
    }
}

/** 回复消息段 */
export const OutgoingReplySegSchema = z.object({
    type: z.literal('reply'),
    data: z.object({
        message_seq: z.number().int(),
    }),
})
export type OutgoingReplySeg = z.infer<typeof OutgoingReplySegSchema>

/** 图片消息段 */
export const OutgoingImageSegSchema = z.object({
    type: z.literal('image'),
    data: z.object({
        uri: z.string(),
        /** 默认值 normal（可省略） */
        sub_type: MilkyImageSubTypeSchema.optional(),
        summary: z.string().optional(),
    }),
})
export type OutgoingImageSeg = z.infer<typeof OutgoingImageSegSchema>

/** 语音消息段（v1.1 起新增） */
export const OutgoingRecordSegSchema = z.object({
    type: z.literal('record'),
    data: z.object({
        uri: z.string(),
    }),
})
export type OutgoingRecordSeg = z.infer<typeof OutgoingRecordSegSchema>

/** 视频消息段 */
export const OutgoingVideoSegSchema = z.object({
    type: z.literal('video'),
    data: z.object({
        uri: z.string(),
        thumb_uri: z.string().optional(),
    }),
})
export type OutgoingVideoSeg = z.infer<typeof OutgoingVideoSegSchema>

/**
 * 合并转发消息段
 * 与出站消息段联合互为递归引用，故此处类型先行声明，schema 反向受其约束。
 */
export interface OutgoingForwardSeg {
    type: 'forward'
    data: {
        messages: OutgoingForwardedMessage[]
        /** v1.2 新增：合并转发标题 */
        title?: string
        /** v1.2 新增：合并转发预览文本，至少 1 条、至多 4 条 */
        preview?: string[]
        /** v1.2 新增：合并转发摘要 */
        summary?: string
        /** v1.2 新增：合并转发的预览外显文本，仅对移动端 QQ 有效 */
        prompt?: string
    }
}

/** 合并转发消息段 schema（`messages` 递归引用出站消息段，使用 lazy） */
export const OutgoingForwardSegSchema = z.object({
    type: z.literal('forward'),
    data: z.object({
        messages: z.array(z.lazy(() => OutgoingForwardedMessageSchema)),
        /** v1.2 新增：合并转发标题 */
        title: z.string().optional(),
        /** v1.2 新增：合并转发预览文本，至少 1 条、至多 4 条 */
        preview: z.array(z.string()).optional(),
        /** v1.2 新增：合并转发摘要 */
        summary: z.string().optional(),
        /** v1.2 新增：合并转发的预览外显文本，仅对移动端 QQ 有效 */
        prompt: z.string().optional(),
    }),
})

/** 合并转发消息段（1.0.x–1.1.x 旧形态） */
export interface OutgoingForwardSegV1 {
    type: 'forward'
    data: {
        messages: OutgoingForwardedMessageV1[]
    }
}

/** 小程序消息段（v1.2 新增，出站仅有 json_payload） */
export const OutgoingLightAppSegSchema = z.object({
    type: z.literal('light_app'),
    data: z.object({
        json_payload: z.string(),
    }),
})
export type OutgoingLightAppSeg = z.infer<typeof OutgoingLightAppSegSchema>

/** 出站消息段联合（1.3.0 当前形态，全部 10 种） */
export type OutgoingSegment =
    | OutgoingTextSeg
    | OutgoingMentionSeg
    | OutgoingMentionAllSeg
    | OutgoingFaceSeg
    | OutgoingReplySeg
    | OutgoingImageSeg
    | OutgoingRecordSeg
    | OutgoingVideoSeg
    | OutgoingForwardSeg
    | OutgoingLightAppSeg

/**
 * 出站消息段联合（1.0.x 旧形态）
 * 仅用于低版本协议端数据的类型收窄，不参与校验。
 */
export type OutgoingSegmentV1 =
    | OutgoingTextSeg
    | OutgoingMentionSeg
    | OutgoingMentionAllSeg
    | OutgoingFaceSegV1
    | OutgoingReplySeg
    | OutgoingImageSeg
    | OutgoingRecordSeg
    | OutgoingVideoSeg
    | OutgoingForwardSegV1

/**
 * 出站消息段 schema（全部 10 种）
 * 因 `forward` 段递归引用本 schema，联合体整体标注为 `z.ZodType<OutgoingSegment>`。
 */
export const OutgoingSegmentSchema = z.lazy(() =>
    z.discriminatedUnion('type', [
        OutgoingTextSegSchema,
        OutgoingMentionSegSchema,
        OutgoingMentionAllSegSchema,
        OutgoingFaceSegSchema,
        OutgoingReplySegSchema,
        OutgoingImageSegSchema,
        OutgoingRecordSegSchema,
        OutgoingVideoSegSchema,
        OutgoingForwardSegSchema,
        OutgoingLightAppSegSchema,
    ]),
) as unknown as z.ZodType<OutgoingSegment>

// #endregion

// #region == 消息结构 ===========================================

/** 好友消息 */
export const IncomingFriendMessageSchema = z.object({
    message_scene: z.literal('friend'),
    peer_id: z.number().int(),
    message_seq: z.number().int(),
    sender_id: z.number().int(),
    time: z.number().int(),
    segments: z.array(IncomingSegmentSchema),
    friend: FriendEntitySchema,
})
export type IncomingFriendMessage = z.infer<typeof IncomingFriendMessageSchema>

/** 群消息 */
export const IncomingGroupMessageSchema = z.object({
    message_scene: z.literal('group'),
    peer_id: z.number().int(),
    message_seq: z.number().int(),
    sender_id: z.number().int(),
    time: z.number().int(),
    segments: z.array(IncomingSegmentSchema),
    group: GroupEntitySchema,
    group_member: GroupMemberEntitySchema,
})
export type IncomingGroupMessage = z.infer<typeof IncomingGroupMessageSchema>

/** 临时会话消息 */
export const IncomingTempMessageSchema = z.object({
    message_scene: z.literal('temp'),
    peer_id: z.number().int(),
    message_seq: z.number().int(),
    sender_id: z.number().int(),
    time: z.number().int(),
    segments: z.array(IncomingSegmentSchema),
    /** 临时会话发送者所在的群信息 */
    group: GroupEntitySchema.optional(),
})
export type IncomingTempMessage = z.infer<typeof IncomingTempMessageSchema>

/** 接收消息（三态判别联合） */
export type IncomingMessage =
    | IncomingFriendMessage
    | IncomingGroupMessage
    | IncomingTempMessage

/** 接收消息 schema */
export const IncomingMessageSchema: z.ZodType<IncomingMessage> =
    z.discriminatedUnion('message_scene', [
        IncomingFriendMessageSchema,
        IncomingGroupMessageSchema,
        IncomingTempMessageSchema,
    ])

/** 群精华消息（递归结构，类型先行、schema 受类型约束） */
export interface GroupEssenceMessage {
    group_id: number
    message_seq: number
    message_time: number
    sender_id: number
    sender_name: string
    operator_id: number
    operator_name: string
    operation_time: number
    segments: IncomingSegment[]
}

/** 群精华消息 schema */
export const GroupEssenceMessageSchema: z.ZodType<GroupEssenceMessage> =
    z.object({
        group_id: z.number().int(),
        message_seq: z.number().int(),
        message_time: z.number().int(),
        sender_id: z.number().int(),
        sender_name: z.string(),
        operator_id: z.number().int(),
        operator_name: z.string(),
        operation_time: z.number().int(),
        segments: z.array(IncomingSegmentSchema),
    })

/** 接收转发消息（1.2 起新增 message_seq） */
export interface IncomingForwardedMessage {
    /** v1.2 新增：消息序列号 */
    message_seq: number
    sender_name: string
    avatar_url: string
    time: number
    segments: IncomingSegment[]
}

/** 接收转发消息 schema */
export const IncomingForwardedMessageSchema: z.ZodType<IncomingForwardedMessage> =
    z.object({
        message_seq: z.number().int(),
        sender_name: z.string(),
        avatar_url: z.string(),
        time: z.number().int(),
        segments: z.array(IncomingSegmentSchema),
    })

/** 接收转发消息（1.0.x–1.1.x 旧形态） */
export interface IncomingForwardedMessageV1 {
    sender_name: string
    avatar_url: string
    time: number
    segments: IncomingSegmentV1[]
}

/** 发送转发消息（1.3 起新增可选 time） */
export interface OutgoingForwardedMessage {
    user_id: number
    sender_name: string
    /** v1.3 新增：消息 Unix 时间戳（秒） */
    time?: number
    segments: OutgoingSegment[]
}

/** 发送转发消息 schema */
export const OutgoingForwardedMessageSchema: z.ZodType<OutgoingForwardedMessage> =
    z.lazy(() =>
        z.object({
            user_id: z.number().int(),
            sender_name: z.string(),
            time: z.number().int().optional(),
            segments: z.array(OutgoingSegmentSchema),
        }),
    )

/** 发送转发消息（1.0.x–1.2.x 旧形态） */
export interface OutgoingForwardedMessageV1 {
    user_id: number
    sender_name: string
    segments: OutgoingSegmentV1[]
}

// #endregion

// #region == 事件 ===============================================

/** 机器人离线事件 */
export const BotOfflineEventDataSchema = z.object({
    reason: z.string(),
})
export type BotOfflineEventData = z.infer<typeof BotOfflineEventDataSchema>

/** 消息撤回事件 */
export const MessageRecallEventDataSchema = z.object({
    message_scene: MilkyMessageSceneSchema,
    peer_id: z.number().int(),
    message_seq: z.number().int(),
    sender_id: z.number().int(),
    operator_id: z.number().int(),
    display_suffix: z.string(),
})
export type MessageRecallEventData = z.infer<
    typeof MessageRecallEventDataSchema
>

/** 会话置顶变更事件（v1.2 新增事件） */
export const PeerPinChangeEventDataSchema = z.object({
    message_scene: MilkyMessageSceneSchema,
    peer_id: z.number().int(),
    is_pinned: z.boolean(),
})
export type PeerPinChangeEventData = z.infer<
    typeof PeerPinChangeEventDataSchema
>

/** 好友请求事件 */
export const FriendRequestEventDataSchema = z.object({
    initiator_id: z.number().int(),
    initiator_uid: z.string(),
    comment: z.string(),
    via: z.string(),
})
export type FriendRequestEventData = z.infer<
    typeof FriendRequestEventDataSchema
>

/** 入群请求事件 */
export const GroupJoinRequestEventDataSchema = z.object({
    group_id: z.number().int(),
    notification_seq: z.number().int(),
    is_filtered: z.boolean(),
    initiator_id: z.number().int(),
    comment: z.string(),
})
export type GroupJoinRequestEventData = z.infer<
    typeof GroupJoinRequestEventDataSchema
>

/** 群成员邀请他人入群请求事件 */
export const GroupInvitedJoinRequestEventDataSchema = z.object({
    group_id: z.number().int(),
    notification_seq: z.number().int(),
    initiator_id: z.number().int(),
    target_user_id: z.number().int(),
})
export type GroupInvitedJoinRequestEventData = z.infer<
    typeof GroupInvitedJoinRequestEventDataSchema
>

/** 他人邀请自身入群事件（v1.2 起新增可选 source_group_id） */
export const GroupInvitationEventDataSchema = z.object({
    group_id: z.number().int(),
    invitation_seq: z.number().int(),
    initiator_id: z.number().int(),
    /** v1.2 新增：来源群号，如果是通过 QQ 群邀请 */
    source_group_id: z.number().int().optional(),
})
export type GroupInvitationEventData = z.infer<
    typeof GroupInvitationEventDataSchema
>

/** 他人邀请自身入群事件（1.0.x–1.1.x 旧形态） */
export interface GroupInvitationEventDataV1 {
    group_id: number
    invitation_seq: number
    initiator_id: number
}

/** 好友戳一戳事件 */
export const FriendNudgeEventDataSchema = z.object({
    user_id: z.number().int(),
    is_self_send: z.boolean(),
    is_self_receive: z.boolean(),
    display_action: z.string(),
    display_suffix: z.string(),
    display_action_img_url: z.string(),
})
export type FriendNudgeEventData = z.infer<typeof FriendNudgeEventDataSchema>

/** 好友文件上传事件 */
export const FriendFileUploadEventDataSchema = z.object({
    user_id: z.number().int(),
    file_id: z.string(),
    file_name: z.string(),
    file_size: z.number().int(),
    file_hash: z.string(),
    is_self: z.boolean(),
})
export type FriendFileUploadEventData = z.infer<
    typeof FriendFileUploadEventDataSchema
>

/** 群管理员变更事件（v1.1 起新增 operator_id） */
export const GroupAdminChangeEventDataSchema = z.object({
    group_id: z.number().int(),
    user_id: z.number().int(),
    /** v1.1 新增：操作者 QQ 号 */
    operator_id: z.number().int(),
    is_set: z.boolean(),
})
export type GroupAdminChangeEventData = z.infer<
    typeof GroupAdminChangeEventDataSchema
>

/** 群管理员变更事件（1.0.x 旧形态） */
export interface GroupAdminChangeEventDataV1 {
    group_id: number
    user_id: number
    is_set: boolean
}

/** 群精华消息变更事件（v1.1 起新增 operator_id） */
export const GroupEssenceMessageChangeEventDataSchema = z.object({
    group_id: z.number().int(),
    message_seq: z.number().int(),
    /** v1.1 新增：操作者 QQ 号 */
    operator_id: z.number().int(),
    is_set: z.boolean(),
})
export type GroupEssenceMessageChangeEventData = z.infer<
    typeof GroupEssenceMessageChangeEventDataSchema
>

/** 群精华消息变更事件（1.0.x 旧形态） */
export interface GroupEssenceMessageChangeEventDataV1 {
    group_id: number
    message_seq: number
    is_set: boolean
}

/** 群成员增加事件 */
export const GroupMemberIncreaseEventDataSchema = z.object({
    group_id: z.number().int(),
    user_id: z.number().int(),
    /** 管理员 QQ 号，如果是管理员同意入群 */
    operator_id: z.number().int().optional(),
    /** 邀请者 QQ 号，如果是邀请入群 */
    invitor_id: z.number().int().optional(),
})
export type GroupMemberIncreaseEventData = z.infer<
    typeof GroupMemberIncreaseEventDataSchema
>

/** 群成员减少事件 */
export const GroupMemberDecreaseEventDataSchema = z.object({
    group_id: z.number().int(),
    user_id: z.number().int(),
    /** 管理员 QQ 号，如果是管理员踢出 */
    operator_id: z.number().int().optional(),
})
export type GroupMemberDecreaseEventData = z.infer<
    typeof GroupMemberDecreaseEventDataSchema
>

/** 群解散事件（v1.3 新增事件） */
export const GroupDisbandEventDataSchema = z.object({
    group_id: z.number().int(),
    operator_id: z.number().int(),
})
export type GroupDisbandEventData = z.infer<
    typeof GroupDisbandEventDataSchema
>

/** 群名称变更事件 */
export const GroupNameChangeEventDataSchema = z.object({
    group_id: z.number().int(),
    new_group_name: z.string(),
    operator_id: z.number().int(),
})
export type GroupNameChangeEventData = z.infer<
    typeof GroupNameChangeEventDataSchema
>

/** 群消息表情回应事件（v1.2 起新增 reaction_type） */
export const GroupMessageReactionEventDataSchema = z.object({
    group_id: z.number().int(),
    user_id: z.number().int(),
    message_seq: z.number().int(),
    face_id: z.string(),
    /** v1.2 新增：收到的回应类型 */
    reaction_type: MilkyReactionTypeSchema,
    is_add: z.boolean(),
})
export type GroupMessageReactionEventData = z.infer<
    typeof GroupMessageReactionEventDataSchema
>

/** 群消息表情回应事件（1.0.x–1.1.x 旧形态） */
export interface GroupMessageReactionEventDataV1 {
    group_id: number
    user_id: number
    message_seq: number
    face_id: string
    is_add: boolean
}

/** 群禁言事件 */
export const GroupMuteEventDataSchema = z.object({
    group_id: z.number().int(),
    user_id: z.number().int(),
    operator_id: z.number().int(),
    /** 禁言时长（秒），为 0 表示取消禁言 */
    duration: z.number().int(),
})
export type GroupMuteEventData = z.infer<typeof GroupMuteEventDataSchema>

/** 群全体禁言事件 */
export const GroupWholeMuteEventDataSchema = z.object({
    group_id: z.number().int(),
    operator_id: z.number().int(),
    is_mute: z.boolean(),
})
export type GroupWholeMuteEventData = z.infer<
    typeof GroupWholeMuteEventDataSchema
>

/** 群戳一戳事件 */
export const GroupNudgeEventDataSchema = z.object({
    group_id: z.number().int(),
    sender_id: z.number().int(),
    receiver_id: z.number().int(),
    display_action: z.string(),
    display_suffix: z.string(),
    display_action_img_url: z.string(),
})
export type GroupNudgeEventData = z.infer<typeof GroupNudgeEventDataSchema>

/** 群文件上传事件 */
export const GroupFileUploadEventDataSchema = z.object({
    group_id: z.number().int(),
    user_id: z.number().int(),
    file_id: z.string(),
    file_name: z.string(),
    file_size: z.number().int(),
})
export type GroupFileUploadEventData = z.infer<
    typeof GroupFileUploadEventDataSchema
>

/**
 * 事件包络（1.3.0 全部 21 个 event_type，判别联合）
 *
 * 因 `message_receive` 的 data 引用 `IncomingMessageSchema`，此处同样以
 * `z.discriminatedUnion` + 类型断言方式构造，并导出 `MilkyEvent` 类型。
 */
export const MilkyEventSchema = z.discriminatedUnion('event_type', [
    z.object({
        event_type: z.literal('bot_offline'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: BotOfflineEventDataSchema,
    }),
    z.object({
        event_type: z.literal('message_receive'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: IncomingMessageSchema,
    }),
    z.object({
        event_type: z.literal('message_recall'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: MessageRecallEventDataSchema,
    }),
    z.object({
        event_type: z.literal('peer_pin_change'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: PeerPinChangeEventDataSchema,
    }),
    z.object({
        event_type: z.literal('friend_request'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: FriendRequestEventDataSchema,
    }),
    z.object({
        event_type: z.literal('group_join_request'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: GroupJoinRequestEventDataSchema,
    }),
    z.object({
        event_type: z.literal('group_invited_join_request'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: GroupInvitedJoinRequestEventDataSchema,
    }),
    z.object({
        event_type: z.literal('group_invitation'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: GroupInvitationEventDataSchema,
    }),
    z.object({
        event_type: z.literal('friend_nudge'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: FriendNudgeEventDataSchema,
    }),
    z.object({
        event_type: z.literal('friend_file_upload'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: FriendFileUploadEventDataSchema,
    }),
    z.object({
        event_type: z.literal('group_admin_change'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: GroupAdminChangeEventDataSchema,
    }),
    z.object({
        event_type: z.literal('group_essence_message_change'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: GroupEssenceMessageChangeEventDataSchema,
    }),
    z.object({
        event_type: z.literal('group_member_increase'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: GroupMemberIncreaseEventDataSchema,
    }),
    z.object({
        event_type: z.literal('group_member_decrease'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: GroupMemberDecreaseEventDataSchema,
    }),
    z.object({
        event_type: z.literal('group_disband'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: GroupDisbandEventDataSchema,
    }),
    z.object({
        event_type: z.literal('group_name_change'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: GroupNameChangeEventDataSchema,
    }),
    z.object({
        event_type: z.literal('group_message_reaction'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: GroupMessageReactionEventDataSchema,
    }),
    z.object({
        event_type: z.literal('group_mute'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: GroupMuteEventDataSchema,
    }),
    z.object({
        event_type: z.literal('group_whole_mute'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: GroupWholeMuteEventDataSchema,
    }),
    z.object({
        event_type: z.literal('group_nudge'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: GroupNudgeEventDataSchema,
    }),
    z.object({
        event_type: z.literal('group_file_upload'),
        time: z.number().int(),
        self_id: z.number().int(),
        data: GroupFileUploadEventDataSchema,
    }),
])
export type MilkyEvent = z.infer<typeof MilkyEventSchema>

/** 全部 event_type 字面量联合 */
export type MilkyEventType = MilkyEvent['event_type']

/** 按 event_type 取事件载荷类型 */
export type MilkyEventData<T extends MilkyEventType> = Extract<
    MilkyEvent,
    { event_type: T }
>['data']

/**
 * event_type → data 载荷映射（1.0.x 旧形态）
 * 不含 v1.2 的 peer_pin_change、v1.3 的 group_disband，
 * 属性变动的事件使用 V1 旧载荷。
 */
export interface MilkyEventDataMapV1 {
    bot_offline: BotOfflineEventData
    message_receive: IncomingMessage
    message_recall: MessageRecallEventData
    friend_request: FriendRequestEventData
    group_join_request: GroupJoinRequestEventData
    group_invited_join_request: GroupInvitedJoinRequestEventData
    group_invitation: GroupInvitationEventDataV1
    friend_nudge: FriendNudgeEventData
    friend_file_upload: FriendFileUploadEventData
    group_admin_change: GroupAdminChangeEventDataV1
    group_essence_message_change: GroupEssenceMessageChangeEventDataV1
    group_member_increase: GroupMemberIncreaseEventData
    group_member_decrease: GroupMemberDecreaseEventData
    group_name_change: GroupNameChangeEventData
    group_message_reaction: GroupMessageReactionEventDataV1
    group_mute: GroupMuteEventData
    group_whole_mute: GroupWholeMuteEventData
    group_nudge: GroupNudgeEventData
    group_file_upload: GroupFileUploadEventData
}

/** 事件包络（1.0.x 旧形态） */
export type MilkyEventV1 = {
    [K in keyof MilkyEventDataMapV1]: {
        event_type: K
        time: number
        self_id: number
        data: MilkyEventDataMapV1[K]
    }
}[keyof MilkyEventDataMapV1]

// #endregion

// #region == API 输入/输出 ======================================

// ---- 系统 API -------------------------------------------------

export const GetLoginInfoInputSchema = MilkyEmptySchema
export const GetLoginInfoOutputSchema = z.object({
    uin: z.number().int(),
    nickname: z.string(),
})
export type GetLoginInfoInput = z.input<typeof GetLoginInfoInputSchema>
export type GetLoginInfoOutput = z.output<typeof GetLoginInfoOutputSchema>

export const GetImplInfoInputSchema = MilkyEmptySchema
export const GetImplInfoOutputSchema = z.object({
    impl_name: z.string(),
    impl_version: z.string(),
    qq_protocol_version: z.string(),
    qq_protocol_type: MilkyProtocolTypeSchema,
    /** 协议端实现的 Milky 协议版本，目前为 "1.3" */
    milky_version: z.string(),
})
export type GetImplInfoInput = z.input<typeof GetImplInfoInputSchema>
/**
 * 使用 type 而非 interface：全部字段均为 string 兼容类型，
 * 需要保留对象的隐式索引签名（适配器 getAdapterInfo 返回
 * `{ [key: string]: string }`，interface 不会获得隐式索引签名）。
 */
export type GetImplInfoOutput = z.output<typeof GetImplInfoOutputSchema>

export const GetUserProfileInputSchema = z.object({
    user_id: z.number().int(),
})
export const GetUserProfileOutputSchema = z.object({
    nickname: z.string(),
    qid: z.string(),
    age: z.number().int(),
    sex: MilkySexSchema,
    remark: z.string(),
    bio: z.string(),
    level: z.number().int(),
    country: z.string(),
    city: z.string(),
    school: z.string(),
})
export type GetUserProfileInput = z.input<typeof GetUserProfileInputSchema>
export type GetUserProfileOutput = z.output<typeof GetUserProfileOutputSchema>

export const GetFriendListInputSchema = z.object({
    /** 是否强制不使用缓存，默认值 false */
    no_cache: z.boolean().optional(),
})
export const GetFriendListOutputSchema = z.object({
    friends: z.array(FriendEntitySchema),
})
export type GetFriendListInput = z.input<typeof GetFriendListInputSchema>
export type GetFriendListOutput = z.output<typeof GetFriendListOutputSchema>

export const GetFriendInfoInputSchema = z.object({
    user_id: z.number().int(),
    /** 是否强制不使用缓存，默认值 false */
    no_cache: z.boolean().optional(),
})
export const GetFriendInfoOutputSchema = z.object({
    friend: FriendEntitySchema,
})
export type GetFriendInfoInput = z.input<typeof GetFriendInfoInputSchema>
export type GetFriendInfoOutput = z.output<typeof GetFriendInfoOutputSchema>

export const GetGroupListInputSchema = z.object({
    /** 是否强制不使用缓存，默认值 false */
    no_cache: z.boolean().optional(),
})
export const GetGroupListOutputSchema = z.object({
    groups: z.array(GroupEntitySchema),
})
export type GetGroupListInput = z.input<typeof GetGroupListInputSchema>
export type GetGroupListOutput = z.output<typeof GetGroupListOutputSchema>

export const GetGroupInfoInputSchema = z.object({
    group_id: z.number().int(),
    /** 是否强制不使用缓存，默认值 false */
    no_cache: z.boolean().optional(),
})
export const GetGroupInfoOutputSchema = z.object({
    group: GroupEntitySchema,
})
export type GetGroupInfoInput = z.input<typeof GetGroupInfoInputSchema>
export type GetGroupInfoOutput = z.output<typeof GetGroupInfoOutputSchema>

export const GetGroupMemberListInputSchema = z.object({
    group_id: z.number().int(),
    /** 是否强制不使用缓存，默认值 false */
    no_cache: z.boolean().optional(),
})
export const GetGroupMemberListOutputSchema = z.object({
    members: z.array(GroupMemberEntitySchema),
})
export type GetGroupMemberListInput = z.input<
    typeof GetGroupMemberListInputSchema
>
export type GetGroupMemberListOutput = z.output<
    typeof GetGroupMemberListOutputSchema
>

export const GetGroupMemberInfoInputSchema = z.object({
    group_id: z.number().int(),
    user_id: z.number().int(),
    /** 是否强制不使用缓存，默认值 false */
    no_cache: z.boolean().optional(),
})
export const GetGroupMemberInfoOutputSchema = z.object({
    member: GroupMemberEntitySchema,
})
export type GetGroupMemberInfoInput = z.input<
    typeof GetGroupMemberInfoInputSchema
>
export type GetGroupMemberInfoOutput = z.output<
    typeof GetGroupMemberInfoOutputSchema
>

/** v1.2 新增 API */
export const GetPeerPinsInputSchema = MilkyEmptySchema
export const GetPeerPinsOutputSchema = z.object({
    friends: z.array(FriendEntitySchema),
    groups: z.array(GroupEntitySchema),
})
export type GetPeerPinsInput = z.input<typeof GetPeerPinsInputSchema>
export type GetPeerPinsOutput = z.output<typeof GetPeerPinsOutputSchema>

/** v1.2 新增 API */
export const SetPeerPinInputSchema = z.object({
    message_scene: MilkyMessageSceneSchema,
    peer_id: z.number().int(),
    /** 是否置顶，false 表示取消置顶，默认值 true */
    is_pinned: z.boolean().optional(),
})
export const SetPeerPinOutputSchema = MilkyEmptySchema
export type SetPeerPinInput = z.input<typeof SetPeerPinInputSchema>
export type SetPeerPinOutput = z.output<typeof SetPeerPinOutputSchema>

/** v1.1 新增 API */
export const SetAvatarInputSchema = z.object({
    /** 头像文件 URI，支持 file:// / http(s):// / base64:// */
    uri: z.string(),
})
export const SetAvatarOutputSchema = MilkyEmptySchema
export type SetAvatarInput = z.input<typeof SetAvatarInputSchema>
export type SetAvatarOutput = z.output<typeof SetAvatarOutputSchema>

/** v1.1 新增 API */
export const SetNicknameInputSchema = z.object({
    new_nickname: z.string(),
})
export const SetNicknameOutputSchema = MilkyEmptySchema
export type SetNicknameInput = z.input<typeof SetNicknameInputSchema>
export type SetNicknameOutput = z.output<typeof SetNicknameOutputSchema>

/** v1.1 新增 API */
export const SetBioInputSchema = z.object({
    new_bio: z.string(),
})
export const SetBioOutputSchema = MilkyEmptySchema
export type SetBioInput = z.input<typeof SetBioInputSchema>
export type SetBioOutput = z.output<typeof SetBioOutputSchema>

/** v1.1 新增 API */
export const GetCustomFaceUrlListInputSchema = MilkyEmptySchema
export const GetCustomFaceUrlListOutputSchema = z.object({
    urls: z.array(z.string()),
})
export type GetCustomFaceUrlListInput = z.input<
    typeof GetCustomFaceUrlListInputSchema
>
export type GetCustomFaceUrlListOutput = z.output<
    typeof GetCustomFaceUrlListOutputSchema
>

export const GetCookiesInputSchema = z.object({
    domain: z.string(),
})
export const GetCookiesOutputSchema = z.object({
    cookies: z.string(),
})
export type GetCookiesInput = z.input<typeof GetCookiesInputSchema>
export type GetCookiesOutput = z.output<typeof GetCookiesOutputSchema>

export const GetCsrfTokenInputSchema = MilkyEmptySchema
export const GetCsrfTokenOutputSchema = z.object({
    csrf_token: z.string(),
})
export type GetCsrfTokenInput = z.input<typeof GetCsrfTokenInputSchema>
export type GetCsrfTokenOutput = z.output<typeof GetCsrfTokenOutputSchema>

// ---- 消息 API -------------------------------------------------

export const SendPrivateMessageInputSchema = z.object({
    user_id: z.number().int(),
    message: z.array(OutgoingSegmentSchema),
})
export const SendPrivateMessageOutputSchema = z.object({
    message_seq: z.number().int(),
    time: z.number().int(),
})
export type SendPrivateMessageInput = z.input<
    typeof SendPrivateMessageInputSchema
>
export type SendPrivateMessageOutput = z.output<
    typeof SendPrivateMessageOutputSchema
>

export const SendGroupMessageInputSchema = z.object({
    group_id: z.number().int(),
    message: z.array(OutgoingSegmentSchema),
})
export const SendGroupMessageOutputSchema = z.object({
    message_seq: z.number().int(),
    time: z.number().int(),
})
export type SendGroupMessageInput = z.input<typeof SendGroupMessageInputSchema>
export type SendGroupMessageOutput = z.output<
    typeof SendGroupMessageOutputSchema
>

export const RecallPrivateMessageInputSchema = z.object({
    user_id: z.number().int(),
    message_seq: z.number().int(),
})
export const RecallPrivateMessageOutputSchema = MilkyEmptySchema
export type RecallPrivateMessageInput = z.input<
    typeof RecallPrivateMessageInputSchema
>
export type RecallPrivateMessageOutput = z.output<
    typeof RecallPrivateMessageOutputSchema
>

export const RecallGroupMessageInputSchema = z.object({
    group_id: z.number().int(),
    message_seq: z.number().int(),
})
export const RecallGroupMessageOutputSchema = MilkyEmptySchema
export type RecallGroupMessageInput = z.input<
    typeof RecallGroupMessageInputSchema
>
export type RecallGroupMessageOutput = z.output<
    typeof RecallGroupMessageOutputSchema
>

export const GetMessageInputSchema = z.object({
    message_scene: MilkyMessageSceneSchema,
    peer_id: z.number().int(),
    message_seq: z.number().int(),
})
export const GetMessageOutputSchema = z.object({
    message: IncomingMessageSchema,
})
export type GetMessageInput = z.input<typeof GetMessageInputSchema>
export type GetMessageOutput = z.output<typeof GetMessageOutputSchema>

export const GetHistoryMessagesInputSchema = z.object({
    message_scene: MilkyMessageSceneSchema,
    peer_id: z.number().int(),
    /** 起始消息序列号，不提供则从最新消息开始 */
    start_message_seq: z.number().int().optional(),
    /** 期望获取到的消息数量，最多 30 条，默认值 20 */
    limit: z.number().int().optional(),
})
export const GetHistoryMessagesOutputSchema = z.object({
    messages: z.array(IncomingMessageSchema),
    next_message_seq: z.number().int().optional(),
})
export type GetHistoryMessagesInput = z.input<
    typeof GetHistoryMessagesInputSchema
>
export type GetHistoryMessagesOutput = z.output<
    typeof GetHistoryMessagesOutputSchema
>

export const GetResourceTempUrlInputSchema = z.object({
    resource_id: z.string(),
})
export const GetResourceTempUrlOutputSchema = z.object({
    url: z.string(),
})
export type GetResourceTempUrlInput = z.input<
    typeof GetResourceTempUrlInputSchema
>
export type GetResourceTempUrlOutput = z.output<
    typeof GetResourceTempUrlOutputSchema
>

export const GetForwardedMessagesInputSchema = z.object({
    forward_id: z.string(),
})
export const GetForwardedMessagesOutputSchema = z.object({
    messages: z.array(IncomingForwardedMessageSchema),
})
export type GetForwardedMessagesInput = z.input<
    typeof GetForwardedMessagesInputSchema
>
export type GetForwardedMessagesOutput = z.output<
    typeof GetForwardedMessagesOutputSchema
>

export const MarkMessageAsReadInputSchema = z.object({
    message_scene: MilkyMessageSceneSchema,
    peer_id: z.number().int(),
    message_seq: z.number().int(),
})
export const MarkMessageAsReadOutputSchema = MilkyEmptySchema
export type MarkMessageAsReadInput = z.input<
    typeof MarkMessageAsReadInputSchema
>
export type MarkMessageAsReadOutput = z.output<
    typeof MarkMessageAsReadOutputSchema
>

// ---- 好友 API -------------------------------------------------

export const SendFriendNudgeInputSchema = z.object({
    user_id: z.number().int(),
    /** 是否戳自己，默认值 false */
    is_self: z.boolean().optional(),
})
export const SendFriendNudgeOutputSchema = MilkyEmptySchema
export type SendFriendNudgeInput = z.input<typeof SendFriendNudgeInputSchema>
export type SendFriendNudgeOutput = z.output<
    typeof SendFriendNudgeOutputSchema
>

export const SendProfileLikeInputSchema = z.object({
    user_id: z.number().int(),
    /** 点赞数量，默认值 1 */
    count: z.number().int().optional(),
})
export const SendProfileLikeOutputSchema = MilkyEmptySchema
export type SendProfileLikeInput = z.input<typeof SendProfileLikeInputSchema>
export type SendProfileLikeOutput = z.output<
    typeof SendProfileLikeOutputSchema
>

/** v1.1 新增 API */
export const DeleteFriendInputSchema = z.object({
    user_id: z.number().int(),
})
export const DeleteFriendOutputSchema = MilkyEmptySchema
export type DeleteFriendInput = z.input<typeof DeleteFriendInputSchema>
export type DeleteFriendOutput = z.output<typeof DeleteFriendOutputSchema>

export const GetFriendRequestsInputSchema = z.object({
    /** 获取的最大请求数量，默认值 20 */
    limit: z.number().int().optional(),
    /** 默认值 false */
    is_filtered: z.boolean().optional(),
})
export const GetFriendRequestsOutputSchema = z.object({
    requests: z.array(FriendRequestSchema),
})
export type GetFriendRequestsInput = z.input<
    typeof GetFriendRequestsInputSchema
>
export type GetFriendRequestsOutput = z.output<
    typeof GetFriendRequestsOutputSchema
>

export const AcceptFriendRequestInputSchema = z.object({
    initiator_uid: z.string(),
    /** 默认值 false */
    is_filtered: z.boolean().optional(),
})
export const AcceptFriendRequestOutputSchema = MilkyEmptySchema
export type AcceptFriendRequestInput = z.input<
    typeof AcceptFriendRequestInputSchema
>
export type AcceptFriendRequestOutput = z.output<
    typeof AcceptFriendRequestOutputSchema
>

export const RejectFriendRequestInputSchema = z.object({
    initiator_uid: z.string(),
    /** 默认值 false */
    is_filtered: z.boolean().optional(),
    reason: z.string().optional(),
})
export const RejectFriendRequestOutputSchema = MilkyEmptySchema
export type RejectFriendRequestInput = z.input<
    typeof RejectFriendRequestInputSchema
>
export type RejectFriendRequestOutput = z.output<
    typeof RejectFriendRequestOutputSchema
>

// #endregion

// ---- 群聊 API -------------------------------------------------

export const SetGroupNameInputSchema = z.object({
    group_id: z.number().int(),
    new_group_name: z.string(),
})
export const SetGroupNameOutputSchema = MilkyEmptySchema
export type SetGroupNameInput = z.input<typeof SetGroupNameInputSchema>
export type SetGroupNameOutput = z.output<typeof SetGroupNameOutputSchema>

export const SetGroupAvatarInputSchema = z.object({
    group_id: z.number().int(),
    image_uri: z.string(),
})
export const SetGroupAvatarOutputSchema = MilkyEmptySchema
export type SetGroupAvatarInput = z.input<typeof SetGroupAvatarInputSchema>
export type SetGroupAvatarOutput = z.output<typeof SetGroupAvatarOutputSchema>

export const SetGroupMemberCardInputSchema = z.object({
    group_id: z.number().int(),
    user_id: z.number().int(),
    card: z.string(),
})
export const SetGroupMemberCardOutputSchema = MilkyEmptySchema
export type SetGroupMemberCardInput = z.input<
    typeof SetGroupMemberCardInputSchema
>
export type SetGroupMemberCardOutput = z.output<
    typeof SetGroupMemberCardOutputSchema
>

export const SetGroupMemberSpecialTitleInputSchema = z.object({
    group_id: z.number().int(),
    user_id: z.number().int(),
    special_title: z.string(),
})
export const SetGroupMemberSpecialTitleOutputSchema = MilkyEmptySchema
export type SetGroupMemberSpecialTitleInput = z.input<
    typeof SetGroupMemberSpecialTitleInputSchema
>
export type SetGroupMemberSpecialTitleOutput = z.output<
    typeof SetGroupMemberSpecialTitleOutputSchema
>

export const SetGroupMemberAdminInputSchema = z.object({
    group_id: z.number().int(),
    user_id: z.number().int(),
    /** 是否设置为管理员，false 表示取消，默认值 true */
    is_set: z.boolean().optional(),
})
export const SetGroupMemberAdminOutputSchema = MilkyEmptySchema
export type SetGroupMemberAdminInput = z.input<
    typeof SetGroupMemberAdminInputSchema
>
export type SetGroupMemberAdminOutput = z.output<
    typeof SetGroupMemberAdminOutputSchema
>

export const SetGroupMemberMuteInputSchema = z.object({
    group_id: z.number().int(),
    user_id: z.number().int(),
    /** 禁言持续时间（秒），设为 0 为取消禁言，默认值 0 */
    duration: z.number().int().optional(),
})
export const SetGroupMemberMuteOutputSchema = MilkyEmptySchema
export type SetGroupMemberMuteInput = z.input<
    typeof SetGroupMemberMuteInputSchema
>
export type SetGroupMemberMuteOutput = z.output<
    typeof SetGroupMemberMuteOutputSchema
>

export const SetGroupWholeMuteInputSchema = z.object({
    group_id: z.number().int(),
    /** 是否开启全员禁言，false 表示取消，默认值 true */
    is_mute: z.boolean().optional(),
})
export const SetGroupWholeMuteOutputSchema = MilkyEmptySchema
export type SetGroupWholeMuteInput = z.input<
    typeof SetGroupWholeMuteInputSchema
>
export type SetGroupWholeMuteOutput = z.output<
    typeof SetGroupWholeMuteOutputSchema
>

export const KickGroupMemberInputSchema = z.object({
    group_id: z.number().int(),
    user_id: z.number().int(),
    /** 是否拒绝加群申请，默认值 false */
    reject_add_request: z.boolean().optional(),
})
export const KickGroupMemberOutputSchema = MilkyEmptySchema
export type KickGroupMemberInput = z.input<typeof KickGroupMemberInputSchema>
export type KickGroupMemberOutput = z.output<
    typeof KickGroupMemberOutputSchema
>

export const GetGroupAnnouncementsInputSchema = z.object({
    group_id: z.number().int(),
})
export const GetGroupAnnouncementsOutputSchema = z.object({
    announcements: z.array(GroupAnnouncementEntitySchema),
})
export type GetGroupAnnouncementsInput = z.input<
    typeof GetGroupAnnouncementsInputSchema
>
export type GetGroupAnnouncementsOutput = z.output<
    typeof GetGroupAnnouncementsOutputSchema
>

export const SendGroupAnnouncementInputSchema = z.object({
    group_id: z.number().int(),
    content: z.string(),
    image_uri: z.string().optional(),
})
export const SendGroupAnnouncementOutputSchema = MilkyEmptySchema
export type SendGroupAnnouncementInput = z.input<
    typeof SendGroupAnnouncementInputSchema
>
export type SendGroupAnnouncementOutput = z.output<
    typeof SendGroupAnnouncementOutputSchema
>

export const DeleteGroupAnnouncementInputSchema = z.object({
    group_id: z.number().int(),
    announcement_id: z.string(),
})
export const DeleteGroupAnnouncementOutputSchema = MilkyEmptySchema
export type DeleteGroupAnnouncementInput = z.input<
    typeof DeleteGroupAnnouncementInputSchema
>
export type DeleteGroupAnnouncementOutput = z.output<
    typeof DeleteGroupAnnouncementOutputSchema
>

export const GetGroupEssenceMessagesInputSchema = z.object({
    group_id: z.number().int(),
    /** 页码索引，从 0 开始 */
    page_index: z.number().int(),
    /** 每页包含的精华消息数量 */
    page_size: z.number().int(),
})
export const GetGroupEssenceMessagesOutputSchema = z.object({
    messages: z.array(GroupEssenceMessageSchema),
    is_end: z.boolean(),
})
export type GetGroupEssenceMessagesInput = z.input<
    typeof GetGroupEssenceMessagesInputSchema
>
export type GetGroupEssenceMessagesOutput = z.output<
    typeof GetGroupEssenceMessagesOutputSchema
>

export const SetGroupEssenceMessageInputSchema = z.object({
    group_id: z.number().int(),
    message_seq: z.number().int(),
    /** 是否设置为精华消息，false 表示取消，默认值 true */
    is_set: z.boolean().optional(),
})
export const SetGroupEssenceMessageOutputSchema = MilkyEmptySchema
export type SetGroupEssenceMessageInput = z.input<
    typeof SetGroupEssenceMessageInputSchema
>
export type SetGroupEssenceMessageOutput = z.output<
    typeof SetGroupEssenceMessageOutputSchema
>

export const QuitGroupInputSchema = z.object({
    group_id: z.number().int(),
})
export const QuitGroupOutputSchema = MilkyEmptySchema
export type QuitGroupInput = z.input<typeof QuitGroupInputSchema>
export type QuitGroupOutput = z.output<typeof QuitGroupOutputSchema>

export const SendGroupMessageReactionInputSchema = z.object({
    group_id: z.number().int(),
    message_seq: z.number().int(),
    /** 发送的回应的表情 ID */
    reaction: z.string(),
    /** v1.2 新增：回应类型，默认值 face */
    reaction_type: MilkyReactionTypeSchema.optional(),
    /** 是否添加表情，false 表示取消，默认值 true */
    is_add: z.boolean().optional(),
})
export const SendGroupMessageReactionOutputSchema = MilkyEmptySchema
export type SendGroupMessageReactionInput = z.input<
    typeof SendGroupMessageReactionInputSchema
>
export type SendGroupMessageReactionOutput = z.output<
    typeof SendGroupMessageReactionOutputSchema
>

export const SendGroupNudgeInputSchema = z.object({
    group_id: z.number().int(),
    user_id: z.number().int(),
})
export const SendGroupNudgeOutputSchema = MilkyEmptySchema
export type SendGroupNudgeInput = z.input<typeof SendGroupNudgeInputSchema>
export type SendGroupNudgeOutput = z.output<typeof SendGroupNudgeOutputSchema>

export const GetGroupNotificationsInputSchema = z.object({
    start_notification_seq: z.number().int().optional(),
    /** 默认值 false */
    is_filtered: z.boolean().optional(),
    /** 获取的最大通知数量，默认值 20 */
    limit: z.number().int().optional(),
})
export const GetGroupNotificationsOutputSchema = z.object({
    notifications: z.array(GroupNotificationSchema),
    next_notification_seq: z.number().int().optional(),
})
export type GetGroupNotificationsInput = z.input<
    typeof GetGroupNotificationsInputSchema
>
export type GetGroupNotificationsOutput = z.output<
    typeof GetGroupNotificationsOutputSchema
>

export const AcceptGroupRequestInputSchema = z.object({
    notification_seq: z.number().int(),
    notification_type: MilkyGroupRequestTypeSchema,
    group_id: z.number().int(),
    /** 默认值 false */
    is_filtered: z.boolean().optional(),
})
export const AcceptGroupRequestOutputSchema = MilkyEmptySchema
export type AcceptGroupRequestInput = z.input<
    typeof AcceptGroupRequestInputSchema
>
export type AcceptGroupRequestOutput = z.output<
    typeof AcceptGroupRequestOutputSchema
>

export const RejectGroupRequestInputSchema = z.object({
    notification_seq: z.number().int(),
    notification_type: MilkyGroupRequestTypeSchema,
    group_id: z.number().int(),
    /** 默认值 false */
    is_filtered: z.boolean().optional(),
    reason: z.string().optional(),
})
export const RejectGroupRequestOutputSchema = MilkyEmptySchema
export type RejectGroupRequestInput = z.input<
    typeof RejectGroupRequestInputSchema
>
export type RejectGroupRequestOutput = z.output<
    typeof RejectGroupRequestOutputSchema
>

export const AcceptGroupInvitationInputSchema = z.object({
    group_id: z.number().int(),
    invitation_seq: z.number().int(),
})
export const AcceptGroupInvitationOutputSchema = MilkyEmptySchema
export type AcceptGroupInvitationInput = z.input<
    typeof AcceptGroupInvitationInputSchema
>
export type AcceptGroupInvitationOutput = z.output<
    typeof AcceptGroupInvitationOutputSchema
>

export const RejectGroupInvitationInputSchema = z.object({
    group_id: z.number().int(),
    invitation_seq: z.number().int(),
})
export const RejectGroupInvitationOutputSchema = MilkyEmptySchema
export type RejectGroupInvitationInput = z.input<
    typeof RejectGroupInvitationInputSchema
>
export type RejectGroupInvitationOutput = z.output<
    typeof RejectGroupInvitationOutputSchema
>

// ---- 文件 API -------------------------------------------------

export const UploadPrivateFileInputSchema = z.object({
    user_id: z.number().int(),
    file_uri: z.string(),
    file_name: z.string(),
})
export const UploadPrivateFileOutputSchema = z.object({
    file_id: z.string(),
})
export type UploadPrivateFileInput = z.input<
    typeof UploadPrivateFileInputSchema
>
export type UploadPrivateFileOutput = z.output<
    typeof UploadPrivateFileOutputSchema
>

export const UploadGroupFileInputSchema = z.object({
    group_id: z.number().int(),
    /** 目标文件夹 ID，默认值 `/` */
    parent_folder_id: z.string().optional(),
    file_uri: z.string(),
    file_name: z.string(),
})
export const UploadGroupFileOutputSchema = z.object({
    file_id: z.string(),
})
export type UploadGroupFileInput = z.input<typeof UploadGroupFileInputSchema>
export type UploadGroupFileOutput = z.output<
    typeof UploadGroupFileOutputSchema
>

export const GetPrivateFileDownloadUrlInputSchema = z.object({
    user_id: z.number().int(),
    file_id: z.string(),
    /** 文件的 TriSHA1 哈希值 */
    file_hash: z.string(),
    /** v1.3 新增：是否为自己发送的文件，默认值 false */
    is_self_send: z.boolean().optional(),
})
export const GetPrivateFileDownloadUrlOutputSchema = z.object({
    download_url: z.string(),
})
export type GetPrivateFileDownloadUrlInput = z.input<
    typeof GetPrivateFileDownloadUrlInputSchema
>
export type GetPrivateFileDownloadUrlOutput = z.output<
    typeof GetPrivateFileDownloadUrlOutputSchema
>

export const GetGroupFileDownloadUrlInputSchema = z.object({
    group_id: z.number().int(),
    file_id: z.string(),
})
export const GetGroupFileDownloadUrlOutputSchema = z.object({
    download_url: z.string(),
})
export type GetGroupFileDownloadUrlInput = z.input<
    typeof GetGroupFileDownloadUrlInputSchema
>
export type GetGroupFileDownloadUrlOutput = z.output<
    typeof GetGroupFileDownloadUrlOutputSchema
>

export const GetGroupFilesInputSchema = z.object({
    group_id: z.number().int(),
    /** 父文件夹 ID，默认值 `/` */
    parent_folder_id: z.string().optional(),
})
export const GetGroupFilesOutputSchema = z.object({
    files: z.array(GroupFileEntitySchema),
    folders: z.array(GroupFolderEntitySchema),
})
export type GetGroupFilesInput = z.input<typeof GetGroupFilesInputSchema>
export type GetGroupFilesOutput = z.output<typeof GetGroupFilesOutputSchema>

export const MoveGroupFileInputSchema = z.object({
    group_id: z.number().int(),
    file_id: z.string(),
    /** 文件所在的文件夹 ID，默认值 `/` */
    parent_folder_id: z.string().optional(),
    /** 目标文件夹 ID，默认值 `/` */
    target_folder_id: z.string().optional(),
})
export const MoveGroupFileOutputSchema = MilkyEmptySchema
export type MoveGroupFileInput = z.input<typeof MoveGroupFileInputSchema>
export type MoveGroupFileOutput = z.output<typeof MoveGroupFileOutputSchema>

export const RenameGroupFileInputSchema = z.object({
    group_id: z.number().int(),
    file_id: z.string(),
    /** 文件所在的文件夹 ID，默认值 `/` */
    parent_folder_id: z.string().optional(),
    new_file_name: z.string(),
})
export const RenameGroupFileOutputSchema = MilkyEmptySchema
export type RenameGroupFileInput = z.input<typeof RenameGroupFileInputSchema>
export type RenameGroupFileOutput = z.output<
    typeof RenameGroupFileOutputSchema
>

export const DeleteGroupFileInputSchema = z.object({
    group_id: z.number().int(),
    file_id: z.string(),
})
export const DeleteGroupFileOutputSchema = MilkyEmptySchema
export type DeleteGroupFileInput = z.input<typeof DeleteGroupFileInputSchema>
export type DeleteGroupFileOutput = z.output<
    typeof DeleteGroupFileOutputSchema
>

/** v1.3 新增 API */
export const PersistGroupFileInputSchema = z.object({
    group_id: z.number().int(),
    file_id: z.string(),
})
export const PersistGroupFileOutputSchema = MilkyEmptySchema
export type PersistGroupFileInput = z.input<typeof PersistGroupFileInputSchema>
export type PersistGroupFileOutput = z.output<
    typeof PersistGroupFileOutputSchema
>

export const CreateGroupFolderInputSchema = z.object({
    group_id: z.number().int(),
    folder_name: z.string(),
})
export const CreateGroupFolderOutputSchema = z.object({
    folder_id: z.string(),
})
export type CreateGroupFolderInput = z.input<
    typeof CreateGroupFolderInputSchema
>
export type CreateGroupFolderOutput = z.output<
    typeof CreateGroupFolderOutputSchema
>

export const RenameGroupFolderInputSchema = z.object({
    group_id: z.number().int(),
    folder_id: z.string(),
    new_folder_name: z.string(),
})
export const RenameGroupFolderOutputSchema = MilkyEmptySchema
export type RenameGroupFolderInput = z.input<
    typeof RenameGroupFolderInputSchema
>
export type RenameGroupFolderOutput = z.output<
    typeof RenameGroupFolderOutputSchema
>

export const DeleteGroupFolderInputSchema = z.object({
    group_id: z.number().int(),
    folder_id: z.string(),
})
export const DeleteGroupFolderOutputSchema = MilkyEmptySchema
export type DeleteGroupFolderInput = z.input<
    typeof DeleteGroupFolderInputSchema
>
export type DeleteGroupFolderOutput = z.output<
    typeof DeleteGroupFolderOutputSchema
>

// #endregion

// #region == API 名称映射与响应包络 =============================

/**
 * API 名称 → { input, output } 的类型映射表
 *
 * 适配器凭 `MilkyApiName` + `ApiInput<K>` / `ApiOutput<K>` 获得精确类型，
 * 无需在适配器内解包任何 zod 类型。
 */
export interface MilkyApiDefinitions {
    GetLoginInfo: { input: GetLoginInfoInput; output: GetLoginInfoOutput }
    GetImplInfo: { input: GetImplInfoInput; output: GetImplInfoOutput }
    GetUserProfile: {
        input: GetUserProfileInput
        output: GetUserProfileOutput
    }
    GetFriendList: { input: GetFriendListInput; output: GetFriendListOutput }
    GetFriendInfo: { input: GetFriendInfoInput; output: GetFriendInfoOutput }
    GetGroupList: { input: GetGroupListInput; output: GetGroupListOutput }
    GetGroupInfo: { input: GetGroupInfoInput; output: GetGroupInfoOutput }
    GetGroupMemberList: {
        input: GetGroupMemberListInput
        output: GetGroupMemberListOutput
    }
    GetGroupMemberInfo: {
        input: GetGroupMemberInfoInput
        output: GetGroupMemberInfoOutput
    }
    GetPeerPins: { input: GetPeerPinsInput; output: GetPeerPinsOutput }
    SetPeerPin: { input: SetPeerPinInput; output: SetPeerPinOutput }
    SetAvatar: { input: SetAvatarInput; output: SetAvatarOutput }
    SetNickname: { input: SetNicknameInput; output: SetNicknameOutput }
    SetBio: { input: SetBioInput; output: SetBioOutput }
    GetCustomFaceUrlList: {
        input: GetCustomFaceUrlListInput
        output: GetCustomFaceUrlListOutput
    }
    GetCookies: { input: GetCookiesInput; output: GetCookiesOutput }
    GetCsrfToken: { input: GetCsrfTokenInput; output: GetCsrfTokenOutput }
    SendPrivateMessage: {
        input: SendPrivateMessageInput
        output: SendPrivateMessageOutput
    }
    SendGroupMessage: {
        input: SendGroupMessageInput
        output: SendGroupMessageOutput
    }
    RecallPrivateMessage: {
        input: RecallPrivateMessageInput
        output: RecallPrivateMessageOutput
    }
    RecallGroupMessage: {
        input: RecallGroupMessageInput
        output: RecallGroupMessageOutput
    }
    GetMessage: { input: GetMessageInput; output: GetMessageOutput }
    GetHistoryMessages: {
        input: GetHistoryMessagesInput
        output: GetHistoryMessagesOutput
    }
    GetResourceTempUrl: {
        input: GetResourceTempUrlInput
        output: GetResourceTempUrlOutput
    }
    GetForwardedMessages: {
        input: GetForwardedMessagesInput
        output: GetForwardedMessagesOutput
    }
    MarkMessageAsRead: {
        input: MarkMessageAsReadInput
        output: MarkMessageAsReadOutput
    }
    SendFriendNudge: {
        input: SendFriendNudgeInput
        output: SendFriendNudgeOutput
    }
    SendProfileLike: {
        input: SendProfileLikeInput
        output: SendProfileLikeOutput
    }
    DeleteFriend: { input: DeleteFriendInput; output: DeleteFriendOutput }
    GetFriendRequests: {
        input: GetFriendRequestsInput
        output: GetFriendRequestsOutput
    }
    AcceptFriendRequest: {
        input: AcceptFriendRequestInput
        output: AcceptFriendRequestOutput
    }
    RejectFriendRequest: {
        input: RejectFriendRequestInput
        output: RejectFriendRequestOutput
    }
    SetGroupName: { input: SetGroupNameInput; output: SetGroupNameOutput }
    SetGroupAvatar: { input: SetGroupAvatarInput; output: SetGroupAvatarOutput }
    SetGroupMemberCard: {
        input: SetGroupMemberCardInput
        output: SetGroupMemberCardOutput
    }
    SetGroupMemberSpecialTitle: {
        input: SetGroupMemberSpecialTitleInput
        output: SetGroupMemberSpecialTitleOutput
    }
    SetGroupMemberAdmin: {
        input: SetGroupMemberAdminInput
        output: SetGroupMemberAdminOutput
    }
    SetGroupMemberMute: {
        input: SetGroupMemberMuteInput
        output: SetGroupMemberMuteOutput
    }
    SetGroupWholeMute: {
        input: SetGroupWholeMuteInput
        output: SetGroupWholeMuteOutput
    }
    KickGroupMember: {
        input: KickGroupMemberInput
        output: KickGroupMemberOutput
    }
    GetGroupAnnouncements: {
        input: GetGroupAnnouncementsInput
        output: GetGroupAnnouncementsOutput
    }
    SendGroupAnnouncement: {
        input: SendGroupAnnouncementInput
        output: SendGroupAnnouncementOutput
    }
    DeleteGroupAnnouncement: {
        input: DeleteGroupAnnouncementInput
        output: DeleteGroupAnnouncementOutput
    }
    GetGroupEssenceMessages: {
        input: GetGroupEssenceMessagesInput
        output: GetGroupEssenceMessagesOutput
    }
    SetGroupEssenceMessage: {
        input: SetGroupEssenceMessageInput
        output: SetGroupEssenceMessageOutput
    }
    QuitGroup: { input: QuitGroupInput; output: QuitGroupOutput }
    SendGroupMessageReaction: {
        input: SendGroupMessageReactionInput
        output: SendGroupMessageReactionOutput
    }
    SendGroupNudge: { input: SendGroupNudgeInput; output: SendGroupNudgeOutput }
    GetGroupNotifications: {
        input: GetGroupNotificationsInput
        output: GetGroupNotificationsOutput
    }
    AcceptGroupRequest: {
        input: AcceptGroupRequestInput
        output: AcceptGroupRequestOutput
    }
    RejectGroupRequest: {
        input: RejectGroupRequestInput
        output: RejectGroupRequestOutput
    }
    AcceptGroupInvitation: {
        input: AcceptGroupInvitationInput
        output: AcceptGroupInvitationOutput
    }
    RejectGroupInvitation: {
        input: RejectGroupInvitationInput
        output: RejectGroupInvitationOutput
    }
    UploadPrivateFile: {
        input: UploadPrivateFileInput
        output: UploadPrivateFileOutput
    }
    UploadGroupFile: {
        input: UploadGroupFileInput
        output: UploadGroupFileOutput
    }
    GetPrivateFileDownloadUrl: {
        input: GetPrivateFileDownloadUrlInput
        output: GetPrivateFileDownloadUrlOutput
    }
    GetGroupFileDownloadUrl: {
        input: GetGroupFileDownloadUrlInput
        output: GetGroupFileDownloadUrlOutput
    }
    GetGroupFiles: { input: GetGroupFilesInput; output: GetGroupFilesOutput }
    MoveGroupFile: { input: MoveGroupFileInput; output: MoveGroupFileOutput }
    RenameGroupFile: {
        input: RenameGroupFileInput
        output: RenameGroupFileOutput
    }
    DeleteGroupFile: {
        input: DeleteGroupFileInput
        output: DeleteGroupFileOutput
    }
    PersistGroupFile: {
        input: PersistGroupFileInput
        output: PersistGroupFileOutput
    }
    CreateGroupFolder: {
        input: CreateGroupFolderInput
        output: CreateGroupFolderOutput
    }
    RenameGroupFolder: {
        input: RenameGroupFolderInput
        output: RenameGroupFolderOutput
    }
    DeleteGroupFolder: {
        input: DeleteGroupFolderInput
        output: DeleteGroupFolderOutput
    }
}

/** 全部可用的 API 名称（PascalCase，与 callApi 传入值一致） */
export type MilkyApiName = keyof MilkyApiDefinitions

/** 按 API 名称取输入类型 */
export type ApiInput<K extends MilkyApiName> = MilkyApiDefinitions[K]['input']

/** 按 API 名称取输出类型 */
export type ApiOutput<K extends MilkyApiName> = MilkyApiDefinitions[K]['output']

/** 成功响应包络 */
export interface MilkyOkResponse<T> {
    status: 'ok'
    retcode: 0
    data: T
}

/** 失败响应包络 */
export interface MilkyErrorResponse {
    status: 'failed'
    retcode: number
    message: string
}

/** 响应包络 */
export type MilkyResponse<T> = MilkyOkResponse<T> | MilkyErrorResponse

/**
 * API 名称 → { inputSchema, outputSchema } 的运行时 schema 表
 *
 * 适配器 `callApi` 按名称取用，对入参做清洗、对出参做校验，
 * 因此适配器内部完全不需要出现 `z.` 或任何类型解包。
 */
export const MilkyApiSchemas = {
    GetLoginInfo: {
        input: GetLoginInfoInputSchema,
        output: GetLoginInfoOutputSchema,
    },
    GetImplInfo: {
        input: GetImplInfoInputSchema,
        output: GetImplInfoOutputSchema,
    },
    GetUserProfile: {
        input: GetUserProfileInputSchema,
        output: GetUserProfileOutputSchema,
    },
    GetFriendList: {
        input: GetFriendListInputSchema,
        output: GetFriendListOutputSchema,
    },
    GetFriendInfo: {
        input: GetFriendInfoInputSchema,
        output: GetFriendInfoOutputSchema,
    },
    GetGroupList: {
        input: GetGroupListInputSchema,
        output: GetGroupListOutputSchema,
    },
    GetGroupInfo: {
        input: GetGroupInfoInputSchema,
        output: GetGroupInfoOutputSchema,
    },
    GetGroupMemberList: {
        input: GetGroupMemberListInputSchema,
        output: GetGroupMemberListOutputSchema,
    },
    GetGroupMemberInfo: {
        input: GetGroupMemberInfoInputSchema,
        output: GetGroupMemberInfoOutputSchema,
    },
    GetPeerPins: {
        input: GetPeerPinsInputSchema,
        output: GetPeerPinsOutputSchema,
    },
    SetPeerPin: {
        input: SetPeerPinInputSchema,
        output: SetPeerPinOutputSchema,
    },
    SetAvatar: { input: SetAvatarInputSchema, output: SetAvatarOutputSchema },
    SetNickname: {
        input: SetNicknameInputSchema,
        output: SetNicknameOutputSchema,
    },
    SetBio: { input: SetBioInputSchema, output: SetBioOutputSchema },
    GetCustomFaceUrlList: {
        input: GetCustomFaceUrlListInputSchema,
        output: GetCustomFaceUrlListOutputSchema,
    },
    GetCookies: {
        input: GetCookiesInputSchema,
        output: GetCookiesOutputSchema,
    },
    GetCsrfToken: {
        input: GetCsrfTokenInputSchema,
        output: GetCsrfTokenOutputSchema,
    },
    SendPrivateMessage: {
        input: SendPrivateMessageInputSchema,
        output: SendPrivateMessageOutputSchema,
    },
    SendGroupMessage: {
        input: SendGroupMessageInputSchema,
        output: SendGroupMessageOutputSchema,
    },
    RecallPrivateMessage: {
        input: RecallPrivateMessageInputSchema,
        output: RecallPrivateMessageOutputSchema,
    },
    RecallGroupMessage: {
        input: RecallGroupMessageInputSchema,
        output: RecallGroupMessageOutputSchema,
    },
    GetMessage: {
        input: GetMessageInputSchema,
        output: GetMessageOutputSchema,
    },
    GetHistoryMessages: {
        input: GetHistoryMessagesInputSchema,
        output: GetHistoryMessagesOutputSchema,
    },
    GetResourceTempUrl: {
        input: GetResourceTempUrlInputSchema,
        output: GetResourceTempUrlOutputSchema,
    },
    GetForwardedMessages: {
        input: GetForwardedMessagesInputSchema,
        output: GetForwardedMessagesOutputSchema,
    },
    MarkMessageAsRead: {
        input: MarkMessageAsReadInputSchema,
        output: MarkMessageAsReadOutputSchema,
    },
    SendFriendNudge: {
        input: SendFriendNudgeInputSchema,
        output: SendFriendNudgeOutputSchema,
    },
    SendProfileLike: {
        input: SendProfileLikeInputSchema,
        output: SendProfileLikeOutputSchema,
    },
    DeleteFriend: {
        input: DeleteFriendInputSchema,
        output: DeleteFriendOutputSchema,
    },
    GetFriendRequests: {
        input: GetFriendRequestsInputSchema,
        output: GetFriendRequestsOutputSchema,
    },
    AcceptFriendRequest: {
        input: AcceptFriendRequestInputSchema,
        output: AcceptFriendRequestOutputSchema,
    },
    RejectFriendRequest: {
        input: RejectFriendRequestInputSchema,
        output: RejectFriendRequestOutputSchema,
    },
    SetGroupName: {
        input: SetGroupNameInputSchema,
        output: SetGroupNameOutputSchema,
    },
    SetGroupAvatar: {
        input: SetGroupAvatarInputSchema,
        output: SetGroupAvatarOutputSchema,
    },
    SetGroupMemberCard: {
        input: SetGroupMemberCardInputSchema,
        output: SetGroupMemberCardOutputSchema,
    },
    SetGroupMemberSpecialTitle: {
        input: SetGroupMemberSpecialTitleInputSchema,
        output: SetGroupMemberSpecialTitleOutputSchema,
    },
    SetGroupMemberAdmin: {
        input: SetGroupMemberAdminInputSchema,
        output: SetGroupMemberAdminOutputSchema,
    },
    SetGroupMemberMute: {
        input: SetGroupMemberMuteInputSchema,
        output: SetGroupMemberMuteOutputSchema,
    },
    SetGroupWholeMute: {
        input: SetGroupWholeMuteInputSchema,
        output: SetGroupWholeMuteOutputSchema,
    },
    KickGroupMember: {
        input: KickGroupMemberInputSchema,
        output: KickGroupMemberOutputSchema,
    },
    GetGroupAnnouncements: {
        input: GetGroupAnnouncementsInputSchema,
        output: GetGroupAnnouncementsOutputSchema,
    },
    SendGroupAnnouncement: {
        input: SendGroupAnnouncementInputSchema,
        output: SendGroupAnnouncementOutputSchema,
    },
    DeleteGroupAnnouncement: {
        input: DeleteGroupAnnouncementInputSchema,
        output: DeleteGroupAnnouncementOutputSchema,
    },
    GetGroupEssenceMessages: {
        input: GetGroupEssenceMessagesInputSchema,
        output: GetGroupEssenceMessagesOutputSchema,
    },
    SetGroupEssenceMessage: {
        input: SetGroupEssenceMessageInputSchema,
        output: SetGroupEssenceMessageOutputSchema,
    },
    QuitGroup: { input: QuitGroupInputSchema, output: QuitGroupOutputSchema },
    SendGroupMessageReaction: {
        input: SendGroupMessageReactionInputSchema,
        output: SendGroupMessageReactionOutputSchema,
    },
    SendGroupNudge: {
        input: SendGroupNudgeInputSchema,
        output: SendGroupNudgeOutputSchema,
    },
    GetGroupNotifications: {
        input: GetGroupNotificationsInputSchema,
        output: GetGroupNotificationsOutputSchema,
    },
    AcceptGroupRequest: {
        input: AcceptGroupRequestInputSchema,
        output: AcceptGroupRequestOutputSchema,
    },
    RejectGroupRequest: {
        input: RejectGroupRequestInputSchema,
        output: RejectGroupRequestOutputSchema,
    },
    AcceptGroupInvitation: {
        input: AcceptGroupInvitationInputSchema,
        output: AcceptGroupInvitationOutputSchema,
    },
    RejectGroupInvitation: {
        input: RejectGroupInvitationInputSchema,
        output: RejectGroupInvitationOutputSchema,
    },
    UploadPrivateFile: {
        input: UploadPrivateFileInputSchema,
        output: UploadPrivateFileOutputSchema,
    },
    UploadGroupFile: {
        input: UploadGroupFileInputSchema,
        output: UploadGroupFileOutputSchema,
    },
    GetPrivateFileDownloadUrl: {
        input: GetPrivateFileDownloadUrlInputSchema,
        output: GetPrivateFileDownloadUrlOutputSchema,
    },
    GetGroupFileDownloadUrl: {
        input: GetGroupFileDownloadUrlInputSchema,
        output: GetGroupFileDownloadUrlOutputSchema,
    },
    GetGroupFiles: {
        input: GetGroupFilesInputSchema,
        output: GetGroupFilesOutputSchema,
    },
    MoveGroupFile: {
        input: MoveGroupFileInputSchema,
        output: MoveGroupFileOutputSchema,
    },
    RenameGroupFile: {
        input: RenameGroupFileInputSchema,
        output: RenameGroupFileOutputSchema,
    },
    DeleteGroupFile: {
        input: DeleteGroupFileInputSchema,
        output: DeleteGroupFileOutputSchema,
    },
    PersistGroupFile: {
        input: PersistGroupFileInputSchema,
        output: PersistGroupFileOutputSchema,
    },
    CreateGroupFolder: {
        input: CreateGroupFolderInputSchema,
        output: CreateGroupFolderOutputSchema,
    },
    RenameGroupFolder: {
        input: RenameGroupFolderInputSchema,
        output: RenameGroupFolderOutputSchema,
    },
    DeleteGroupFolder: {
        input: DeleteGroupFolderInputSchema,
        output: DeleteGroupFolderOutputSchema,
    },
} as const satisfies Record<
    MilkyApiName,
    { input: z.ZodType; output: z.ZodType }
>

// #endregion

// #region == 解析入口（适配器唯一依赖的运行时 API）==============

/** 解析一条入站消息（含全部消息段） */
export function parseIncomingMessage(value: unknown): IncomingMessage {
    return IncomingMessageSchema.parse(value) as IncomingMessage
}

/** 解析一条入站消息，失败返回 undefined（事件容错） */
export function safeParseIncomingMessage(
    value: unknown,
): IncomingMessage | undefined {
    const re = IncomingMessageSchema.safeParse(value)
    return re.success ? (re.data as IncomingMessage) : undefined
}

/** 解析一条入站消息段 */
export function parseIncomingSegment(value: unknown): IncomingSegment {
    return IncomingSegmentSchema.parse(value) as IncomingSegment
}

/** 解析一条出站消息段（发送前校验） */
export function parseOutgoingSegment(value: unknown): OutgoingSegment {
    return OutgoingSegmentSchema.parse(value) as OutgoingSegment
}

/** 解析一组出站消息段（发送前校验） */
export function parseOutgoingSegments(value: unknown): OutgoingSegment[] {
    return z.array(OutgoingSegmentSchema).parse(value) as OutgoingSegment[]
}

/** 解析一条接收转发消息节点 */
export function parseIncomingForwardedMessage(
    value: unknown,
): IncomingForwardedMessage {
    return IncomingForwardedMessageSchema.parse(
        value,
    ) as IncomingForwardedMessage
}

/** 解析事件包络（含 event_type 判别） */
export function parseEvent(value: unknown): MilkyEvent {
    return MilkyEventSchema.parse(value) as MilkyEvent
}

/** 解析事件包络，失败返回 undefined（未知事件类型不再抛错） */
export function safeParseEvent(value: unknown): MilkyEvent | undefined {
    const re = MilkyEventSchema.safeParse(value)
    return re.success ? (re.data as MilkyEvent) : undefined
}

/**
 * 解析 API 入参
 * @param apiName API 名称（PascalCase）
 * @param args 调用方传入的参数
 * @returns 校验/清洗后的参数
 */
export function parseApiInput<K extends MilkyApiName>(
    apiName: K,
    args: ApiInput<K>,
): ApiInput<K> {
    const schema = MilkyApiSchemas[apiName].input
    return schema.parse(args) as ApiInput<K>
}

/**
 * 解析 API 出参
 * @param apiName API 名称（PascalCase）
 * @param data 协议端返回的 data 字段
 * @returns 校验后的出参
 */
export function parseApiOutput<K extends MilkyApiName>(
    apiName: K,
    data: unknown,
): ApiOutput<K> {
    const schema = MilkyApiSchemas[apiName].output
    return schema.parse(data) as ApiOutput<K>
}

// #endregion
