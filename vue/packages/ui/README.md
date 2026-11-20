# beui-vue

Vue 3.5 动效组件，独立移植自 [beUI](https://github.com/starc007/ui-components)。兼容 Vite 与 Nuxt SSR。安装预发布版本后，在应用入口引入编译后的样式。

```vue
<script setup lang="ts">
import { ButtonBase } from 'beui-vue'
import 'beui-vue/style.css'
</script>

<template><ButtonBase>保存</ButtonBase></template>
```

[组件文档与迁移进度](https://stickerwu.github.io/beui-vue/)。衍生代码保留 Saurabh Chauhan 的 MIT 版权和许可证。
