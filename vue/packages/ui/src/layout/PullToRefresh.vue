<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
const { onRefresh, threshold = 76, maxPull = 132, disabled = false, label = 'Refresh' } = defineProps<{
  onRefresh: () => void | Promise<void>; threshold?: number; maxPull?: number; disabled?: boolean; label?: string
}>()
const emit = defineEmits<{ error: [reason: unknown] }>()
const host = useTemplateRef('host')
const distance = shallowRef(0)
const phase = shallowRef<'idle'|'pulling'|'refreshing'|'done'|'error'>('idle')
const ready = computed(() => distance.value >= Math.min(threshold, maxPull * .95))
const text = computed(() => ({ idle: label, pulling: ready.value ? 'Release to refresh' : 'Pull to refresh', refreshing: 'Refreshing…', done: 'Refreshed', error: 'Refresh failed' }[phase.value]))
let startY: number | undefined
let timer: ReturnType<typeof setTimeout> | undefined
let disposed = false
function begin(y: number) {
  if (!disabled && phase.value === 'idle' && (host.value?.scrollTop ?? 0) <= 0) startY = y
}
function move(y: number) {
  if (startY === undefined) return false
  const delta = y - startY
  if (delta <= 0 && phase.value !== 'pulling') { startY = undefined; return false }
  if (delta < 4 && phase.value !== 'pulling') return false
  phase.value = 'pulling'
  distance.value = maxPull * (1 - Math.exp(-Math.max(0, delta) / Math.max(1, maxPull)))
  return true
}
async function refresh() {
  if (disabled || phase.value === 'refreshing') return
  clearTimeout(timer)
  phase.value = 'refreshing'
  distance.value = 58
  try { await onRefresh(); if (!disposed) phase.value = 'done' }
  catch (reason) { if (!disposed) { phase.value = 'error'; emit('error', reason) } }
  if (!disposed) timer = setTimeout(() => { phase.value = 'idle'; distance.value = 0 }, 650)
}
function release(cancel = false) {
  startY = undefined
  if (phase.value !== 'pulling') return
  if (!cancel && ready.value) { void refresh(); return }
  phase.value = 'idle'
  distance.value = 0
}
function touchMove(event: TouchEvent) {
  if (event.touches.length === 1 && move(event.touches[0]!.clientY) && event.cancelable) event.preventDefault()
}
onMounted(() => host.value?.addEventListener('touchmove', touchMove, { passive: false }))
onBeforeUnmount(() => { disposed = true; clearTimeout(timer); host.value?.removeEventListener('touchmove', touchMove) })
</script>
<template>
  <div ref="host" class="refresh" :aria-busy="phase==='refreshing'" @touchstart.passive="event => { if(event.touches.length===1) begin(event.touches[0]!.clientY) }" @touchend="release()" @touchcancel="release(true)"
    @pointerdown="event => { if(event.pointerType==='mouse' && event.button===0) begin(event.clientY) }" @pointermove="event => { if(event.pointerType==='mouse' && move(event.clientY)) host?.setPointerCapture(event.pointerId) }" @pointerup="event => { if(event.pointerType==='mouse') release() }" @pointercancel="release(true)">
    <div class="indicator" :style="{height:`${distance}px`}" :class="{pulling:phase==='pulling'}"><div><span class="buddy" :class="{ spin:phase==='refreshing' }" aria-hidden="true">{{ phase==='done' ? '✓' : '•‿•' }}</span><span>{{ text }}</span></div></div>
    <div><slot :refresh="refresh" :state="phase" /></div>
    <button type="button" class="accessible" :aria-label="label" :disabled="disabled || phase==='refreshing'" @click="refresh">{{ label }}</button>
    <span class="sr" role="status">{{ phase==='idle' ? '' : text }}</span>
  </div>
</template>
<style scoped>.refresh { position: relative; overflow-y: auto; width: 100%; overscroll-behavior: contain; } .indicator { display: grid; place-items: center; overflow: hidden; transition: height .28s cubic-bezier(.16,1,.3,1); } .indicator.pulling { transition: none; } .indicator > div { display: flex; align-items: center; gap: .6rem; color: var(--beui-muted-foreground); font-size: .8rem; } .buddy { background: var(--beui-foreground); color: var(--beui-background); border-radius: 45% 48% 44% 38%; padding: .3rem .4rem; line-height: 1; } .spin { animation: wiggle .75s ease-in-out infinite alternate; } .sr,.accessible:not(:focus-visible) { position: absolute; clip-path: inset(50%); width: 1px; height: 1px; overflow: hidden; } @keyframes wiggle { from {transform:rotate(-15deg)} to {transform:rotate(15deg)} } @media(prefers-reduced-motion:reduce){ .indicator {transition:none} .spin {animation:none} }</style>
