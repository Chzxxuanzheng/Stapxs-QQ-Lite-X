<p align="center">
    <img src="src/renderer/public/img/icons/icon.svg" alt="Logo" width="256">
    <h2 align="center" style="font-weight: 600">Stapxs QQ Lite X</h2>
    <p align="center">
        <img src="README/gitcode.png" width="400">
    </p>
    <p align="center">
        一个跨协议的 <a href="https://github.com/Stapxs/Stapxs-QQ-Lite-2.0">Stapxs QQ Lite</a> 发行版
        <br />
        <a href="http://qqlite.leenet.xyz/test" target="blank"><strong>🌎 访问 DEMO</strong></a>  |
        <a href="https://github.com/Chzxxuanzheng/Stapxs-QQ-Lite-X/issues/new?template=bug-report.yml&assignees=Chzxxuanzheng&labels=%3Abug%3A+%E9%94%99%E8%AF%AF&title=%5B%E9%94%99%E8%AF%AF%5D" target="blank"><strong>💬 反馈问题</strong></a>
        <br />
        <br />
        <strong>本网页应用仅供学习交流使用，请勿用于其他用途</strong><br>
        <strong>版权争议请提出 issue 协商</strong>
    </p>
</p>

---

该项目正在开发，您可以通过[访问Demo](http://qqlite.leenet.xyz/test)来使用测试版网页。如果您想部署，可以参考下面的构建应用。

> [!NOTE]
> 由于本人精力有限，且桌面端使用人数不多，该项目不再提供桌面端支持！

## 📦️ 构建应用

为了规范对其他仓库的引用，Stapxs QQ Lite X 仓库含有一些子模块，这意味着你需要在克隆仓库的时候包含子模块：

```bash
git clone https://github.com/Chzxxuanzheng/Stapxs-QQ-Lite-X --recursive
```

如果你已经克隆了仓库，也可以使用这个来补全子模块：

```bash
git submodule update --init
```

在开始构建之前请安装依赖，请确保安装了 `pnpm`：

```bash
# 安装依赖
pnpm install
```

最后，在构建前 Stapxs QQ Lite X 使用了高德地图的部分 API 来显示位置共享的地图。在 `.env` 文件中提供了一个默认的高德地图 API Key，如果你打算自行部署，你可以在 [这里](https://lbs.amap.com/dev/key/app) 申请一个属于你自己的 API Key 并替换掉默认的 API Key。

我们非常建议你使用自己的 API Key，因为默认的 API Key 有使用次数限制。

### > 构建 Web 页面

Stapxs QQ Lite X 是一个基于 Vue 的单页应用，这意味着如果你想自行部署到网页服务需要进行构建。

下面是构建该项目的命令，构建结果将最终输出在 `dist` 目录下：

```bash

# 构建应用
pnpm build
```

### > 命令列表

这儿是本项目的完整命令列表，你可以使用这些命令来快速构建和调试 Stapxs QQ Lite。

**命令格式为 `pnpm <命令>`，其中 `<命令>`为列表中的一个：**

| 命令         | 描述                          |
| ------------ | ----------------------------- |
| install      | 安装依赖                      |
| lint         | 代码检查（oxlint + 类型检查） |
| lint:fix     | 自动修复 oxlint 问题          |
| lint:oxlint  | 仅执行 oxlint 检查            |
| lint:types   | 仅执行 vue-tsc 类型检查       |
| format       | 格式化代码（oxfmt）           |
| format:check | 检查代码格式（不写入文件）    |
| dev          | 网页调试                      |
| build        | 网页构建                      |
| preview      | 预览网页构建产物              |
| proxy        | 一个临时跨域代理服务器        |

## 🎉 鸣谢

感谢 Stapxs 提供上游项目，使本发行版得以开发
感谢 Shigure 为本项目提供了图标设计

<a href="https://github.com/Stapxs">
    <img src="https://avatars.githubusercontent.com/u/42486439?s=128&v=4">
</a>
<img src="https://q1.qlogo.cn/g?b=qq&s=0&nk=2634758584" alt="Logo" width="128">
