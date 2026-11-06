import { nextTick } from 'vue'
import { Session } from '../model/session'
import useRuntimeData from '@renderer/state/runtimeData'

let needRefreshFavicon = false

let cacheInfo = ''

/**
 * 刷新 favicon
 * @returns
 */
export function refreshFavicon() {
	if (needRefreshFavicon) return
	needRefreshFavicon = true
	nextTick(() => {
		const runtimeData = useRuntimeData()
		needRefreshFavicon = false
		let num = 0
		if (runtimeData.sysConfig.use_favicon_notice === false) return main(0)
		for (const session of Session.activeSessions.values()) {
			if (session.newMsg > 0) num++
		}
		main(num)
	})
}

function main(num: number) {
	const width = num.toString().length * 150
	const color = getComputedStyle(document.body)
		.getPropertyValue('--color-main')
		.trim()
	// 对比缓存
	if (cacheInfo === `${num}-${color}`) return
	// 存储缓存信息
	cacheInfo = `${num}-${color}`
	const svg = `
<svg width="1000" height="1000" viewBox="0 0 1000 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- 背景 -->
    <circle
        cx="500"
        cy="500"
        r="500"
        style="fill: ${color}"
        />
    <!-- 围巾 -->
    <path
        d="M 250 750 L 750 750 L 750 825 Q 500 925 250 825 Z"
        style="fill: red"
        />
    <path
        d="M 310 750 L 275 900 L 325 915 L 365 750 Z"
        style="fill: red"
        />
    <!-- 头 -->
    <ellipse
        cx="500"
        cy="480"
        rx="400"
        ry="375"
        style="fill: black"
        />
    <!-- 脸 -->
    <ellipse
        cx="420"
        cy="535"
        rx="250"
        ry="250"
        style="fill: white"
        />
    <ellipse
        cx="580"
        cy="535"
        rx="250"
        ry="250"
        style="fill: white"
        />
    <!-- 眼睛 -->
    <!-- 左眼 -->
    <!-- 睁开 -->
    <ellipse
        cx="350"
        cy="535"
        rx="40"
        ry="60"
        style="fill: black"
        />
    <!-- 高光 -->
    <circle
        cx="370"
        cy="515"
        r="20"
        style="fill: white"
        />
    <!-- 闭合 -->
    <!-- <path
        d="M 300 535 Q 350 580 400 535"
        stroke-width="10"
        style="stroke: black"
    /> -->
    <!-- 右眼 -->
    <!-- 睁开 -->
    <ellipse
        cx="650"
        cy="535"
        rx="40"
        ry="60"
        style="fill: black"
        />
    <!-- 高光 -->
    <circle
        cx="670"
        cy="515"
        r="20"
        style="fill: white"
        />
    <!-- 闭合 -->
    <!-- <path
        d="M 600 535 Q 650 580 700 535"
        stroke-width="10"
        style="stroke: black"
    /> -->
    <!-- 嘴巴 -->
    <path
        d="M 430 725 Q 480 710 490 650 Q 500 640 510 650 Q 520 710 570 725 Q 500 775 430 725 Z"
        style="fill: #ECC425"
        />
    ${
		num > 0
			? `
        <!-- 新消息数量 -->
        <path
            d="M ${600 - width} 400 L ${400 + width} 400 L  ${400 + width} 1000 L ${600 - width} 1000 Z"
            style="fill: red"
        />
        <circle cx="${600 - width}" cy="700" r="300" style="fill: red" />
        <circle cx="${400 + width}" cy="700" r="300" style="fill: red" />
        <text
            x="500"
            y="925"
            font-size="600"
            text-anchor="middle"
            style="fill: white; font-weight: bold;"
            >
            ${num}
        </text>
        `
			: ''
	}
</svg>
`

	const svgDataUrl =
		'data:image/svg+xml;charset=utf8,' + encodeURIComponent(svg)
	let link: HTMLLinkElement | null =
		document.querySelector('link[rel~="icon"]')
	if (!link) {
		link = document.createElement('link')
		link.rel = 'icon'
		document.head.appendChild(link)
	}
	link.href = svgDataUrl
	link.type = 'image/svg+xml'
}
