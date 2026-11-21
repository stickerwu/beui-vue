<script setup lang="ts">
import { useReducedMotion } from '../core/reduced-motion'
import { onBeforeUnmount, shallowRef, watch } from 'vue'

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/\\'
const SCRAMBLE_MS = 700
const TICK_MS = 45

/**
 * Renders the code, scrambling each character on mount before it settles. SSR and the first paint
 * show the real code, so the scramble is a pure client-side enhancement and reduced-motion users
 * see the code immediately.
 */
const props = defineProps<{ text: string }>()
const reduce = useReducedMotion()
const display = shallowRef(props.text)
let frame = 0

function stop() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
}

function run() {
  stop()
  const text = props.text
  if (reduce.value) { display.value = text; return }
  const chars = text.split('')
  const start = performance.now()
  let last = 0
  const loop = (now: number) => {
    if (now - last >= TICK_MS) {
      last = now
      const progress = Math.min((now - start) / SCRAMBLE_MS, 1)
      const settled = Math.floor(progress * chars.length)
      display.value = chars.map((ch, index) => index < settled || ch === ' ' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join('')
    }
    if (now - start < SCRAMBLE_MS) frame = requestAnimationFrame(loop)
    else { display.value = text; frame = 0 }
  }
  frame = requestAnimationFrame(loop)
}

// Runs only on the client: watch with `immediate` would also fire during SSR, where rAF is absent.
watch(() => [props.text, reduce.value] as const, () => { if (typeof window !== 'undefined') run() }, { immediate: true, flush: 'post' })
onBeforeUnmount(stop)
</script>
<template><span class="be-scramble">{{ display }}</span></template>
<style scoped>.be-scramble { font-variant-numeric: tabular-nums; }</style>
