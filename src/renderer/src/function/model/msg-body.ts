/*
 * @FileDescription: MsgBody.vue 所使模块用的通用的消息显示相关
 * @Author: Stapxs
 * @Date: 2022/11/29
 * @Version: 1.0
 * @Description: 此模块抽离出了本来在 MsgBody.vue 中的一些较为通用的方法便于进行多 Bot 适配。
 */

import xss from 'xss'

import app from '@renderer/main'

export class MsgBodyFuns {
    /**
     * 处理纯文本消息（处理换行，转义字符并进行 xss 过滤便于高亮链接）
     * @param { string } text 文本
     * @returns 处理完成的文本
     */
    static parseText(text: string) {
        // 把 r 转为 n
        text = text.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
        // 还原转义字符
        text = text.replace(/&([^;]+);/g, '&amp;$1;')
        // XSS 过滤
        text = xss(text, { whiteList: { a: ['href', 'target'] } })
        // 返回
        return text
    }

    /**
     * 处理纯文本消息和链接预览
     * @param text 纯文本消息
     */
    static parseTextMsg(text: string): { text: string; links: string[] } {
        const { $t } = app.config.globalProperties
        text = MsgBodyFuns.parseText(text)
        // 防止大量的重复字符
        const filtedText = text.replace(
            /(.)(\1{10,})/g,
            '$1<span style="opacity:0.7;margin-right:10px;">...</span>',
        )
        if (filtedText != text) {
            const style =
                'display:block;margin-top:10px;opacity:0.7;cursor:pointer;'
            text =
                filtedText +
                '<a style="' +
                style +
                '" data-raw="' +
                text +
                '" onclick="this.parentNode.innerText = this.dataset.raw;return false;">' +
                $t('显示原始消息') +
                '</a>'
        }
        // 链接判定
        const reg =
            /(http|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-.,@?^=%&:/~+#]*[\w\-@?^=%&/~+#])?/gi
        text = text.replaceAll(
            reg,
            '<a href="" data-link="$&" onclick="return false">$&</a>',
        )
        const linkList = text.match(reg)
        return {
            text: text,
            links: linkList ?? [],
        }
    }
}
