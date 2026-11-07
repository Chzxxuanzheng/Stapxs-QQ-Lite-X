import type {
	OutgoingSegment,
	OutgoingSegmentV1,
} from '@renderer/function/adapter/mk/types'

// 具体的发送消息段类型
export type TextSeg = Extract<OutgoingSegment, { type: 'text' }>
export type MentionSeg = Extract<OutgoingSegment, { type: 'mention' }>
export type MentionAllSeg = Extract<OutgoingSegment, { type: 'mention_all' }>
export type FaceSeg = Extract<OutgoingSegment, { type: 'face' }>
export type ReplySeg = Extract<OutgoingSegment, { type: 'reply' }>
export type ImageSeg = Extract<OutgoingSegment, { type: 'image' }>
export type RecordSeg = Extract<OutgoingSegment, { type: 'record' }>
export type VideoSeg = Extract<OutgoingSegment, { type: 'video' }>
export type ForwardSeg = Extract<OutgoingSegment, { type: 'forward' }>
export type LightAppSeg = Extract<OutgoingSegment, { type: 'light_app' }>

/**
 * 1.3.0 的出站消息段中没有 market_face 与 xml 变体，
 * 这两个别名保留为 never，用于承载“不支持发送”的序列化器返回类型。
 */
export type MarketFaceSeg = Extract<OutgoingSegment, { type: 'market_face' }>
export type XmlSeg = Extract<OutgoingSegment, { type: 'xml' }>

// 低版本协议端（1.0.x）旧形态，仅用于类型收窄
export type FaceSegV1 = Extract<OutgoingSegmentV1, { type: 'face' }>
export type ForwardSegV1 = Extract<OutgoingSegmentV1, { type: 'forward' }>
