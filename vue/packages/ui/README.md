# beui-vue

**beUI 动效组件与界面区块的 Vue 3 实现，由 stickerwu 独立维护。** 在 Vue 3.5 的 Vite 或 Nuxt SSR 项目中按名称导入组件，并在应用入口引入一次编译好的 CSS。[安装指南](https://beui.stickerwu.net/install) · [在线示例](https://beui.stickerwu.net/catalog) · [beUI 上游](https://github.com/starc007/ui-components)

```vue
<script setup lang="ts">
import { ButtonBase } from 'beui-vue'
import 'beui-vue/style.css'
</script>

<template><ButtonBase>保存</ButtonBase></template>
```

[组件文档与迁移进度](https://beui.stickerwu.net/)。衍生代码保留 Saurabh Chauhan 的 MIT 版权和许可证。
