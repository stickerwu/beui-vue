<script setup lang="ts">
import { shallowRef } from 'vue'
import DialogSurface from './DialogSurface.vue'
const { label = 'Dialog' } = defineProps<{ label?: string }>()
const open = defineModel<boolean>('open', { default: false })
const origin = shallowRef<DOMRect>()
function show(event: MouseEvent) { origin.value = (event.currentTarget as HTMLElement).getBoundingClientRect(); open.value = true }
</script>
<template><span class="center-root"><button type="button" class="trigger" aria-haspopup="dialog" :aria-expanded="open" @click="show"><slot name="trigger">Open modal</slot></button><DialogSurface :open="open" :origin="origin" :label="label" @close="open = false"><button type="button" class="close" aria-label="Close" @click="open = false">×</button><slot :close="() => open = false" /></DialogSurface></span></template>
<style scoped>.trigger { border: 0; border-radius: 99px; padding: .65rem 1.25rem; background: var(--beui-foreground); color: var(--beui-background); font: inherit; font-size: .875rem; cursor: pointer; } .close { float: right; border: 0; border-radius: 50%; background: var(--beui-muted); color: inherit; width: 1.75rem; height: 1.75rem; cursor: pointer; }</style>
