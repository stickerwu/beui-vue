<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useVisibility } from './in-view'

const { y = 16, blur = 8, duration = .6, delay = 0, once = true, amount = .3, root } = defineProps<{
  y?: number; blur?: number; duration?: number; delay?: number; once?: boolean; amount?: 'some' | 'all' | number; root?: Element | null
}>()
const target = useTemplateRef('target')
const seen = useVisibility(target, () => ({ once, amount, root }))
</script>
<template><div ref="target" class="scroll-reveal" :data-shown="seen" :style="{ '--offset': `${y}px`, '--blur': `${Math.min(10, Math.max(0, blur))}px`, '--duration': `${duration}s`, '--delay': `${delay}s` }"><slot /></div></template>
<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .scroll-reveal { transition: transform var(--duration) cubic-bezier(.16,1,.3,1) var(--delay), filter var(--duration) cubic-bezier(.16,1,.3,1) var(--delay), opacity var(--duration) cubic-bezier(.16,1,.3,1) var(--delay); }
  .scroll-reveal[data-shown=false] { transform: translateY(var(--offset)); filter: blur(var(--blur)); opacity: 0; }
  .scroll-reveal:focus-within { opacity: 1; filter: none; transform: none; }
}
</style>
