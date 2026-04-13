<template>
    <div class="umami-info-pan">
        <div :class="'type-list' + (loading ? ' load' : '')">
            <font-awesome-icon :icon="['fas', 'book']" />
            <!-- 概览 -->
            <font-awesome-icon
                :class="{ select: showName === 'overview' }"
                :icon="['fas', 'chart-column']"
                @click="changeView('overview')"
            />
            <!-- 访客数据 -->
            <font-awesome-icon
                :class="{ select: showName === 'website' }"
                :icon="['fas', 'globe']"
                @click="changeView('website')"
            />
            <!-- 访客详情 -->
            <font-awesome-icon
                :class="{ select: showName === 'session' }"
                :icon="['fas', 'box-archive']"
                @click="changeView('session')"
            />
            <!-- 事件详情 -->
            <font-awesome-icon
                :class="{ select: showName === 'event' }"
                :icon="['fas', 'calendar-days']"
                @click="changeView('event')"
            />
        </div>
        <div :class="mainListSelected ? 'select' : ''">
            <div v-if="showName != 'overview'" class="detail-list">
                <template v-if="showName === 'website'">
                    <p>{{ $t('访客数据') }}</p>
                </template>
                <template v-if="showName === 'session'">
                    <p>{{ $t('访客详情') }}</p>
                    <span>
                        {{
                            $t(
                                '访客数据表示访问网站的独立会话，同一个访客只会统计一次。并且在下次访问时覆盖上次的数据。',
                            )
                        }}
                        <span v-if="onlyValidData"
                            ><br /><br />{{
                                $t(
                                    '“有效数据”仅包含了访客中连接了 bot 的部分会话。',
                                )
                            }}</span
                        ></span
                    >
                </template>
                <template v-if="showName === 'event'">
                    <p>{{ $t('事件详情') }}</p>
                    <span>
                        {{
                            $t(
                                '事件数据表示用户在访问期间的具体操作或上报行为，每次触发都会单独记录，因此同一个访客可能产生多个事件。',
                            )
                        }}
                    </span>
                </template>
                <div class="list">
                    <div
                        v-for="(item, index) in mainList"
                        :key="index"
                        :class="{ select: mainListSelected === item.value }"
                        @click="getData(item.value)"
                    >
                        <span
                            >{{ item.label
                            }}<span v-if="item.subLabel">{{
                                item.subLabel
                            }}</span></span
                        >
                        <a>{{
                            item.count ? formatNumber(Number(item.count)) : ''
                        }}</a>
                    </div>
                </div>
                <div class="time-select">
                    <div>
                        <select
                            v-model="timeType"
                            :disabled="loading"
                            @change="changeTime"
                        >
                            <option value="1">
                                {{ $t('最近 24 小时') }}
                            </option>
                            <option value="2">
                                {{ $t('本周') }}
                            </option>
                            <option value="3">
                                {{ $t('本月') }}
                            </option>
                            <option value="4">
                                {{ $t('本年') }}
                            </option>
                            <option value="5">
                                {{ $t('所有时间段') }}
                            </option>
                        </select>
                    </div>
                </div>
                <div v-if="showName === 'session'" class="only-valid-data">
                    <span>{{ $t('仅有效数据') }}</span>
                    <label class="ss-switch">
                        <input
                            v-model="onlyValidData"
                            :disabled="loading"
                            type="checkbox"
                            @change="changeTime"
                        />
                        <div>
                            <div />
                        </div>
                    </label>
                </div>
            </div>
            <div class="view-pan">
                <font-awesome-icon
                    v-if="showName != 'overview'"
                    :icon="['fas', 'arrow-left']"
                    @click="mainListSelected = ''"
                />
                <!-- 概览 -->
                <template v-if="showName === 'overview'">
                    <a v-if="visitData.pageviewChart != null">{{
                        $t('概览')
                    }}</a>
                    <div
                        v-if="visitData.pageviewChart != null"
                        style="
                            width: 100%;
                            height: 100%;
                            display: flex;
                            align-items: center;
                            flex-direction: column;
                        "
                    >
                        <v-chart
                            :option="visitData.pageviewChart"
                            style="width: 100%; height: 100%"
                            autoresize
                        />
                        <div class="time-select overview-time-select">
                            <div>
                                <select
                                    v-model="timeType"
                                    :disabled="loading"
                                    @change="changeTime"
                                >
                                    <option value="1">
                                        {{ $t('最近 24 小时') }}
                                    </option>
                                    <option value="2">
                                        {{ $t('本周') }}
                                    </option>
                                    <option value="3">
                                        {{ $t('本月') }}
                                    </option>
                                    <option value="4">
                                        {{ $t('本年') }}
                                    </option>
                                    <option value="5">
                                        {{ $t('所有时间段') }}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                </template>
                <!-- 访客数据 -->
                <template v-else-if="showName === 'website'">
                    <div class="status">
                        <div
                            v-for="name in Object.keys(visitData.status)"
                            v-show="name !== 'bounces' && name !== 'totaltime'"
                            :key="name"
                        >
                            <a>{{
                                formatNumber(visitData.status[name].value)
                            }}</a>
                            <span
                                v-if="
                                    name !== 'bounces' && name !== 'totaltime'
                                "
                            >
                                {{ $t('访客数据_' + name) }}
                                <span
                                    v-if="
                                        visitData.status[name].comparison !==
                                        undefined
                                    "
                                >
                                    ({{
                                        visitData.status[name].comparison >= 0
                                            ? '+'
                                            : ''
                                    }}{{
                                        visitData.status[
                                            name
                                        ].comparison.toFixed(0)
                                    }}%)
                                </span>
                            </span>
                        </div>
                    </div>
                    <span
                        >{{ $t('当前在线人数') }}: {{ visitData.online }}</span
                    >
                    <div
                        v-show="mainListSelected != ''"
                        v-if="visitData.metrics != null"
                        class="ss-card website-metric"
                    >
                        <div>
                            <span v-if="mainListSelected !== ''">{{
                                $t(metricTypes[mainListSelected])
                            }}</span>
                            <a style="width: calc(5rem + 20px)">{{
                                $t('数值（占比）')
                            }}</a>
                        </div>
                        <div
                            v-for="(metric, index) in visitData.metrics"
                            :key="index"
                        >
                            <span v-if="mainListSelected === 'event'">
                                {{
                                    eventTypes[metric.x]
                                        ? $t(eventTypes[metric.x]) + $t('次数')
                                        : metric.x
                                }}
                            </span>
                            <span v-else>{{
                                metric.x && metric.x != '' ? metric.x : '-'
                            }}</span>
                            <div>
                                <a>{{ formatNumber(metric.y) }}</a>
                                <!-- 按百分比绘制背景 -->
                                <div
                                    :style="{
                                        background: `linear-gradient(to right, color-mix(in srgb, var(--color-main) 20%, transparent) ${metric.percentage}%, transparent ${metric.percentage}%)`,
                                    }"
                                >
                                    <span>{{ metric.percentage }}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
                <!-- 访客详情 & 事件详情 -->
                <template v-if="showName === 'event' || showName === 'session'">
                    <div
                        v-show="mainListSelected != ''"
                        v-if="eventData != null"
                        class="pie-pan"
                    >
                        <v-chart :option="eventData" autoresize />
                        <a
                            v-if="
                                eventData.series &&
                                eventData.series[0] &&
                                eventData.series[0].type === 'pie'
                            "
                        >
                            {{
                                $t('占比小于 {per}% 的数据将不会展示在饼图中', {
                                    per: minPiePercentage * 100,
                                })
                            }}
                        </a>
                    </div>
                    <div v-show="mainListSelected != ''" v-else>
                        <a>{{ $t('暂无数据') }}</a>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { use } from 'echarts/core'
import { PieChart, BarChart, SunburstChart } from 'echarts/charts'
import {
    LegendComponent,
    BrushComponent,
    ToolboxComponent,
    TooltipComponent,
    GridComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

import VChart from 'vue-echarts'
import win from '@renderer/runtime/win'
use([
    TooltipComponent,
    LegendComponent,
    PieChart,
    CanvasRenderer,
    LegendComponent,
    BrushComponent,
    ToolboxComponent,
    TooltipComponent,
    BarChart,
    GridComponent,
    SunburstChart,
])

const API_URL = import.meta.env.VITE_APP_MU_DATA_API

export default defineComponent({
    name: 'UmamiInfoPan',
    components: {
        VChart,
    },
    data() {
        return {
            metricTypes: {
                path: '页面',
                browser: '浏览器',
                os: '操作系统',
                device: '设备',
                language: '语言',
                screen: '屏幕',
                event: '事件',
            },
            eventTypes: {
                send_msg: '发送消息',
                sendMsg: '发送消息（弃用）',
                connect: '连接',
                use_theme_color: '切换主题色',
                use_language: '切换语言',
                click_statistics: '触发按钮',
                use_chatview: '切换聊天面板样式',
                cilent: '上报版本（弃用）',
                show_qed: '触发彩蛋',
                use_transparent: '切换窗口透明',
                link_view: '链接预览',

                app_version: '应用版本',
                os_version: '系统版本',
                bot_version: '机器人版本',
                os_arch: '系统架构',
            },
            buttonTypes: {
                touch_randomly: '彩蛋按钮',
                visit_fish: '赞助按钮',
                visit_github: 'GitHub 按钮',
                visit_blog: '博客按钮',
            },
            minPiePercentage: 0.0084, // 饼图中最小显示百分比
            showName: 'website',
            timeType: 1,
            loading: false,
            mainListSelected: '',
            mainList: [] as {
                label: string
                subLabel?: string
                value: string
                count?: number
                data?: any
            }[],
            visitData: {
                pageviews: null as any,
                pageviewChart: null as any,
                status: {} as any,
                metrics: null as any,
                online: 0,
            },
            eventData: null as any,
            onlyValidData: false,
        }
    },
    mounted() {
        this.$watch(
            () => this.mainList,
            (newValue) => {
                if (newValue.length > 0) this.loading = false
            },
        )
        this.$watch(
            () => this.visitData.pageviewChart,
            (newValue) => {
                if (newValue != null) this.loading = false
            },
        )
        this.updateData()
        this.$watch(this.showName, () => {
            this.updateData()
        })
        this.$watch(
            () => win.darkMode,
            () => {
                this.updateData()
            },
        )
    },
    methods: {
        changeView(view: string) {
            if (this.loading) return

            this.showName = view
            this.mainListSelected = ''
            this.visitData.metrics = null
            this.eventData = null
            this.updateData()
        },

        changeTime() {
            if (this.loading) return

            this.mainListSelected = ''
            this.updateData()
        },

        updateData() {
            this.loading = true
            this.getStatus()
            this.getOnlineCount()
            this.getList()
            if (this.mainListSelected != '' || this.showName === 'overview') {
                this.getData(this.mainListSelected)
            }
        },

        getData(value: string) {
            // 获取 css 中的 var(--color-main)
            const colorMainRaw = getComputedStyle(
                document.body,
            ).getPropertyValue('--color-main')
            const colorFont = getComputedStyle(document.body).getPropertyValue(
                '--color-font-1',
            )
            const colorCard = getComputedStyle(document.body).getPropertyValue(
                '--color-card-1',
            )

            this.mainListSelected = value
            if (this.showName === 'overview') {
                this.getPageViews().then(() => {
                    if (!this.visitData.pageviews) return
                    const xAxisData: string[] = []
                    const data1: number[] = []
                    const data2: number[] = []
                    for (
                        let i = 0;
                        i < this.visitData.pageviews.pageviews.length;
                        i++
                    ) {
                        const pageviews = this.visitData.pageviews.pageviews[i]
                        const sessions = this.visitData.pageviews.sessions[i]
                        // 2025-09-19 01:00:00
                        const format = this.getRealTimeRange().format
                        const formattedDate = this.formatDate(
                            pageviews.x,
                            format,
                        )
                        xAxisData.push(formattedDate)
                        data1.push(pageviews.y)
                        data2.push(sessions.y)
                    }
                    const colorMain = this.hexToRgb(colorMainRaw)
                    // 给 colorMain 加透明的
                    const colorMainWithAlpha = colorMain
                        .replace(')', ', 0.5)')
                        .replace('rgb', 'rgba')
                    this.visitData.pageviewChart = {
                        textStyle: {
                            color: colorFont,
                        },
                        legend: {
                            data: [this.$t('浏览量'), this.$t('访客')],
                            left: '10%',
                            textStyle: {
                                color: colorFont,
                            },
                        },
                        tooltip: {},
                        xAxis: {
                            data: xAxisData,
                            name: this.getRealTimeRange().formatName,
                            axisLine: { onZero: true },
                            axisLabel: {
                                color: colorFont,
                            },
                            splitLine: { show: false },
                            splitArea: { show: false },
                        },
                        yAxis: {
                            axisLabel: {
                                color: colorFont,
                            },
                        },
                        grid: {
                            bottom: 100,
                            left: 50,
                        },
                        series: [
                            {
                                name: this.$t('浏览量'),
                                type: 'bar',
                                data: data1,
                                barGap: '-100%',
                                itemStyle: {
                                    color: colorMainWithAlpha,
                                    borderRadius: [7, 7, 0, 0],
                                },
                            },
                            {
                                name: this.$t('访客'),
                                type: 'bar',
                                data: data2,
                                itemStyle: {
                                    color: colorMain,
                                    borderRadius: [7, 7, 0, 0],
                                },
                            },
                        ],
                    }
                })
            } else if (this.showName === 'website') {
                this.getMetric(value)
            } else if (
                this.showName === 'event' ||
                this.showName === 'session'
            ) {
                const eventData = this.mainList.find(
                    (item) => item.value === value,
                )?.data
                if (eventData) {
                    // eventData 格式：[{value: 'xxx', total: 123}, ...]
                    // 转换为饼图需要的格式
                    let pieData = eventData.map((item: any) => ({
                        value: item.total,
                        name:
                            item.value != '' && item.value != null
                                ? item.value
                                : this.$t('（未知）'),
                    }))
                    // 只取前 9 项，其他归为“其他”，如果恰巧有 10 项也不处理防止第 10 项变成“其他”
                    // if (pieData.length > 10) {
                    //     const topData = pieData.slice(0, 9)
                    //     const otherTotal = pieData.slice(9).reduce((sum: number, item: any) => sum + item.value, 0)
                    //     topData.push({ value: otherTotal, name: this.$t('其他') })
                    //     pieData = topData
                    // }
                    // 按 value 降序排列
                    pieData.sort((a: any, b: any) => b.value - a.value)

                    const isSunburstMetric =
                        value.indexOf('app_version') == 0 ||
                        value.indexOf('os_version') == 0 ||
                        value.indexOf('bot_version') == 0

                    // ======= 特殊处理 =======
                    // 应用版本、系统版本、机器人版本改为旭日图逐层展示
                    if (isSunburstMetric) {
                        this.eventData = this.buildSunburstOption(
                            value,
                            pieData,
                            colorCard,
                            colorFont,
                        )
                        return
                    }
                    // 系统架构将 x86_64 统一为 x64、arm64 统一为 aarch64
                    if (value.indexOf('os_arch') == 0) {
                        pieData = this.processOsArch(pieData)
                    }
                    // 触发按钮进行名称映射
                    else if (value.indexOf('click_statistics') == 0) {
                        pieData = this.processClickStatistics(pieData)
                    }
                    // 触发彩蛋的数值实际上是尝试次数，把它们划到一个合适的指数区间内
                    else if (value.indexOf('show_qed') == 0) {
                        pieData = this.processShowQed(pieData)
                    }
                    // 这边的颜色用 colorMainRaw 创建 10 级不同透明度的颜色，不需要转为 rgba，使用十六进制颜色
                    const colors = [] as string[]
                    for (let i = 10; i >= 1; i--) {
                        const alpha = Math.floor((i / 10) * 255)
                            .toString(16)
                            .padStart(2, '0')
                        colors.push(colorMainRaw + alpha)
                    }
                    // 去除占比小于等于 0.84% 的
                    const total = pieData.reduce(
                        (sum: number, it: any) => sum + it.value,
                        0,
                    )
                    pieData = pieData.filter(
                        (item: any) =>
                            item.value / total > this.minPiePercentage,
                    )
                    this.eventData = {
                        // colors: colors,
                        color: [
                            '#d87c7c',
                            '#919e8b',
                            '#d7ab82',
                            '#6e7074',
                            '#61a0a8',
                            '#efa18d',
                            '#787464',
                            '#cc7e63',
                            '#724e58',
                            '#4b565b',
                        ],
                        tooltip: {
                            formatter: (params: any) => {
                                return `${params.marker} ${params.name}: ${params.value} (${params.percent}%)`
                            },
                            trigger: 'item',
                            backgroundColor: colorCard,
                            textStyle: {
                                color: colorFont,
                            },
                        },
                        legend: {
                            top: 'bottom',
                            left: 'center',
                            type: 'scroll',
                            textStyle: {
                                color: colorFont,
                            },
                        },
                        series: [
                            {
                                type: 'pie',
                                radius: ['40%', '70%'],
                                center: ['50%', '55%'],
                                avoidLabelOverlap: false,
                                padAngle: 3,
                                itemStyle: {
                                    borderRadius: 7,
                                },
                                label: {
                                    show: false,
                                },
                                emphasis: {
                                    label: {
                                        show: false,
                                    },
                                },
                                labelLine: {
                                    show: false,
                                },
                                data: pieData,
                            },
                        ],
                    }
                }
            }
        },

        async getPageViews() {
            const url =
                API_URL +
                '/pageviews/' +
                this.getRealTimeRange().precision +
                '/' +
                this.getRealTimeRange().time
            const res = await fetch(url)
            const data = await res.json()
            if (!data.error) {
                this.visitData.pageviews = data
            }
        },

        /**
         * 获取当前在线人数
         */
        async getOnlineCount() {
            // 获取当前在线人数
            const url = API_URL + '/active'
            const res = await fetch(url)
            const data = await res.json()
            if (!data.error) {
                this.visitData.online = data.visitors
            }
        },

        /**
         * 获取统计指标列表
         */
        async getList() {
            this.mainList = []
            if (this.showName == 'website') {
                const list = [] as {
                    label: string
                    subLabel?: string
                    value: string
                    count?: number
                    data?: any
                }[]
                for (const type of Object.keys(this.metricTypes)) {
                    list.push({
                        label: this.$t(this.metricTypes[type]),
                        value: type,
                    })
                }
                if (this.showName == 'website') this.mainList = list
            } else if (this.showName == 'event' || this.showName == 'session') {
                let url = API_URL + '/events/' + this.getRealTimeRange().time
                if (this.showName == 'session') {
                    url = API_URL + '/sessions/' + this.getRealTimeRange().time
                }
                let res
                if (this.showName == 'session' && this.onlyValidData) {
                    url =
                        API_URL +
                        '/sessions/' +
                        this.getRealTimeRange().time +
                        '/filter'
                    res = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            event: 'eq.send_msg',
                        }),
                    })
                } else {
                    res = await fetch(url)
                }
                const data = await res.json()
                if (!data.error) {
                    const list = [] as {
                        label: string
                        subLabel?: string
                        value: string
                        count?: number
                        data?: any
                    }[]
                    for (const item of data) {
                        if (!item.eventName) {
                            item.eventName = item.propertyName
                            delete item.propertyName
                        }
                        list.push({
                            label: this.eventTypes[item.eventName]
                                ? this.$t(this.eventTypes[item.eventName])
                                : item.eventName,
                            subLabel: item.propertyName,
                            value: item.eventName + '/' + item.propertyName,
                            count: item.total,
                            data: item.details,
                        })
                    }
                    // 根据 count 降序排列
                    list.sort((a, b) => (b.count || 0) - (a.count || 0))
                    if (this.showName == 'event' || this.showName == 'session')
                        this.mainList = list
                }
            }
        },

        /**
         * 获取访客数据总览
         */
        async getStatus() {
            const url = API_URL + '/status/' + this.getRealTimeRange().time
            const res = await fetch(url)
            const data = await res.json()
            if (!data.error) {
                const calculateComparison = (
                    current: number,
                    baseline: number,
                ): number => {
                    const currentVal = current || 0
                    const baselineVal = baseline || 0
                    // 如果基准值为 0，则无法计算百分比变化
                    if (baselineVal === 0) {
                        return currentVal === 0 ? 0 : 100
                    }
                    const result =
                        ((currentVal - baselineVal) / baselineVal) * 100
                    return isNaN(result) ? 0 : result
                }
                this.visitData.status = {
                    pageviews: {
                        value: data.pageviews || 0,
                        comparison: calculateComparison(
                            data.pageviews,
                            data.comparison?.pageviews,
                        ),
                    },
                    visitors: {
                        value: data.visitors || 0,
                        comparison: calculateComparison(
                            data.visitors,
                            data.comparison?.visitors,
                        ),
                    },
                    visits: {
                        value: data.visits || 0,
                        comparison: calculateComparison(
                            data.visits,
                            data.comparison?.visits,
                        ),
                    },
                }
            }
        },

        /**
         * 获取指定指标的详细数据
         * @param name 指标名称
         */
        async getMetric(name: string) {
            // 获取指定指标的详细数据
            this.visitData.metrics = []
            const url =
                API_URL +
                '/metrics/' +
                name +
                '/' +
                this.getRealTimeRange().time
            const res = await fetch(url)
            const data = await res.json()
            if (!data.error) {
                // 计算 data[*].y 的总和
                let total = 0
                for (const item of data) {
                    total += item.y
                }
                // 计算每一项的占比
                for (const item of data) {
                    item.percentage = ((item.y / total) * 100).toFixed(0)
                }
                this.visitData.metrics = data
            }
        },

        // ========== 工具函数 ===========

        /**
         * 合并同名项并降序排序
         */
        mergeAndSort(pieData: Array<{ name: string; value: number }>) {
            const mergedData: Record<string, number> = {}
            for (const item of pieData) {
                if (mergedData[item.name]) {
                    mergedData[item.name] += item.value
                } else {
                    mergedData[item.name] = item.value
                }
            }
            const result = Object.keys(mergedData).map((name) => ({
                name,
                value: mergedData[name],
            }))
            result.sort((a, b) => b.value - a.value)
            return result
        },

        /**
         * 处理应用版本数据
         */
        processAppVersion(pieData: Array<{ name: string; value: number }>) {
            return this.mergeAndSort(
                pieData.map((item) => {
                    let name = item.name
                    if (name.includes('beta-')) {
                        name = name.split('beta-')[0] + 'beta'
                    }
                    if (name.includes('pre.')) {
                        name = name.split('pre.')[0] + 'pre'
                    }
                    return { value: item.value, name }
                }),
            )
        },

        /**
         * 处理系统版本数据
         */
        processOsVersion(pieData: Array<{ name: string; value: number }>) {
            return this.mergeAndSort(
                pieData.map((item) => {
                    if (item.name.includes('(Web)')) {
                        return { value: item.value, name: 'Web' }
                    } else {
                        const parts = item.name.split(' ')
                        return {
                            value: item.value,
                            name: parts.slice(0, 2).join(' '),
                        }
                    }
                }),
            )
        },

        /**
         * 处理机器人版本数据
         */
        processBotVersion(pieData: Array<{ name: string; value: number }>) {
            return this.mergeAndSort(
                pieData.map((item) => {
                    const name = item.name.split(',')[0]
                    let version = item.name.split(',')[1]

                    if (!item.name || !name || !version) {
                        return { value: item.value, name: item.name }
                    }

                    if (version.startsWith('v')) {
                        version = version.slice(1)
                    }
                    const parts = version.split('.')
                    if (parts.length >= 2 && Number(parts[1]) != 0) {
                        version = parts[0] + '.' + parts[1]
                    }
                    return { value: item.value, name: name + ',' + version }
                }),
            )
        },

        buildSunburstOption(
            metric: string,
            pieData: Array<{ name: string; value: number }>,
            colorCard: string,
            colorFont: string,
        ) {
            const sunburstData = this.getSunburstData(metric, pieData)
            if (!sunburstData || sunburstData.length === 0) {
                return null
            }

            return {
                tooltip: {
                    trigger: 'item',
                    backgroundColor: colorCard,
                    textStyle: {
                        color: colorFont,
                    },
                    formatter: (params: any) => {
                        const treePath = params.treePathInfo || []
                        const visiblePath = treePath.slice(1)
                        const path = visiblePath
                            .map((item: any) => item.name)
                            .join(' ')

                        const toPercent = (part: number, whole: number) => {
                            if (!whole || whole <= 0) return '0.00%'
                            return `${((part / whole) * 100).toFixed(2)}%`
                        }

                        const rootValue = Number(
                            treePath[0]?.value || params.value || 0,
                        )
                        const levelLines = visiblePath.map(
                            (node: any, index: number) => {
                                const currentValue = Number(node.value || 0)
                                const parentValue = Number(
                                    treePath[index]?.value || rootValue,
                                )
                                const parentPercent = toPercent(
                                    currentValue,
                                    parentValue,
                                )
                                const totalPercent = toPercent(
                                    currentValue,
                                    rootValue,
                                )
                                return `${node.name}: ${parentPercent} (${this.$t('全局')} ${totalPercent})`
                            },
                        )

                        return `${params.marker} ${path}<br/>${this.$t('数值')}: ${params.value}<br/>${levelLines.join('<br/>')}`
                    },
                },
                series: [
                    {
                        type: 'sunburst',
                        radius: ['20%', '90%'],
                        itemStyle: {
                            borderWidth: 3,
                            borderRadius: 7,
                            borderColor: colorCard,
                        },
                        label: {
                            show: false,
                        },
                        emphasis: {
                            focus: 'series',
                        },
                        data: sunburstData,
                    },
                ],
            }
        },

        getSunburstData(
            metric: string,
            pieData: Array<{ name: string; value: number }>,
        ) {
            if (metric.indexOf('os_version') == 0) {
                return this.buildOsVersionSunburstData(pieData)
            }
            if (metric.indexOf('app_version') == 0) {
                return this.buildVersionSunburstData(pieData, 'app')
            }
            if (metric.indexOf('bot_version') == 0) {
                return this.buildVersionSunburstData(pieData, 'bot')
            }
            return []
        },

        buildOsVersionSunburstData(
            pieData: Array<{ name: string; value: number }>,
        ) {
            const tree: Record<string, Record<string, number>> = {}
            const appleSystems = new Set(['macOS', 'iPadOS', 'iOS'])

            for (const item of pieData) {
                const parsed = this.parseOsVersionNode(item.name)
                const rawSystemName = parsed.systemName
                const systemName = appleSystems.has(rawSystemName)
                    ? `apple/${rawSystemName}`
                    : rawSystemName
                const version = parsed.version

                if (!tree[systemName]) {
                    tree[systemName] = {}
                }
                tree[systemName][version] =
                    (tree[systemName][version] || 0) + item.value
            }

            const result: Array<{ name: string; children: any[] }> = []
            const appleChildren: Array<{ name: string; children: any[] }> = []

            for (const systemName of Object.keys(tree)) {
                const children = Object.keys(tree[systemName]).map(
                    (version) => ({
                        name: version,
                        value: tree[systemName][version],
                    }),
                )
                children.sort((a, b) => b.value - a.value)

                if (systemName.startsWith('apple/')) {
                    appleChildren.push({
                        name: systemName.replace('apple/', ''),
                        children,
                    })
                } else {
                    result.push({
                        name: systemName,
                        children,
                    })
                }
            }

            if (appleChildren.length > 0) {
                appleChildren.sort((a, b) => {
                    const aValue = a.children.reduce(
                        (sum, child) => sum + child.value,
                        0,
                    )
                    const bValue = b.children.reduce(
                        (sum, child) => sum + child.value,
                        0,
                    )
                    return bValue - aValue
                })
                result.push({
                    name: 'apple',
                    children: appleChildren,
                })
            }

            result.sort((a, b) => {
                const aValue = a.children.reduce(
                    (sum, child) => sum + child.value,
                    0,
                )
                const bValue = b.children.reduce(
                    (sum, child) => sum + child.value,
                    0,
                )
                return bValue - aValue
            })
            return result
        },

        buildVersionSunburstData(
            pieData: Array<{ name: string; value: number }>,
            type: 'app' | 'bot',
        ) {
            const tree: Record<
                string,
                Record<string, Record<string, number>>
            > = {}

            for (const item of pieData) {
                let parsed
                if (type === 'app') {
                    parsed = this.parseAppVersionNode(item.name)
                } else {
                    parsed = this.parseBotVersionNode(item.name)
                }

                const branch = parsed.branch
                const majorMinor = parsed.majorMinor
                const detail = parsed.detail

                if (!tree[branch]) {
                    tree[branch] = {}
                }
                if (!tree[branch][majorMinor]) {
                    tree[branch][majorMinor] = {}
                }
                tree[branch][majorMinor][detail] =
                    (tree[branch][majorMinor][detail] || 0) + item.value
            }

            const result = Object.keys(tree).map((branch) => ({
                name: branch,
                children: Object.keys(tree[branch]).map((majorMinor) => ({
                    name: majorMinor,
                    children: Object.keys(tree[branch][majorMinor])
                        .map((detail) => ({
                            name: detail,
                            value: tree[branch][majorMinor][detail],
                        }))
                        .sort((a, b) => b.value - a.value),
                })),
            }))

            result.sort((a, b) => {
                const sumNode = (node: any): number => {
                    if (node.value) return node.value
                    if (!node.children) return 0
                    return node.children.reduce(
                        (sum: number, child: any) => sum + sumNode(child),
                        0,
                    )
                }
                return sumNode(b) - sumNode(a)
            })

            return result
        },

        parseOsVersionNode(rawName: string) {
            const raw = (rawName || '').trim()
            if (!raw) {
                return {
                    systemName: this.$t('未知'),
                    version: this.$t('未知'),
                }
            }

            if (raw.includes('(Web)')) {
                return {
                    systemName: 'Web',
                    version: 'Web',
                }
            }

            const parts = raw.split(/\s+/)
            if (parts.length >= 2) {
                return {
                    systemName: parts[0],
                    version: parts[1],
                }
            }

            return {
                systemName: raw,
                version: this.$t('未知'),
            }
        },

        parseAppVersionNode(rawName: string) {
            const raw = (rawName || '').trim()
            const segs = raw
                .split(',')
                .map((seg) => seg.trim())
                .filter(Boolean)
            const versionRaw = segs[1] || ''
            const versionLower = versionRaw.toLowerCase()
            const branchRaw = segs[0] || this.$t('未知')
            const branch = versionLower.includes('pre') ? 'pre' : branchRaw
            const versionInfo = this.extractVersionGroups(versionRaw)
            return {
                branch,
                majorMinor: versionInfo.majorMinor,
                detail: versionInfo.detail,
            }
        },

        parseBotVersionNode(rawName: string) {
            const raw = (rawName || '').trim()
            const segs = raw
                .split(',')
                .map((seg) => seg.trim())
                .filter(Boolean)
            const branch = segs[0] || this.$t('未知')
            const versionRaw = segs[1] || segs[0] || ''
            const versionInfo = this.extractVersionGroups(versionRaw)
            return {
                branch,
                majorMinor: versionInfo.majorMinor,
                detail: versionInfo.detail,
            }
        },

        extractVersionGroups(rawVersion: string) {
            const cleaned = (rawVersion || '').replace(/^v/i, '')
            const matched =
                cleaned.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?(.*)?/) || []

            if (!matched[1]) {
                const unknown = this.$t('未知')
                return {
                    majorMinor: unknown,
                    detail: unknown,
                }
            }

            const major = matched[1]
            const minorNum = matched[2] || '0'
            const patchNum = matched[3] || '0'
            const suffix = (matched[4] || '').trim()
            const detail = `${patchNum}${suffix}`

            return {
                majorMinor: `${major}.${minorNum}`,
                detail,
            }
        },

        /**
         * 处理系统架构数据
         */
        processOsArch(pieData: Array<{ name: string; value: number }>) {
            return this.mergeAndSort(
                pieData.map((item) => {
                    let name = item.name
                    if (name === 'x86_64') {
                        name = 'x64'
                    } else if (name === 'arm64') {
                        name = 'aarch64'
                    }
                    return { value: item.value, name }
                }),
            )
        },

        /**
         * 处理触发按钮数据
         */
        processClickStatistics(
            pieData: Array<{ name: string; value: number }>,
        ) {
            return this.mergeAndSort(
                pieData.map((item) => {
                    let name = item.name
                    if (this.buttonTypes[name]) {
                        name = this.$t(this.buttonTypes[name])
                    }
                    return { value: item.value, name }
                }),
            )
        },

        /**
         * 处理彩蛋数据
         */
        processShowQed(pieData: Array<{ name: string; value: number }>) {
            const mapped = pieData.map((item) => {
                let name = item.name
                const num = Number(name)
                if (isNaN(num)) {
                    name = this.$t('未知')
                } else if (num >= 1000) {
                    name = '1000+'
                } else if (num >= 500) {
                    name = '500-999'
                } else if (num >= 200) {
                    name = '200-499'
                } else if (num >= 100) {
                    name = '100-199'
                } else if (num >= 50) {
                    name = '50-99'
                } else if (num >= 20) {
                    name = '20-49'
                } else if (num >= 10) {
                    name = '10-19'
                } else if (num >= 5) {
                    name = '5-9'
                } else if (num >= 1) {
                    name = '1-4'
                } else {
                    name = this.$t('未知')
                }
                return { value: item.value, name }
            })

            // 合并同名项
            const mergedData: Record<string, number> = {}
            for (const item of mapped) {
                if (mergedData[item.name]) {
                    mergedData[item.name] += item.value
                } else {
                    mergedData[item.name] = item.value
                }
            }
            const result = Object.keys(mergedData).map((name) => ({
                name,
                value: mergedData[name],
            }))

            // 按区间顺序排列
            const order = [
                '1-4',
                '5-9',
                '10-19',
                '20-49',
                '50-99',
                '100-199',
                '200-499',
                '500-999',
                '1000+',
                this.$t('未知'),
            ]
            result.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
            return result
        },

        getRealTimeRange() {
            const now = new Date()
            switch (Number(this.timeType)) {
                case 1: // 最近 24 小时
                    return {
                        time: Date.now() - 86400000 + '-' + Date.now(),
                        precision: 'hour',
                        format: 'HH',
                        formatName: this.$t('小时'),
                    }
                case 2: {
                    // 本周
                    const day = now.getDay() || 7 // 周日为7
                    const startOfWeek = new Date(now)
                    startOfWeek.setHours(0, 0, 0, 0)
                    startOfWeek.setDate(now.getDate() - day + 1) // 周一
                    return {
                        time: startOfWeek.getTime() + '-' + now.getTime(),
                        precision: 'day',
                        format: 'MM-DD',
                        formatName: this.$t('天'),
                    }
                }
                case 3: {
                    // 本月
                    const startOfMonth = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        1,
                    )
                    return {
                        time: startOfMonth.getTime() + '-' + now.getTime(),
                        precision: 'day',
                        format: 'MM-DD',
                        formatName: this.$t('天'),
                    }
                }
                case 4: {
                    // 本年
                    const startOfYear = new Date(now.getFullYear(), 0, 1)
                    return {
                        time: startOfYear.getTime() + '-' + now.getTime(),
                        precision: 'month',
                        format: 'YYYY-MM',
                        formatName: this.$t('月'),
                    }
                }
                case 5: {
                    // 所有时间段
                    return {
                        time: '0000000000000-' + now.getTime(),
                        precision: 'month',
                        format: 'YYYY-MM',
                        formatName: this.$t('月'),
                    }
                }
                default: // 默认最近 24 小时
                    return {
                        time: Date.now() - 86400000 + '-' + Date.now(),
                        precision: 'hour',
                        format: 'HH',
                    }
            }
        },

        formatNumber(num: number) {
            // 将大于 1000 的数字格式化为 1.2k 形式
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M'
            } else if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'k'
            } else {
                return num.toString()
            }
        },

        formatDate(dateStr: string, format: string): string {
            const date = new Date(dateStr)
            if (isNaN(date.getTime())) return ''

            const map: Record<string, string> = {
                YYYY: date.getFullYear().toString(),
                MM: (date.getMonth() + 1).toString().padStart(2, '0'),
                DD: date.getDate().toString().padStart(2, '0'),
                HH: date.getHours().toString().padStart(2, '0'),
                mm: date.getMinutes().toString().padStart(2, '0'),
                ss: date.getSeconds().toString().padStart(2, '0'),
            }

            return format.replace(
                /YYYY|MM|DD|HH|mm|ss/g,
                (matched) => map[matched],
            )
        },

        hexToRgb(hex: string): string {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
            return result
                ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
                : ''
        },
    },
})
</script>

<style scoped>
.umami-info-pan {
    padding: 0;
    flex-direction: row;
    display: flex;
    height: calc(100% + 30px);
    background: var(--color-bg);
    border-radius: 7px;
    overflow: hidden;
    z-index: -1;
}
.umami-info-pan > div:last-child {
    flex: 1;
    display: flex;
}
.type-list {
    background: var(--color-card-2);
    flex-direction: column;
    padding: 10px;
    display: flex;
    z-index: 10;
}
.type-list > svg {
    transition: all 0.3s;
    cursor: pointer;
    color: var(--color-font);
    width: 15px;
    height: 15px;
    padding: 10px;
    border-radius: 7px;
    margin-bottom: 10px;
}
.type-list > svg:first-child {
    width: 13px;
    height: 13px;
    border: 2px solid var(--color-main);
}
.type-list > svg.select {
    background: var(--color-main);
    color: var(--color-font-r);
}
.type-list.load > svg.select {
    opacity: 0.5;
}

.detail-list {
    background: var(--color-card-1);
    flex-direction: column;
    display: flex;
    width: 30%;
}
.detail-list > p {
    color: var(--color-font);
    font-size: 1rem;
    font-weight: bold;
    display: block;
    margin: 1rem;
}
.detail-list > span {
    border-radius: 7px;
    padding: 10px;
    background: var(--color-card-2);
    margin: 0 1rem 1rem 1rem;
    font-size: 0.8rem;
    color: var(--color-font-1);
}

.only-valid-data {
    font-size: 0.8rem;
    display: flex;
    margin: 0 20px 20px 20px;
}
.only-valid-data > span {
    flex: 1;
}
.only-valid-data > label {
    --switch-height: 20px;
    min-width: 35px;
}
.only-valid-data > label > div {
    background: var(--color-card-2);
}

.time-select {
    margin: 1rem;
}
.time-select > div {
    position: relative;
}
.time-select > div::after {
    content: '';
    position: absolute;
    pointer-events: none;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid var(--color-font-2);
}
.time-select select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background: var(--color-card-2);
    border: none;
    border-bottom: 1px solid var(--color-font-2);
    color: var(--color-font);
    font-size: 0.8rem;
    padding: 0 10px;
    border-radius: 7px;
    width: 100%;
    height: 30px;
}
.time-select select:disabled {
    background: var(--color-card-1);
    color: var(--color-font-2);
    cursor: not-allowed;
}
.overview-time-select {
    position: absolute;
    bottom: 17px;
    width: 25%;
    max-width: 200px;
    right: 80px;
}
.overview-time-select select {
    background: var(--color-card-1);
}
.overview-time-select select:disabled {
    background: var(--color-bg);
    color: var(--color-font-2);
    cursor: not-allowed;
}
.detail-list > .list {
    overflow-y: scroll;
    margin-right: 7px;
    flex: 1;
}

.detail-list > .list > div {
    transition: all 0.3s;
    justify-content: space-between;
    cursor: pointer;
    margin: 0 1rem 5px 1rem;
    flex-direction: row;
    border-radius: 7px;
    padding: 7px 10px;
    align-items: center;
    display: flex;
}
.detail-list > .list > div > span > span {
    display: block;
    font-size: 0.8rem;
    color: var(--color-font-2);
}
.detail-list > .list > div:hover {
    background: var(--color-card-2);
}
.detail-list > .list > div.select {
    background: var(--color-main);
    color: var(--color-font-r);
}
.detail-list > .list > div.select > span > span {
    color: var(--color-font-2-r);
}

.view-pan {
    background-image: url('@renderer/assets/img/stars.svg');
    background-size: 100%;

    justify-content: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    flex: 1;
}
.view-pan > svg {
    display: none;
}
.view-pan > span {
    display: block;
    width: fit-content;
    margin-bottom: 2rem;
    font-size: 0.75rem;
    background: var(--color-card-2);
    padding: 5px 15px 5px 25px;
    border-radius: 20px;
}
.view-pan > span::before {
    content: '';
    width: 0.75rem;
    height: 0.75rem;
    background: var(--color-green);
    position: absolute;
    border-radius: 100%;
    margin-top: 1px;
    margin-left: -17px;
}
.view-pan > a {
    display: block;
    width: 100%;
    color: var(--color-font);
    font-size: 1rem;
    font-weight: bold;
    margin: 0 1rem 1rem 1rem;
}

.pie-pan {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    flex-direction: column-reverse;
}
.pie-pan > x-vue-echarts {
    width: 80%;
    margin-top: -15%;
}
.pie-pan > a {
    top: 5mm;
    width: 80%;
    position: absolute;
    text-align: center;
    background: var(--color-card-1);
    padding: 10px;
    border-radius: 7px;
    font-size: 0.8rem;
    color: var(--color-font-2);
}

.status {
    margin-top: 1rem;
    padding-bottom: 1rem;
    width: calc(100% - 30px);
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    flex-wrap: wrap;
}
.status > div {
    flex-direction: column;
    align-items: center;
    display: flex;
    margin: 10px;
}
.status > div > a {
    font-weight: bold;
    font-size: 1.3rem;
}
.status > div > span {
    color: var(--color-font-2);
    font-size: 0.8rem;
}

.website-metric {
    border-top: 7px solid var(--color-main);
    margin-bottom: -20px;
    border-radius: 7px 7px 0 0;
    padding: 0;
    flex: 1;
    overflow-y: scroll;
    width: 100%;
}
.website-metric::-webkit-scrollbar {
    display: none;
}
.website-metric > div {
    justify-content: space-between;
    margin: 0 0 5px 0;
    flex-direction: row;
    border-bottom: 1px solid var(--color-border);
    padding: 7px 20px;
    display: flex;
}
.website-metric > div:nth-child(odd) {
    background: var(--color-card-1);
}
.website-metric > div:first-child {
    background: var(--color-card-2);
    font-weight: bold;
}
.website-metric > div > span {
    width: 60%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.website-metric > div > div {
    display: flex;
    align-items: center;
    margin: -7px 0;
}
.website-metric > div > div > a {
    font-weight: bold;
}
.website-metric > div > div > div {
    height: 100%;
    margin: -10px 0;
    border-left: 1px solid var(--color-font-2);
    padding-left: 10px;
    margin-left: 10px;
    width: 3rem;
    display: flex;
    align-items: center;
}
.website-metric > div > div > div span {
    font-size: 0.8rem;
    color: var(--color-font-2);
}

@media (max-width: 500px) {
    .umami-info-pan {
        flex-direction: column-reverse;
        height: calc(100% + 40px);
    }
    .umami-info-pan > div:last-child {
        overflow-x: hidden;
    }
    .umami-info-pan > div:last-child > div:first-child {
        transition: margin-left 0.3s;
    }
    .umami-info-pan > div:last-child.select > div:first-child {
        margin-left: -100%;
    }

    .type-list {
        background: var(--color-card-1);
        flex-direction: row;
        padding: 10px;
        justify-content: space-evenly;
    }
    .type-list > svg {
        margin: 0;
        padding: 13px;
        height: 20px;
        width: 20px;
    }
    .type-list > svg:first-child {
        display: none;
    }

    .view-pan > a,
    .detail-list > span {
        font-size: 1.3rem;
    }
    .detail-list {
        min-width: 100%;
        background: var(--color-bg);
    }
    .time-select > div {
        height: 35px;
    }
    .time-select > div > select {
        height: 35px;
    }

    .view-pan {
        min-width: calc(100% - 40px);
        margin-top: 1.5rem;
        justify-content: start;
    }
    .view-pan > svg {
        display: block;
        color: var(--color-font-r);
        background: var(--color-main);
        padding: 13px;
        border-radius: 7px;
        margin-top: 1.3rem;
    }

    .pie-pan {
        height: 70%;
    }

    .overview-time-select {
        bottom: 100px;
        right: 20px;
        width: 30%;
    }
}
</style>
