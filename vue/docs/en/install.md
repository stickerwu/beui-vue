---
title: "Install beui-vue: Animated Components for Vue 3 and Nuxt"
description: Install beui-vue in a Vue 3.5 Vite or Nuxt SSR project, or copy component source into your project with the shadcn-vue CLI. Import ButtonBase and the styles, and set up the dark theme.
---
# Installation and usage

Use Vue 3.5 or a newer Vue 3 release. beui-vue ships two ways: as a package you import from, or as source you copy into your project with the [shadcn-vue](https://www.shadcn-vue.com/) CLI.

## Install the package {#package}

The preview is published on npm under the `next` tag. Install it from your project root:

```sh
npm install beui-vue@next
```

Load `beui-vue/style.css` once at your application entry. Nuxt projects can add the same path to the `css` array in `nuxt.config.ts`. The components use compiled styles, and both Vite and Nuxt can import them directly.

```vue
<script setup lang="ts">
import { ButtonBase } from 'beui-vue'
import 'beui-vue/style.css'
</script>

<template><ButtonBase>保存</ButtonBase></template>
```

Switch to the dark theme with `data-beui-theme="dark"` or `.dark`. You can override variables such as `--beui-primary` and `--beui-card` on a container element.

## Install with the shadcn-vue CLI {#shadcn-vue}

Every component is also published as a shadcn-vue registry item. The CLI copies the TypeScript source into your project, adds the dependencies it needs to `package.json` and touches nothing else, so you own the code and can edit it freely.

### Prerequisites

- A Vue 3.5+ project with Vite and TypeScript, and the `@` import alias pointing at `src` (the setup shadcn-vue's [Vite guide](https://www.shadcn-vue.com/docs/installation/vite) walks through).
- A `components.json` file. Create it once from the project root:

```sh
npx shadcn-vue@latest init
```

Without a `components.json` the CLI cannot work out where to put the files and stops after writing the first one.

### Add a component

`@beui-vue` is listed in the [official shadcn-vue directory](https://shadcn-vue.com/docs/directory), so pass a component's install slug with that prefix and leave `components.json` as it is. Every component page's Install section shows its command, and [`/r/index.json`](https://beui.stickerwu.net/r/index.json) lists all of them.

```sh
# npm
npx shadcn-vue@latest add @beui-vue/button-base
# pnpm
pnpm dlx shadcn-vue@latest add @beui-vue/button-base
# bun
bunx --bun shadcn-vue@latest add @beui-vue/button-base
# yarn
yarn dlx shadcn-vue@latest add @beui-vue/button-base
```

The full registry URL, such as `https://beui.stickerwu.net/r/button-base.json`, works the same way.

Several components can be added in one command by listing them. Files that components share (the motion tokens, `theme.css`) are written once, and a second add skips any file whose content is unchanged.

### Where the files go

The files land in a `beui` folder inside your components folder, using the same layout as the package source so the imports between them keep working:

```text
src/components/beui/
├─ ButtonBase.vue          the component you added
├─ core/                   motion tokens and shared composables
├─ agents/, blocks/, ...   the group each component belongs to
├─ theme.css               the --beui-* variables for light and dark
└─ styles.css              imports theme.css and the agent and block styles
```

Keep the `beui` folder together. If your `components` alias points somewhere other than `src/components`, the files follow it.

### Import the styles once

Import `styles.css` a single time at your application entry. It is identical in every installed component, so adding more components never changes it.

```ts
// src/main.ts
import '@/components/beui/styles.css'
```

Then import the component from the file the CLI copied:

```vue
<script setup lang="ts">
import ButtonBase from '@/components/beui/ButtonBase.vue'
</script>

<template><ButtonBase>Save</ButtonBase></template>
```

The dark theme works the same way as in the package: put the `.dark` class (the one shadcn-vue already uses) or `data-beui-theme="dark"` on an ancestor.

### Dependencies

The CLI installs only what the components you add import: `motion-v`, `@vueuse/core`, and for a few components `lenis` or `@paper-design/shaders`. `vue` itself is a peer dependency and is never added.

### Update a component

Run the same `add` command again. Files that did not change are skipped and the CLI asks before replacing one you edited. Add `--overwrite` to replace everything, which discards local edits, so commit them first.

### Type checking

Vite's Vue + TypeScript template turns on `noUnusedLocals` and `noUnusedParameters`. A few of the copied components declare values that only their template reads, so `vue-tsc` reports `TS6133` for them. Set both options to `false` in `tsconfig.app.json` if your build runs `vue-tsc`.

The CLI route was checked with Vite projects and shadcn-vue 2.9.
