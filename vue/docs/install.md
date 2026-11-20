---
description: 在 Vue 3.5 的 Vite 或 Nuxt SSR 项目中安装 beui-vue 预览版，导入 ButtonBase 和编译好的 CSS，并配置深色主题。
---
# 安装与使用

使用 Vue 3.5 或更新的 Vue 3 版本。预览版通过 GitHub Release 提供，可在项目根目录直接安装。

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
