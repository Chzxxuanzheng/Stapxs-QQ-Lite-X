<!--
 * @FileDescription: 消息模板
 * @Author: Stapxs
 * @Date:
 *      2022/08/03
 *      2022/12/12
 * @Version:
 *      1.0 - 初始版本
 *      1.5 - 重构为 ts 版本，代码格式优化
-->

<template>
    <div
        :id="'chat-' + data.uuid"
        ref="msgMain"
        :class="{
            message: true,
            left: direction === 'left',
            right: direction === 'right',
            selected: selected,
            'without-avatar': withoutAvatar,
        }"
    >
        <img
            v-if="direction === 'left'"
            v-hide="!showAvatar"
            v-user-tooltip="() => data.sender"
            v-menu.prevent="
                (event) => $emit('showUserMenu', event, data.sender)
            "
            class="avatar"
            :src="data.sender.face"
            :alt="data.sender.name"
            @dblclick="$emit('senderDoubleClick', data.sender)"
        />
        <div v-if="direction === 'right'" class="message-space" />
        <div
            :class="{
                'message-body': true,
                special: special,
                'hide-face': !showAvatar,
            }"
        >
            <div class="message-info">
                <!-- 一帮头衔之类的 -->
                <template v-if="data.sender instanceof Member && showAvatar">
                    <span v-user-role="data.sender.role">
                        <template v-if="data.sender.role === Role.Bot">
                            <font-awesome-icon :icon="['fas', 'robot']" />
                        </template>
                        <template v-if="data.sender.level">
                            {{ 'Lv.' + data.sender.level }}
                        </template>
                        <template v-if="data.sender.title">
                            {{
                                data.sender.title.replace(
                                    /[\u202A-\u202E\u2066-\u2069]/g,
                                    '',
                                )
                            }}
                        </template>
                    </span>
                </template>
                <a v-if="showAvatar" class="sender-name">
                    {{ data.sender.name }}
                </a>
            </div>
            <div class="message-content">
                <div
                    v-if="data.icon && showIcon && direction === 'right'"
                    :class="{
                        rotate: data.icon.rotate,
                        icon: true,
                        left: true,
                    }"
                >
                    <div @click="data.iconClick">
                        <font-awesome-icon
                            :style="{ color: data.icon.color }"
                            :title="data.icon.desc"
                            :aria-label="data.icon.desc"
                            :icon="['fas', data.icon.icon]"
                        />
                    </div>
                </div>
                <div
                    v-menu.prevent="
                        (event) => $emit('showMsgMenu', event, data)
                    "
                    v-move="moveOptions"
                    :class="{
                        main: true,
                        'not-exist': !data.exist && dimNonExistentMsg,
                    }"
                    @v-move-left.prevent="$emit('leftMove', data)"
                    @v-move-right.prevent="$emit('rightMove', data)"
                >
                    <!-- 消息体 -->
                    <template v-if="msgSpeicalType === 'space'">
                        <span class="msg-text" style="opacity: 0.5">{{
                            $t('空消息')
                        }}</span>
                    </template>
                    <!-- 超级表情 -->
                    <template v-else-if="msgSpeicalType === 'super-face'">
                        <div class="msg-super-face" style="--height: 35vh">
                            <LazyLottie
                                :animation-link="
                                    (data.message[0] as FaceSeg).face!
                                        .superValue!
                                "
                                :title="
                                    (data.message[0] as FaceSeg).face!
                                        .description
                                "
                            />
                        </div>
                    </template>
                    <!-- 卡片消息 -->
                    <template v-else-if="msgSpeicalType === 'json'">
                        <JsonSegComp :seg="data.message[0] as JsonSeg" />
                    </template>
                    <template v-else-if="msgSpeicalType === 'xml'">
                        <XmlSegComp :seg="data.message[0] as XmlSeg" />
                    </template>
                    <!-- 常规消息 -->
                    <template v-else>
                        <div
                            v-for="(item, index) in data.message"
                            :key="data.uuid + '-m-' + index"
                            :class="{
                                'msg-inline': View.isMsgInline(item.type),
                            }"
                        >
                            <div v-if="item.type === undefined" />
                            <span v-else-if="isDebugMsg" class="msg-text">
                                {{ item }}
                            </span>
                            <template v-else-if="item instanceof TxtSeg">
                                <div
                                    v-if="hasMarkdown()"
                                    class="msg-md-title"
                                />
                                <span
                                    v-else
                                    v-show="item.praseMsg !== ''"
                                    class="msg-text"
                                    @click="textClick"
                                    v-html="item.praseMsg"
                                />
                            </template>
                            <div
                                v-else-if="item instanceof MdSeg"
                                v-once
                                :id="
                                    getMdHTML(
                                        item.content,
                                        'msg-md-' + data.uuid,
                                    )
                                "
                                class="msg-md"
                            />
                            <ImgSegComp
                                v-else-if="
                                    item instanceof MfaceSeg ||
                                    item instanceof ImgSeg
                                "
                                :pos="getSegPos(item)"
                                :seg="item"
                            />
                            <template v-else-if="item instanceof FaceSeg">
                                <EmojiFace
                                    :emoji="item.face"
                                    class="msg-face"
                                />
                            </template>
                            <template v-else-if="item instanceof AtSeg">
                                <a
                                    v-user-tooltip="
                                        () => getAtMember(item.user_id)
                                    "
                                    :class="{
                                        'msg-at': true,
                                        atme:
                                            item.user_id ===
                                                runtimeData.loginInfo?.uin &&
                                            showToMe,
                                    }"
                                >
                                    {{ item.plaintext(data) }}
                                </a>
                            </template>
                            <template v-else-if="item instanceof AtAllSeg">
                                <a
                                    :class="{
                                        'msg-at': true,
                                        atme: showToMe,
                                    }"
                                >
                                    @{{ $t('全体成员') }}
                                </a>
                            </template>
                            <div
                                v-else-if="item instanceof FileSeg"
                                class="msg-file"
                            >
                                <div>
                                    <div>
                                        <a>
                                            <font-awesome-icon
                                                :icon="['fas', 'file']"
                                            />
                                            {{
                                                data.session?.type == 'group'
                                                    ? $t('群文件')
                                                    : $t('离线文件')
                                            }}
                                        </a>
                                        <p>{{ item.name }}</p>
                                    </div>
                                    <i>{{ item.formatSize }}</i>
                                </div>
                                <div>
                                    <font-awesome-icon
                                        v-if="
                                            item.download_percent === undefined
                                        "
                                        :icon="['fas', 'angle-down']"
                                        @click="item.download()"
                                    />
                                    <svg
                                        v-else-if="
                                            item.download_percent !==
                                                undefined &&
                                            item.download_percent < 100
                                        "
                                        class="download-bar"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <circle
                                            cx="50%"
                                            cy="50%"
                                            r="40%"
                                            stroke-width="15%"
                                            ill="none"
                                            stroke-linecap="round"
                                        />
                                        <circle
                                            cx="50%"
                                            cy="50%"
                                            r="40%"
                                            stroke-width="15%"
                                            fill="none"
                                            :stroke-dasharray="
                                                item.download_percent ===
                                                undefined
                                                    ? '0,10000'
                                                    : `${(Math.floor(2 * Math.PI * 25) * item.download_percent) / 100},10000`
                                            "
                                        />
                                    </svg>
                                    <font-awesome-icon
                                        v-else
                                        :icon="['fas', 'check']"
                                    />
                                </div>
                                <div v-if="item.fileView" class="file-view">
                                    <img
                                        v-if="
                                            [
                                                'jpg',
                                                'jpeg',
                                                'png',
                                                'gif',
                                                'bmp',
                                                'webp',
                                            ].includes(item.fileView.ext)
                                        "
                                        :alt="item.name"
                                        :src="item.fileView.url"
                                    />
                                    <video
                                        v-else-if="
                                            [
                                                'mp4',
                                                'avi',
                                                'mkv',
                                                'flv',
                                            ].includes(item.fileView.ext)
                                        "
                                        playsinline
                                        controls
                                        muted
                                        autoplay
                                    >
                                        <source
                                            :src="item.fileView.url"
                                            :type="'video/' + item.fileView.ext"
                                        />
                                        现在还有不支持 video tag 的浏览器吗？
                                    </video>
                                    <span
                                        v-else-if="
                                            ['txt', 'md'].includes(
                                                item.fileView.ext,
                                            ) &&
                                            item.size &&
                                            item.size < 2000000
                                        "
                                        class="txt"
                                    >
                                        <a
                                            >&gt; {{ item.name }} -
                                            {{ $t('文件预览') }}</a
                                        >
                                        {{ getTxtUrl(item.fileView)
                                        }}{{ item.fileView.txt }}
                                    </span>
                                </div>
                            </div>
                            <div
                                v-else-if="item instanceof VideoSeg"
                                class="msg-video"
                            >
                                <video playsinline controls muted autoplay>
                                    <source :src="item.url" type="video/mp4" />
                                    现在还有不支持 video tag 的浏览器吗？
                                </video>
                            </div>
                            <template v-else-if="item instanceof ForwardSeg">
                                <div
                                    v-tooltip="
                                        msgPrevTooltip(
                                            item.content ?? $t('加载消息中...'),
                                        )
                                    "
                                    class="msg-raw-forward"
                                    @click="openMerge(item)"
                                >
                                    <span>{{ $t('合并转发消息') }}</span>
                                    <div class="forward-msg">
                                        <div v-if="!item.content">
                                            <div
                                                class="loading"
                                                style="opacity: 0.9"
                                            >
                                                <font-awesome-icon
                                                    :icon="['fas', 'spinner']"
                                                />
                                                {{ $t('加载中') }}
                                            </div>
                                        </div>
                                        <div v-else-if="!item.id">
                                            <div
                                                class="loading"
                                                style="opacity: 0.9"
                                            >
                                                <font-awesome-icon
                                                    :icon="['fas', 'spinner']"
                                                />
                                                {{ $t('发送中') }}
                                            </div>
                                        </div>
                                        <div
                                            v-for="(
                                                i, indexItem
                                            ) in item.content.slice(0, 3)"
                                            v-else-if="item.content.length > 0"
                                            :key="'raw-forward-' + indexItem"
                                        >
                                            {{ i.sender.name }}:
                                            <span
                                                :key="
                                                    'raw-forward-item-' + i.uuid
                                                "
                                            >
                                                {{ i.plaintext() }}
                                            </span>
                                        </div>
                                        <div v-else>
                                            {{ $t('加载失败') }}
                                        </div>
                                    </div>
                                    <div>
                                        <span v-if="item.content !== undefined">
                                            {{
                                                $t('查看 {count} 条转发消息', {
                                                    count: item.content.length,
                                                })
                                            }}
                                        </span>
                                        <span v-else>
                                            {{ $t('聊天记录') }}
                                        </span>
                                    </div>
                                </div>
                            </template>
                            <div
                                v-else-if="item instanceof ReplySeg"
                                v-tooltip="
                                    msgPrevTooltip(
                                        data.session?.getMsgById(item.id)
                                            ? [
                                                  data.session!.getMsgById(
                                                      item.id,
                                                  )!,
                                              ]
                                            : $t('加载消息失败'),
                                    )
                                "
                                class="msg-reply"
                                @click="scrollToMsg(item.id)"
                            >
                                <font-awesome-icon :icon="['fas', 'reply']" />
                                <a
                                    :class="
                                        getRepMsg(item.id) ? '' : 'msg-unknown'
                                    "
                                    style="cursor: pointer"
                                >
                                    {{
                                        getRepMsg(item.id) ??
                                        $t('（查看回复消息）')
                                    }}
                                </a>
                            </div>
                            <div
                                v-else-if="item.type == 'poke'"
                                v-once
                                :class="showPock()"
                            >
                                <font-awesome-icon
                                    class="poke-hand"
                                    style="margin-right: 5px"
                                    :icon="['fas', 'fa-hand-point-up']"
                                />
                                {{ $t('戳了戳你') }}
                            </div>
                            <div
                                v-else-if="item instanceof ErrorSeg"
                                class="msg-unknown"
                            >
                                ( {{ $t('加载失败') }} )
                            </div>
                            <span v-else class="msg-unknown">{{
                                '( ' +
                                $t('不支持的消息') +
                                ': ' +
                                item.type +
                                ' )'
                            }}</span>
                        </div>
                    </template>
                    <!-- 链接预览框 -->
                    <div
                        v-if="
                            pageViewInfo !== undefined &&
                            Object.keys(pageViewInfo).length > 0
                        "
                        :class="'msg-link-view ' + linkViewStyle"
                    >
                        <template v-if="pageViewInfo.type == undefined">
                            <div class="bar" />
                            <div>
                                <img
                                    v-if="pageViewInfo.img !== undefined"
                                    :id="data.uuid + '-linkview-img'"
                                    alt="预览图片"
                                    title="查看图片"
                                    :src="pageViewInfo.img"
                                    @click="imgClick(pageViewInfo.img)"
                                    @load="linkViewPicFin"
                                    @error="linkViewPicErr"
                                />
                                <div class="body">
                                    <p v-show="pageViewInfo.site">
                                        {{ pageViewInfo.site }}
                                    </p>
                                    <span :href="pageViewInfo.url">{{
                                        pageViewInfo.title
                                    }}</span>
                                    <span>{{ pageViewInfo.desc }}</span>
                                </div>
                            </div>
                        </template>
                        <template v-else>
                            <!-- 特殊 URL 的预览 -->
                            <div
                                v-if="pageViewInfo.type == 'bilibili'"
                                class="link-view-bilibili"
                            >
                                <div class="user">
                                    <img
                                        :src="
                                            ProxyUrl.proxy(
                                                pageViewInfo.data.owner.face,
                                            )
                                        "
                                        :alt="'[' + $t('图片') + ']'"
                                    />
                                    <span>{{
                                        pageViewInfo.data.owner.name
                                    }}</span>
                                    <a>{{
                                        Intl.DateTimeFormat(trueLang, {
                                            year: 'numeric',
                                            month: 'numeric',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: 'numeric',
                                        }).format(
                                            getViewTime(
                                                pageViewInfo.data.public,
                                            ),
                                        )
                                    }}</a>
                                </div>
                                <img
                                    :src="ProxyUrl.proxy(pageViewInfo.data.pic)"
                                    :alt="'[' + $t('图片') + ']'"
                                />
                                <span>{{ pageViewInfo.data.title }}</span>
                                <a>{{ pageViewInfo.data.desc }}</a>
                                <div class="data">
                                    <font-awesome-icon
                                        :icon="['fas', 'play']"
                                    />
                                    {{ pageViewInfo.data.stat.view }}
                                    <font-awesome-icon
                                        :icon="['fas', 'coins']"
                                    />
                                    {{ pageViewInfo.data.stat.coin }}
                                    <font-awesome-icon
                                        :icon="['fas', 'star']"
                                    />
                                    {{ pageViewInfo.data.stat.favorite }}
                                    <font-awesome-icon
                                        :icon="['fas', 'thumbs-up']"
                                    />
                                    {{ pageViewInfo.data.stat.like }}
                                </div>
                            </div>
                            <div
                                v-else-if="pageViewInfo.type == 'music163'"
                                class="link-view-music163"
                            >
                                <div>
                                    <img
                                        :src="pageViewInfo.data.cover"
                                        :alt="'[' + $t('图片') + ']'"
                                    />
                                    <div :id="'music163-audio-' + data.uuid">
                                        <a
                                            >{{ pageViewInfo.data.info.name }}
                                            <a
                                                v-if="
                                                    pageViewInfo.data.info
                                                        .free != null
                                                "
                                                >{{ $t('（试听）') }}</a
                                            >
                                        </a>
                                        <span>{{
                                            pageViewInfo.data.info.author.join(
                                                '/',
                                            )
                                        }}</span>
                                        <audio
                                            :src="
                                                ProxyUrl.proxy(
                                                    pageViewInfo.data.play_link,
                                                )
                                            "
                                            @loadedmetadata="audioLoaded()"
                                            @timeupdate="audioUpdate()"
                                        />
                                        <div>
                                            <input
                                                value="0"
                                                min="0"
                                                step="0.1"
                                                type="range"
                                                @input="audioChange()"
                                            />
                                            <div>
                                                <div />
                                                <div />
                                            </div>
                                            <font-awesome-icon
                                                v-if="!pageViewInfo.data.loaded"
                                                :icon="['fas', 'spinner']"
                                                spin
                                            />
                                            <template v-else>
                                                <font-awesome-icon
                                                    v-if="
                                                        !pageViewInfo.data.play
                                                    "
                                                    :icon="['fas', 'play']"
                                                    @click="audioControll()"
                                                />
                                                <font-awesome-icon
                                                    v-else
                                                    :icon="['fas', 'pause']"
                                                    @click="audioControll()"
                                                />
                                            </template>
                                            <span>00:00 / 00:00</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
                <div
                    v-if="data.icon && showIcon && direction === 'left'"
                    :class="{
                        rotate: data.icon.rotate,
                        icon: true,
                    }"
                >
                    <div @click="data.iconClick">
                        <font-awesome-icon
                            :style="{ color: data.icon.color }"
                            :title="data.icon.desc"
                            :aria-label="data.icon.desc"
                            :icon="['fas', data.icon.icon]"
                        />
                    </div>
                </div>
            </div>
        </div>
        <img
            v-if="direction === 'right'"
            v-hide="!showAvatar"
            v-menu.prevent="
                (event) => $emit('showUserMenu', event, data.sender)
            "
            v-user-tooltip="() => data.sender"
            class="avatar"
            :src="data.sender.face"
            :alt="data.sender.name"
            @dblclick="$emit('senderDoubleClick', data.sender)"
        />
        <div
            v-if="data.emojis && Object.keys(data.emojis).length > 0"
            class="emoji-like"
        >
            <div class="emoji-space" />
            <div class="emoji-like-body">
                <TransitionGroup name="emoji-like">
                    <template
                        v-for="(info, id) in data.emojis as Record<
                            string,
                            number[]
                        >"
                        :key="'respond-' + data.uuid + '-' + id"
                    >
                        <div
                            :class="{
                                'me-send': info.includes(
                                    runtimeData.loginInfo?.uin,
                                ),
                            }"
                            @click="$emit('emojiClick', id as string, data)"
                        >
                            <EmojiFace :emoji="Emoji.get(Number(id))" />
                            <span>{{ info.length }}</span>
                        </div>
                    </template>
                </TransitionGroup>
            </div>
        </div>
        <div class="message-ex-info">
            <div v-if="direction === 'right'" class="space" />
            <div class="content">
                <template
                    v-for="info in exInfo"
                    :key="data.uuid + '-exinfo-' + info"
                >
                    <a v-if="info === 'msgId'">
                        msgId: {{ data.message_id }}
                    </a>
                    <a v-if="info === 'time'">
                        time: {{ data.time?.format('year') }}
                    </a>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import MsgPrevTooltip from './tooltip/MsgPrevTooltip.vue'
import ImgSegComp from './msg-component/ImgSegComp.vue'
import EmojiFace from './EmojiFace.vue'

import markdownit from 'markdown-it'
import { Role } from '@renderer/function/adapter/enmu'
import { logger, popInfo } from '@renderer/function/base'
import { MenuEventData } from '@renderer/function/elements/information'
import Emoji from '@renderer/function/model/emoji'
import { Msg, SelfMsg } from '@renderer/function/model/msg'
import { MsgBodyFuns as ViewFuns } from '@renderer/function/model/msg-body'
import { ProxyUrl } from '@renderer/function/model/proxyUrl'
import {
    AtAllSeg,
    AtSeg,
    ErrorSeg,
    FaceSeg,
    FileSeg,
    ForwardSeg,
    ImgSeg,
    JsonSeg,
    MdSeg,
    MfaceSeg,
    ReplySeg,
    Seg,
    TxtSeg,
    VideoSeg,
    XmlSeg,
} from '@renderer/function/model/seg'
import { IUser, Member } from '@renderer/function/model/user'
import {
    openLink,
    scrollToMsg as scrollToMsgFunc,
    sendStatEvent,
} from '@renderer/function/utils/appUtil'
import { linkView } from '@renderer/function/utils/linkViewUtil'
// import { pokeAnime } from '@renderer/function/utils/msgUtil'
import { getTrueLang, getViewTime } from '@renderer/function/utils/systemUtil'
import {
    vHide,
    vMenu,
    vMove,
    VMoveOptions,
    vUserRole,
    vTooltip,
} from '@renderer/function/utils/vcmd'
import { backend } from '@renderer/runtime/backend'
import { defineComponent, provide, useTemplateRef } from 'vue'
import LazyLottie from './LazyLottie.vue'
import { vUserTooltip } from '@renderer/function/tooltip'
import { VueCompData } from '@renderer/function/elements/vueComp'
import { Img } from '@renderer/function/model/img'
import JsonSegComp from './msg-component/JsonSegComp.vue'
import XmlSegComp from './msg-component/XmlSegComp.vue'
import useRuntimeData from '@renderer/state/runtimeData'
import { getCm } from '@renderer/function/utils/baseUtil'

//#region == 声明变量 ================================================================
const {
    data,
    selected,
    showIcon = true,
    dimNonExistentMsg = true,
    special = false,
    showToMe = true,
    direction = 'left',
    showAvatar = true,
    exInfo = ['time', 'msgId'],
    withoutAvatar = false,
} = defineProps<{
    data: Msg | SelfMsg
    selected?: boolean
    /**
     * 显示消息icon（如发送中，发送失败）
     */
    showIcon?: boolean
    /**
     * 淡化不存在的消息（如正在发送中消息）
     */
    dimNonExistentMsg?: boolean
    /**
     * 特殊消息（如自己发的消息等）
     */
    special?: boolean
    /**
     * @我自己时高亮
     */
    showToMe?: boolean
    /**
     * 消息对齐方向（左侧/右侧）
     */
    direction?: 'left' | 'right'
    /**
     * 显示头像
     * 设置为 false 时隐藏头像。
     * 想移除头像占位请使用 withoutAvatar 选项
     * 如果设为 true 不显示头像，请检查 withoutAvatar 选项
     */
    showAvatar?: boolean
    /**
     * 移除头像占位
     * 设置为 true 时移除头像占位
     */
    withoutAvatar?: boolean
    /**
     * 显示时间
     */
    exInfo?: ('time' | 'msgId')[]
}>()

const emit = defineEmits<{
    leftMove: [msg: Msg]
    rightMove: [msg: Msg]
    senderDoubleClick: [user: IUser]
    showMsgMenu: [event: MenuEventData, msg: Msg]
    showUserMenu: [event: MenuEventData, user: IUser]
    emojiClick: [id: string, msg: Msg]
}>()

const msgMain = useTemplateRef<HTMLDivElement>('msgMain')

const runtimeData = useRuntimeData()

const moveOptions: VMoveOptions<HTMLDivElement> = {
    moveHook: (_, move: number) => {
        const target = msgMain.value!
        target.style.transform = 'translateX(' + move + 'px)'
    },
    endHook: (_) => {
        const target = msgMain.value!

        target.style.transform = ''
        target.style.transition = 'all 0.3'
    },
    leftLimit: {
        value: getCm(),
        type: 'px',
    },
    rightLimit: {
        value: getCm(),
        type: 'px',
    },
    moveCondition: {
        minMove: {
            value: getCm(),
            type: 'px',
        },
    },
}

let msgSpeicalType: 'space' | 'normally' | 'super-face' | 'json' | 'xml' =
    'normally'

if (data.message.length === 0) {
    msgSpeicalType = 'space'
} else if (data.message.length === 1) {
    const seg = data.message[0]
    if (seg instanceof FaceSeg && seg.face?.hasSuper) {
        msgSpeicalType = 'super-face'
    } else if (seg instanceof JsonSeg) {
        msgSpeicalType = 'json'
    } else if (seg instanceof XmlSeg) {
        msgSpeicalType = 'xml'
    }
}

provide('message-content', data)
//#endregion
//#region == 工具函数 ================================================================
function getAtMember(id: number): IUser | number {
    const user = data.session?.getUserById(id)
    if (user) return user
    else return id
}
function msgPrevTooltip(
    msgs: Msg[] | string,
): VueCompData<typeof MsgPrevTooltip> {
    return {
        comp: MsgPrevTooltip,
        props: {
            msgs,
        },
    }
}
function getSegPos(seg: Seg): 'alone' | 'top' | 'middle' | 'bottom' {
    const msg = data.message
    if (msg.length === 1) return 'alone'
    const index = msg.indexOf(seg)
    if (index === 0) return 'top'
    if (index === msg.length - 1) return 'bottom'
    return 'middle'
}
//#endregion
//#region == 暴露给下面的script =======================================================
defineExpose({
    setupEmit: emit,
    setupProps: {
        data,
        selected,
    },
})
//#endregion
</script>

<script lang="ts">
export default defineComponent({
    name: 'MsgBody',
    inject: ['viewer', 'mergePan'],
    data() {
        const runtimeData = useRuntimeData()
        return {
            backend,
            md: markdownit({ breaks: true }),
            isMe: false,
            isDebugMsg: runtimeData.sysConfig.debug_msg,
            linkViewStyle: '',
            View: ViewFuns,
            pageViewInfo: undefined as { [key: string]: any } | undefined,
            getVideo: false,
            senderInfo: null as any,
            trueLang: getTrueLang(),
            // 互动相关
            msgMove: {
                move: 0,
                onScroll: 'none' as 'none' | 'touch' | 'wheel',
                touchLast: null as null | TouchEvent,
            },
        }
    },
    mounted() {
        const runtimeData = useRuntimeData()
        // 初始化 isMe 参数
        this.isMe =
            Number(runtimeData.loginInfo?.uin) ===
            Number(this.data.sender.user_id)
        this.getLink()
    },
    methods: {
        /**
         * 滚动到指定消息
         * @param message_id 消息 id
         */
        scrollToMsg(message_id: string) {
            if (!this.data.session) return
            const msg = this.data.session.getMsgById(message_id)
            if (!msg) {
                popInfo.info(this.$t('定位消息失败'))
                return
            }
            scrollToMsgFunc(msg, true)
        },

        findLink(): string | undefined {
            for (const seg of this.data.message) {
                if (seg instanceof TxtSeg) {
                    if (seg.links.length > 0) {
                        return seg.links[0]
                    }
                }
            }
            return undefined
        },

        async getLink() {
            const link = this.findLink()
            if (!link) return

            let protocol = ''
            let domain = ''
            try {
                protocol = new URL(link).protocol + '//'
                domain = new URL(link).hostname
            } catch {
                // ignore
            }
            sendStatEvent('link_view', { domain: domain })

            let data = null as any
            let finaLink = link
            try {
                finaLink = await backend.call(
                    'Onebot',
                    'sys:getFinalRedirectUrl',
                    true,
                    link,
                )
                if (!finaLink) {
                    finaLink = link
                }
            } catch (_) {
                /**/
            }
            const showLinkList = {
                bilibili: ['bilibili.com', 'b23.tv', 'bili2233.cn', 'acg.tv'],
                music163: ['music.163.com', '163cn.tv'],
            }
            for (const key in showLinkList) {
                if (
                    showLinkList[key].some((item: string) =>
                        finaLink.includes(item),
                    )
                ) {
                    data = await linkView[key](finaLink)
                }
            }
            // 通用 og 解析
            if (!data) {
                if (!backend.isWeb()) {
                    let html = await backend.call(
                        'Onebot',
                        'sys:getHtml',
                        true,
                        finaLink,
                    )
                    if (html) {
                        const headEnd = html.indexOf('</head>')
                        html = html.slice(0, headEnd)
                        // 获取所有的 og meta 标签
                        const ogRegex =
                            /<meta\s+property="og:([^"]+)"\s+content="([^"]+)"\s*\/?>/g
                        const ogTags = {} as { [key: string]: string }
                        let match: string[] | null
                        while ((match = ogRegex.exec(html)) !== null) {
                            ogTags[`og:${match[1]}`] = match[2]
                        }
                        data = ogTags
                    }
                } else {
                    // 获取链接预览
                    const response = await fetch(
                        `${import.meta.env.VITE_APP_LINK_VIEW}/${encodeURIComponent(link)}`,
                    )
                    if (response.ok) {
                        const res = await response.json()
                        if (
                            res.status === undefined &&
                            Object.keys(res).length > 0
                        ) {
                            data = res
                        }
                    }
                }
            }

            logger.debug('Link View: ' + data)
            if (data) {
                this.loadLinkPreview(protocol + domain, data)
            }
        },

        loadLinkPreview(domain: string, res: any) {
            logger.debug('获取链接预览成功: ' + res['og:title'])
            if (res != undefined) {
                if (res.type == undefined) {
                    if (Object.keys(res).length > 0) {
                        let imgUrl = res['og:image']
                        if (
                            imgUrl &&
                            !imgUrl.startsWith('http') &&
                            !imgUrl.startsWith('www')
                        ) {
                            imgUrl = new URL(
                                imgUrl.startsWith('/') ? imgUrl : '/' + imgUrl,
                                domain,
                            ).toString()
                        }
                        const pageData = {
                            site:
                                res['og:site_name'] === undefined
                                    ? ''
                                    : res['og:site_name'],
                            title:
                                res['og:title'] === undefined
                                    ? ''
                                    : res['og:title'],
                            desc:
                                res['og:description'] === undefined
                                    ? ''
                                    : res['og:description'],
                            img: imgUrl,
                            link: res['og:url'],
                        }
                        this.pageViewInfo = pageData
                    }
                } else {
                    this.pageViewInfo = res
                }
            }
        },

        /**
         * 图片点击
         * @param img
         */
        imgClick(img: Img | string) {
            if (this.viewer) {
                if (typeof img === 'string') img = new Img(img)
                ;(this.viewer as any).open(img)
            }
        },

        /**
         * 对链接预览的图片长宽进行判定以确定显示样式
         */
        linkViewPicFin() {
            const img = document.getElementById(
                this.data.uuid + '-linkview-img',
            ) as HTMLImageElement
            if (img !== null) {
                const w = img.naturalWidth
                const h = img.naturalHeight
                if (w > h) {
                    this.linkViewStyle = 'large'
                }
            }
        },
        linkViewPicErr() {
            if (this.pageViewInfo) this.pageViewInfo.img = undefined
        },

        /**
         * 尝试在消息列表中寻找这条被回复的消息，获取消息内容
         * @param message_id
         */
        getRepMsg(message_id: string): string | null {
            const runtimeData = useRuntimeData()
            const list = runtimeData.nowChat!.messageList.filter((item) => {
                if (!(item instanceof Msg)) return false
                return item.message_id === message_id
            })
            if (list.length !== 1) return null
            const msg = list[0]
            if (!(msg instanceof Msg)) return null
            return msg.preMsg
        },

        /**
         * 文本消息被点击
         * @param event 事件
         */
        textClick(event: Event) {
            const target = event.target as HTMLElement
            if (target.dataset.link) {
                // 点击了链接
                const link = target.dataset.link
                openLink(link)
            }
        },

        /**
         * 下载 txt 文件并获取文件内容
         * @param url 链接
         */
        getTxtUrl(view: any) {
            const url = view.url
            // 保存文件为 Blob
            fetch(url)
                .then((r) => r.blob())
                .then((blob) => {
                    // 读取文件内容并返回文本
                    const reader = new FileReader()
                    reader.readAsText(blob, 'utf-8')
                    reader.onload = function () {
                        // 只取前 300 字，超出部分加上 ……
                        const txt = reader.result as string
                        view.txt =
                            txt.length > 300 ? txt.slice(0, 300) + '…' : txt
                    }
                })
        },

        hasMarkdown() {
            let hasMarkdown = false
            this.data.message.forEach((item: any) => {
                if (item.type === 'markdown') {
                    hasMarkdown = true
                }
            })
            return hasMarkdown
        },

        async showPock() {
            const runtimeData = useRuntimeData()
            // 如果是最后一条消息并且在最近发送
            if (this.data.uuid != runtimeData.nowChat?.messageList.at(-1)?.uuid)
                return
            if (!this.data.time) return
            if (
                (new Date().getTime() - getViewTime(this.data.time.time)) /
                    1000 <
                5
            )
                return

            let windowInfo = null as {
                x: number
                y: number
                width: number
                height: number
            } | null
            if (backend.isDesktop()) {
                windowInfo = await backend.call(
                    'Onebot',
                    'win:getWindowInfo',
                    true,
                )
            }
            const message = document.getElementById('chat-' + this.data.uuid)
            let item = document.getElementById('app')
            if (backend.isDesktop()) {
                item = message?.getElementsByClassName(
                    'poke-hand',
                )[0] as HTMLImageElement
            }
            // this.$nextTick(() => {
            //     pokeAnime(item, windowInfo)
            // })
        },

        getMdHTML(str: string, id: string) {
            const html = this.md.render(str)
            const div = document.createElement('div')
            div.innerHTML = html
            // 二次处理 img；img 拥有这样的 alt：cornerRadius=100 #48px #48px
            const imgs = div.getElementsByTagName('img')
            for (let i = 0; i < imgs.length; i++) {
                const img = imgs[i]
                const alt = img.getAttribute('alt')
                if (alt) {
                    const size = alt.split('#')
                    if (size.length == 3) {
                        img.style.width = size[1]
                        img.style.height = size[2]
                    }
                }
            }
            // 二次处理 a；去除 href
            const links = div.getElementsByTagName('a')
            for (let i = 0; i < links.length; i++) {
                const link = links[i]
                const href = link.getAttribute('href')
                if (href) {
                    link.setAttribute('data-link', href)
                    link.setAttribute('href', '')
                    link.onclick = (e) => {
                        e.preventDefault()
                        openLink(href)
                    }
                }
            }

            const body = document.getElementById(id)
            if (body) {
                body.innerHTML = ''
                body.appendChild(div)
            }

            return id
        },

        audioLoaded() {
            const mainBody = document.getElementById(
                'music163-audio-' + this.data.uuid,
            )
            if (mainBody) {
                const bar = mainBody.getElementsByTagName('input')[0]
                const audio = mainBody.getElementsByTagName('audio')[0]
                const span = mainBody
                    .getElementsByTagName('div')[0]
                    .getElementsByTagName('span')[0]
                const div = mainBody
                    .getElementsByTagName('div')[0]
                    .getElementsByTagName('div')[0]
                    .children[1] as HTMLDivElement
                if (bar && audio && span && div) {
                    const max =
                        this.pageViewInfo?.data.info.time ?? audio.duration
                    bar.max = max.toString()
                    // 设置进度文本
                    const minutes = Math.floor(max / 60)
                    const seconds = Math.floor(max % 60)
                    span.innerHTML =
                        '00:00 / ' +
                        (minutes < 10 ? '0' + minutes : minutes) +
                        ':' +
                        (seconds < 10 ? '0' + seconds : seconds)
                    // 设置不可播放长度
                    if (max > audio.duration) {
                        const percent = audio.duration / max
                        if (percent > 0) {
                            div.style.width =
                                'calc(' + (1 - percent) * 100 + '% - 9px)'
                            div.style.marginLeft =
                                'calc(' + percent * 100 + '% + 9px)'
                        } else {
                            div.style.width = '0%'
                        }
                    }
                }
            }
            if (this.pageViewInfo) this.pageViewInfo.data.loaded = true
        },

        audioControll() {
            const mainBody = document.getElementById(
                'music163-audio-' + this.data.uuid,
            )
            if (mainBody) {
                const audio = mainBody.getElementsByTagName('audio')[0]
                if (audio) {
                    if (audio.paused) {
                        audio.play()
                        if (this.pageViewInfo)
                            this.pageViewInfo.data.play = true
                    } else {
                        audio.pause()
                        if (this.pageViewInfo)
                            this.pageViewInfo.data.play = false
                    }
                }
            }
        },

        audioUpdate() {
            const mainBody = document.getElementById(
                'music163-audio-' + this.data.uuid,
            )
            if (mainBody) {
                const bar = mainBody.getElementsByTagName('input')[0]
                const audio = mainBody.getElementsByTagName('audio')[0]
                const span = mainBody
                    .getElementsByTagName('div')[0]
                    .getElementsByTagName('span')[0]
                const div = mainBody
                    .getElementsByTagName('div')[0]
                    .getElementsByTagName('div')[0]
                    .children[0] as HTMLDivElement
                if (bar && audio && span && div) {
                    const max =
                        this.pageViewInfo?.data.info.time ?? audio.duration
                    bar.value = audio.currentTime.toString()
                    // 设置进度文本
                    const minutes = Math.floor(audio.currentTime / 60)
                    const seconds = Math.floor(audio.currentTime % 60)
                    const minutesDur = Math.floor(max / 60)
                    const secondsDur = Math.floor(max % 60)

                    span.innerHTML =
                        (minutes < 10 ? '0' + minutes : minutes) +
                        ':' +
                        (seconds < 10 ? '0' + seconds : seconds) +
                        ' / ' +
                        (minutesDur < 10 ? '0' + minutesDur : minutesDur) +
                        ':' +
                        (secondsDur < 10 ? '0' + secondsDur : secondsDur)

                    const perCent = (audio.currentTime / max) * 100
                    if (perCent > 100) {
                        div.style.width = '100%'
                    } else {
                        div.style.width = perCent + '%'
                    }

                    if (audio.currentTime >= audio.duration) {
                        bar.value = '0'
                        audio.currentTime = 0
                        if (this.pageViewInfo)
                            this.pageViewInfo.data.play = false
                        div.style.width = '0%'
                    }
                }
            }
        },

        audioChange() {
            const mainBody = document.getElementById(
                'music163-audio-' + this.data.uuid,
            )
            if (mainBody) {
                const bar = mainBody.getElementsByTagName('input')[0]
                const audio = mainBody.getElementsByTagName('audio')[0]
                if (bar && audio) {
                    const value = parseFloat(bar.value)
                    if (value <= audio.duration) {
                        if (audio.paused) {
                            audio.currentTime = value
                        } else {
                            audio.pause()
                            audio.currentTime = value
                            audio.play()
                        }
                    } else {
                        bar.value = audio.currentTime.toString()
                    }
                }
            }
        },
        openMerge(seg: ForwardSeg) {
            if (!seg.id) {
                popInfo.error(this.$t('请先等发送完成...'))
                return
            }
            if (!this.mergePan) return
            ;(this.mergePan as any).openMergeMsg(seg)
        },
    },
})
</script>
<style>
.link-view-bilibili {
    flex-direction: column;
    width: 100%;
}
.link-view-bilibili > div.user {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
}
.link-view-bilibili > div.user > img {
    width: 20px;
    border-radius: 100%;
    border: 2px solid transparent;
    outline: 2px solid var(--color-card);
}
.link-view-bilibili > div.user > span {
    flex: 1;
    margin-left: 10px;
    margin-right: 40px;
}
.link-view-bilibili > div.user > a {
    color: var(--color-font-2);
    font-size: 0.8rem;
}
.link-view-bilibili > img {
    margin-bottom: 10px;
    max-width: 100% !important;
    width: fit-content;
}
.link-view-bilibili > a {
    color: var(--color-font-2) !important;
    font-size: 0.8rem;
    max-height: 4rem;
    overflow-y: scroll;
}
.link-view-bilibili > a::-webkit-scrollbar {
    background: transparent;
}
.link-view-bilibili > div.data {
    display: flex;
    flex-direction: row;
    align-items: center;
    font-size: 0.8rem;
    margin-top: 10px;
    justify-content: space-around;
    opacity: 0.7;
}

.link-view-music163 {
    flex-direction: column;
    display: flex;
}
.link-view-music163 > div:first-child {
    align-items: flex-start;
    display: flex;
}
.link-view-music163 > div:first-child > img {
    border-radius: 7px;
    margin-right: 20px;
    max-height: 80px;
    width: 25%;
}
.link-view-music163 > div:first-child > div {
    flex-direction: column;
    display: flex;
    width: 100%;
}
.link-view-music163 > div:first-child > div > a {
    font-size: 0.9rem;
    font-weight: bold;
}
.link-view-music163 > div:first-child > div > a > a {
    font-size: 0.7rem;
    font-weight: normal;
}
.link-view-music163 > div:first-child > div > span {
    font-size: 0.8rem;
    opacity: 0.7;
}
.link-view-music163 > div:first-child > div > div {
    flex-direction: row;
    margin-top: 5px;
    flex-wrap: wrap;
    display: flex;
}
.link-view-music163 > div:first-child > div > div > input {
    appearance: none;
    -webkit-appearance: none;
    width: calc(100% - 20px);
    background: transparent;
    margin-bottom: 10px;
    margin-right: 20px;
}
.link-view-music163
    > div:first-child
    > div
    > div
    > input::-webkit-slider-thumb {
    background: var(--color-main);
    -webkit-appearance: none;
    border-radius: 100%;
    margin-top: -3px;
    height: 12px;
    width: 12px;
}
.link-view-music163
    > div:first-child
    > div.me
    > div
    > input::-webkit-slider-thumb {
    background: var(--color-font-r);
}
.link-view-music163
    > div:first-child
    > div
    > div
    > input::-webkit-slider-runnable-track {
    background: var(--color-card-1);
    border-radius: 10px;
    height: 6px;
}
.link-view-music163
    > div:first-child
    > div.me
    > div
    > input::-webkit-slider-runnable-track {
    background: var(--color-font-2);
}
.link-view-music163 > div:first-child > div > div > svg {
    font-size: 0.75rem;
    margin-left: 4px;
    cursor: pointer;
}
.link-view-music163 > div:first-child > div > div > span {
    font-size: 0.75rem;
    margin-right: 20px;
    text-align: right;
    flex: 1;
}
.link-view-music163 > div:first-child > div > div > div {
    width: calc(100% - 20px);
    margin-bottom: -6px;
    margin-right: 20px;
    margin-left: 3px;
}
.link-view-music163 > div:first-child > div > div > div > div {
    transform: translateY(calc(-100% - 10px));
    background: var(--color-main);
    pointer-events: none;
    border-radius: 6px;
    height: 6px;
    width: 0%;
}
.link-view-music163 > div:first-child > div > div > div > div:nth-child(2) {
    transform: translateY(calc(-100% - 16px));
    background: var(--color-card-2);
    border-radius: 0 6px 6px 0;
}
.link-view-music163 > div:first-child > div.me > div > div > div:nth-child(2) {
    background: var(--color-font-1);
}
.link-view-music163 > div:first-child > div.me > div > div > div {
    background: var(--color-font-r);
}
</style>
