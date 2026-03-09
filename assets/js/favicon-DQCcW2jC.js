import{r as a,S as f}from"./main-7KwQVqJ2.js";import{x as y}from"./@vue-Da_1h0nl.js";let r=!1,c="";function x(){r||(r=!0,y(()=>{r=!1;let e=0;if(a.sysConfig.use_favicon_notice===!1)return s(0);for(const l of f.activeSessions.values())l.newMsg>0&&e++;s(e)}))}function s(e){const l=e.toString().length*150,i=getComputedStyle(document.body).getPropertyValue("--color-main").trim();if(c===`${e}-${i}`)return;c=`${e}-${i}`;const o=`
<svg width="1000" height="1000" viewBox="0 0 1000 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- 背景 -->
    <circle
        cx="500"
        cy="500"
        r="500"
        style="fill: ${i}"
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
    ${e>0?`
        <!-- 新消息数量 -->
        <path
            d="M ${600-l} 400 L ${400+l} 400 L  ${400+l} 1000 L ${600-l} 1000 Z"
            style="fill: red"
        />
        <circle cx="${600-l}" cy="700" r="300" style="fill: red" />
        <circle cx="${400+l}" cy="700" r="300" style="fill: red" />
        <text
            x="500"
            y="925"
            font-size="600"
            text-anchor="middle"
            style="fill: white; font-weight: bold;"
            >
            ${e}
        </text>
        `:""}
</svg>
`,n="data:image/svg+xml;charset=utf8,"+encodeURIComponent(o);let t=document.querySelector('link[rel~="icon"]');t||(t=document.createElement("link"),t.rel="icon",document.head.appendChild(t)),t.href=n,t.type="image/svg+xml"}export{x as r};
