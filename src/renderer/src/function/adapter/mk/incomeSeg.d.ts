import type {
    IncomingMarkdownSeg,
    IncomingSegment,
    IncomingSegmentV1,
} from './types'

// 具体的接收消息段类型（1.3.0 当前形态）
export type TextSeg = Extract<IncomingSegment, { type: 'text' }>
export type MentionSeg = Extract<IncomingSegment, { type: 'mention' }>
export type MentionAllSeg = Extract<IncomingSegment, { type: 'mention_all' }>
export type FaceSeg = Extract<IncomingSegment, { type: 'face' }>
export type ReplySeg = Extract<IncomingSegment, { type: 'reply' }>
export type ImageSeg = Extract<IncomingSegment, { type: 'image' }>
export type RecordSeg = Extract<IncomingSegment, { type: 'record' }>
export type VideoSeg = Extract<IncomingSegment, { type: 'video' }>
export type ForwardSeg = Extract<IncomingSegment, { type: 'forward' }>
export type MarketFaceSeg = Extract<IncomingSegment, { type: 'market_face' }>
export type LightAppSeg = Extract<IncomingSegment, { type: 'light_app' }>
export type XmlSeg = Extract<IncomingSegment, { type: 'xml' }>
export type FileSeg = Extract<IncomingSegment, { type: 'file' }>
export type MarkdownSeg = IncomingMarkdownSeg

// 低版本协议端（1.0.x）旧形态，仅用于类型收窄
export type MentionSegV1 = Extract<IncomingSegmentV1, { type: 'mention' }>
export type FaceSegV1 = Extract<IncomingSegmentV1, { type: 'face' }>
export type ReplySegV1 = Extract<IncomingSegmentV1, { type: 'reply' }>
export type ForwardSegV1 = Extract<IncomingSegmentV1, { type: 'forward' }>
export type MarketFaceSegV1 = Extract<
    IncomingSegmentV1,
    { type: 'market_face' }
>
