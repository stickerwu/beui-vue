# beui-vue

**Animated Vue 3 components and UI blocks, the Vue port of [beUI](https://beui.dev).** 160 components for Vite and Nuxt SSR, built with motion-v and TypeScript.

beUI 动效组件与界面区块的 Vue 3 实现，由 stickerwu 独立维护。

[Docs](https://beui.stickerwu.net/en/) · [中文文档](https://beui.stickerwu.net/) · [All components](https://beui.stickerwu.net/en/catalog) · [GitHub](https://github.com/stickerwu/beui-vue)

## Install

```sh
npm install beui-vue@next
```

Requires Vue 3.5 or a newer 3.x. Load the compiled styles once in your app entry (in Nuxt, add `beui-vue/style.css` to `css` in `nuxt.config.ts`):

```vue
<script setup lang="ts">
import { ButtonBase } from 'beui-vue'
import 'beui-vue/style.css'
</script>

<template><ButtonBase>Save</ButtonBase></template>
```

Prefer to own the source? Copy single components with the shadcn-vue CLI:

```sh
npx shadcn-vue@latest add @beui-vue/button-base
```

## For AI coding agents

MCP server at `https://beui.stickerwu.net/mcp`, the agent skill (`npx skills add stickerwu/beui-vue --skill beui-vue`) and [llms-full.txt](https://beui.stickerwu.net/llms-full.txt). See the [agent guide](https://beui.stickerwu.net/en/docs/ai-agents).

## License

MIT. Derived code keeps Saurabh Chauhan's MIT copyright and license.
