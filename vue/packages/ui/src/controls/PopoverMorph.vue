<script setup lang="ts">
import Popover from './Popover.vue'
const open = defineModel<boolean>('open', { default: false })
const { label = 'Options', side = 'bottom', align = 'start' } = defineProps<{ label?: string; side?: 'top' | 'bottom' | 'left' | 'right'; align?: 'start' | 'end' | 'center' }>()
</script>
<template><Popover v-model:open="open" :label="label" :side="side" :align="align" morph><template #trigger><slot name="trigger">{{ label }}</slot></template><template #default="scope"><slot v-bind="scope" /></template></Popover></template>
