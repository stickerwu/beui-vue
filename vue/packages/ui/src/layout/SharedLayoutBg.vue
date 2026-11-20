<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'
import { shallowRef, useTemplateRef } from 'vue'
import { tabsSpring } from '../core/motion'
const root = useTemplateRef('root')
const box = shallowRef<{ x: number; y: number; width: number; height: number }>()
const reduce = useReducedMotion()
function point(event: Event) {
  const host = root.value
  let target = event.target as HTMLElement | null
  while (target && target.parentElement !== host) target = target.parentElement
  if (!host || !target || target === host.firstElementChild) return
  const frame = host.getBoundingClientRect()
  const rect = target.getBoundingClientRect()
  box.value = { x: rect.left - frame.left, y: rect.top - frame.top, width: rect.width, height: rect.height }
}
</script>
<template><div ref="root" class="shared" @pointerover="point" @focusin="point" @pointerleave="box = undefined" @focusout="event => { if (!root?.contains(event.relatedTarget as Node)) box = undefined }">
  <motion.span class="highlight" :animate="box ? { ...box, opacity: 1 } : { opacity: 0 }" :initial="{ opacity: 0 }" :transition="reduce ? { duration: 0 } : tabsSpring" aria-hidden="true" /><slot />
</div></template>
<style scoped>.shared { position: relative; isolation: isolate; display: grid; } .highlight { pointer-events: none; position: absolute; top: 0; left: 0; z-index: -1; border-radius: .75rem; background: var(--beui-muted); }</style>
