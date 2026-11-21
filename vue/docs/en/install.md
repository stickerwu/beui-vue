# Installation and usage

Use Vue 3.5 or a newer Vue 3 release. The preview is distributed through GitHub Releases and can be installed directly from your project root.

```sh
npm install https://github.com/stickerwu/beui-vue/releases/download/v0.1.0-alpha.0/beui-vue-0.1.0-alpha.0.tgz
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
