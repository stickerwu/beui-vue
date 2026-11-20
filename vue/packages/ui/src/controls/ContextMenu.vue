<script setup lang="ts">
import ActionMenu from './ActionMenu.vue'
import type { MenuItem } from './types'
const { items, label = 'Actions' } = defineProps<{ items: readonly MenuItem[]; label?: string }>()
const emit = defineEmits<{ select: [item: MenuItem] }>()
const open = defineModel<boolean>('open', { default: false })
</script>
<template><ActionMenu v-model:open="open" :items="items" :label="label" context @select="emit('select', $event)"><slot>{{ label }}</slot></ActionMenu></template>
