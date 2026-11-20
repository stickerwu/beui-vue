<p align="center"><a href="https://beui.stickerwu.net/"><img src="./vue/docs/public/brand/beui-vue.png" width="104" height="104" alt="beui-vue"></a></p>

# beui-vue

**beUI 动效组件与界面区块的 Vue 3 实现。** 这个独立维护的开源项目将 beUI 的交互设计带到 Vue 单文件组件中。用 TypeScript、`v-model` 和插槽组合界面，在 Vite 或 Nuxt SSR 项目里直接使用。

An independently maintained Vue 3 implementation of beUI’s motion components and UI blocks.

[中文文档](https://beui.stickerwu.net/) · [全部组件](https://beui.stickerwu.net/catalog) · [在线示例](https://beui.stickerwu.net/components/motion/tabs) · [GitHub](https://github.com/stickerwu/beui-vue) · [Gitee 镜像](https://gitee.com/stickerwu/beui-vue)

## 先试一个组件

组件目录收录 **122 个组件和 38 个区块**。每个条目都有可运行的 Vue 示例、用法、API 和对应的 beUI 原版链接。

| 想做什么 | 打开示例 |
| --- | --- |
| 在两个视图间切换，或拖动比较前后效果 | [标签页](https://beui.stickerwu.net/components/motion/tabs) · [对比滑块](https://beui.stickerwu.net/components/motion/before-after-slider) |
| 把通知折叠成一摞，或用瀑布流展示卡片 | [通知堆叠](https://beui.stickerwu.net/components/blocks/notification-stack) · [无限瀑布流](https://beui.stickerwu.net/components/blocks/infinite-masonry) |
| 构建 AI 对话界面 | [消息气泡](https://beui.stickerwu.net/components/agents/message-bubble) · [语音球](https://beui.stickerwu.net/components/agents/voice-orb) |
| 展示趋势和流向 | [折线图](https://beui.stickerwu.net/charts/line-chart) · [桑基图](https://beui.stickerwu.net/charts/sankey-chart) |
| 搭建游戏交互 | [Mines](https://beui.stickerwu.net/casino/mines) · [Crash](https://beui.stickerwu.net/casino/crash/crash) |

## 安装与使用

在已有的 **Vue 3.5 或更高的 3.x** 项目里，从 GitHub Release 安装预览版。

```sh
npm install https://github.com/stickerwu/beui-vue/releases/download/v0.1.0-alpha.0/beui-vue-0.1.0-alpha.0.tgz
```

在应用入口引入一次 `beui-vue/style.css`，然后按名称导入组件。包内提供编译好的 CSS 和类型声明，无需配置 Tailwind。

```vue
<script setup lang="ts">
import { ButtonBase } from 'beui-vue'
import 'beui-vue/style.css'
</script>

<template>
  <ButtonBase>保存更改</ButtonBase>
</template>
```

Nuxt 项目可将 `beui-vue/style.css` 加入 `nuxt.config.ts` 的 `css` 数组。[安装指南](https://beui.stickerwu.net/install)

## 版本与开发

`0.1.0-alpha.0` 已提供全部 160 个公开 Web 条目的 Vue 实现。172 组演示的动效还原按变体审看，目录逐项记录进度。[预览版与校验和](https://github.com/stickerwu/beui-vue/releases/tag/v0.1.0-alpha.0) · [效果对照与验收](https://beui.stickerwu.net/verification)

Vue 组件、示例和文档都在 `vue/`。本地构建、Vite 与 Nuxt 安装测试、截图对照的运行方法见[开发指南](./vue/README.md)。

## 来源与许可

本项目由 [stickerwu](https://github.com/stickerwu) 独立维护。原始组件与交互设计来自 [beUI](https://beui.dev/) 的 [starc007/ui-components](https://github.com/starc007/ui-components) 及其贡献者。Vue 移植以 [`c0a936f`](https://github.com/starc007/ui-components/tree/c0a936f59eb767e263c0e81b93dd323511dc9b6b) 为基准，组件页保留上游源码及原设计署名。项目遵循 [MIT 许可证](./LICENSE)。
