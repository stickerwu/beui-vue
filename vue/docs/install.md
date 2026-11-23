---
description: 在 Vue 3.5 的 Vite 或 Nuxt SSR 项目中安装 beui-vue 预览版，或用 shadcn-vue CLI 把组件源码复制进项目；导入 ButtonBase 和样式，并配置深色主题。
---
# 安装与使用

使用 Vue 3.5 或更新的 Vue 3 版本。beui-vue 有两种用法：作为依赖包导入，或用 [shadcn-vue](https://www.shadcn-vue.com/) CLI 把源码复制到你的项目里。

## 安装依赖包 {#package}

预览版通过 GitHub Release 提供，可在项目根目录直接安装。

```sh
npm install https://github.com/stickerwu/beui-vue/releases/download/v0.1.0-alpha.0/beui-vue-0.1.0-alpha.0.tgz
```

在应用入口加载一次 `beui-vue/style.css`。Nuxt 项目可以将相同路径加入 `nuxt.config.ts` 的 `css` 列表。组件使用编译后的样式，Vite 和 Nuxt 均可直接引入。

```vue
<script setup lang="ts">
import { ButtonBase } from 'beui-vue'
import 'beui-vue/style.css'
</script>

<template><ButtonBase>保存</ButtonBase></template>
```

通过 `data-beui-theme="dark"` 或 `.dark` 切换深色主题。可以在容器上覆盖 `--beui-primary`、`--beui-card` 等变量。

## 用 shadcn-vue CLI 安装 {#shadcn-vue}

每个组件也发布为 shadcn-vue 的 registry 条目。CLI 会把 TypeScript 源码复制进项目，把组件需要的依赖写入 `package.json`，其他文件一概不动。代码归你所有，可以随意修改。

### 前提条件

- 使用 Vite 和 TypeScript 的 Vue 3.5+ 项目，并且 `@` 别名指向 `src`（即 shadcn-vue 的 [Vite 安装指南](https://www.shadcn-vue.com/docs/installation/vite)所配置的环境）。
- 一个 `components.json` 文件。在项目根目录运行一次即可创建：

```sh
npx shadcn-vue@latest init
```

没有 `components.json` 时，CLI 无法确定文件的目标目录，写完第一个文件就会报错退出。

### 添加组件

把组件的 registry 地址传给 CLI。每个组件页面的“安装”部分都给出了对应命令，[`/r/index.json`](https://beui.stickerwu.net/r/index.json) 列出了全部条目。

```sh
# npm
npx shadcn-vue@latest add https://beui.stickerwu.net/r/button-base.json
# pnpm
pnpm dlx shadcn-vue@latest add https://beui.stickerwu.net/r/button-base.json
# bun
bunx --bun shadcn-vue@latest add https://beui.stickerwu.net/r/button-base.json
# yarn
yarn dlx shadcn-vue@latest add https://beui.stickerwu.net/r/button-base.json
```

一条命令可以列出多个地址，一次添加多个组件。组件共用的文件（动效参数、`theme.css`）只写一份；再次添加时，内容没有变化的文件会被跳过。

### 文件位置

文件会放进组件目录下的 `beui` 文件夹，目录结构与包源码一致，因此文件之间的相对导入保持有效：

```text
src/components/beui/
├─ ButtonBase.vue          你添加的组件
├─ core/                   动效参数与共享组合式函数
├─ agents/, blocks/, ...   各组件所属的分组
├─ theme.css               浅色与深色的 --beui-* 变量
└─ styles.css              引入 theme.css 以及 Agent、区块样式
```

请保持 `beui` 文件夹的完整。如果 `components` 别名不在 `src/components`，文件会跟随别名所指的位置。

### 导入一次样式

在应用入口导入一次 `styles.css`。每个组件安装的这份文件完全相同，所以继续添加组件不会改变它。

```ts
// src/main.ts
import '@/components/beui/styles.css'
```

然后从 CLI 复制的文件导入组件：

```vue
<script setup lang="ts">
import ButtonBase from '@/components/beui/ButtonBase.vue'
</script>

<template><ButtonBase>保存</ButtonBase></template>
```

深色主题与依赖包用法一致：在祖先元素上设置 `.dark`（shadcn-vue 已在使用的类名）或 `data-beui-theme="dark"`。

### 依赖

CLI 只安装你所添加组件实际导入的包：`motion-v`、`@vueuse/core`，个别组件还需要 `lenis` 或 `@paper-design/shaders`。`vue` 是对等依赖，不会被添加。

### 更新组件

重新运行同一条 `add` 命令。没有变化的文件会被跳过，遇到你改过的文件，CLI 会先询问是否覆盖。加上 `--overwrite` 会覆盖全部文件并丢弃本地修改，请先提交改动。

### 类型检查

Vite 的 Vue + TypeScript 模板默认开启 `noUnusedLocals` 和 `noUnusedParameters`。少数复制来的组件声明了仅由模板读取的变量，`vue-tsc` 会对它们报 `TS6133`。如果构建流程运行 `vue-tsc`，请在 `tsconfig.app.json` 中把这两项设为 `false`。

CLI 方式已在 Vite 项目和 shadcn-vue 2.9 上验证。
