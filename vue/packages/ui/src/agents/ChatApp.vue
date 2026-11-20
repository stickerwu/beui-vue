<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useOpenState } from '../primitives/state'
const props = withDefaults(defineProps<{ open?: boolean, defaultOpen?: boolean, sidebarWidth?: string, collapseSidebarBelow?: number }>(), { open:undefined, defaultOpen:true, sidebarWidth:'17rem', collapseSidebarBelow:600 })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, next => {emit('update:open',next);emit('openChange',next)})
const shell = shallowRef<HTMLElement | null>(null)
let observer: ResizeObserver | undefined
let narrow: boolean | undefined
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (props.open !== undefined) return
    const next = entry.contentRect.width < props.collapseSidebarBelow
    if (next !== narrow && (narrow !== undefined || next)) setOpen(!next)
    narrow = next
  })
  if(shell.value) observer.observe(shell.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>
<template><div ref="shell" class="be-chat-app" :style="{ '--be-sidebar-width': sidebarWidth }"><aside v-if="$slots.sidebar && open"><slot name="sidebar" :open="open" :set-open="setOpen" /></aside><div class="be-chat-main"><slot :open="open" :set-open="setOpen" :toggle="() => setOpen(!open)" /></div></div></template>
<style scoped>.be-chat-app{box-sizing:border-box;display:flex;width:100%;min-height:0;overflow:hidden;border:1px solid var(--beui-border);border-radius:1rem;background:var(--beui-background)}.be-chat-app>aside{box-sizing:border-box;flex:0 0 min(50%,var(--be-sidebar-width));overflow:auto;background:var(--beui-muted);padding:.75rem}.be-chat-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:.75rem;padding:.75rem}</style>
