<script setup lang="ts">
import DialogSurface from './DialogSurface.vue'
const { side = 'right', label = 'Drawer' } = defineProps<{ side?: 'left' | 'right'; label?: string }>()
const open = defineModel<boolean>('open', { default: false })
</script>
<template><DialogSurface :open="open" :kind="side" :label="label" @close="open = false"><slot :close="() => open = false" /></DialogSurface></template>
