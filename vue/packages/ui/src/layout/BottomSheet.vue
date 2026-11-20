<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import DialogSurface from './DialogSurface.vue'

const { title = 'Sheet', description, snapPoints = [.4, .85] } = defineProps<{ title?: string; description?: string; snapPoints?: readonly number[] }>()
const open = defineModel<boolean>('open', { default: false })
const snaps = computed(() => [...new Set(snapPoints.filter(value => value > 0 && value <= 1))].sort((first, second) => first - second))
const active = shallowRef(0)
const shift = shallowRef(0)
const fraction = computed(() => snaps.value[active.value] ?? .5)
let grab: { y: number; time: number } | undefined
watch(open, () => { active.value = 0; shift.value = 0; grab = undefined })
function down(event: PointerEvent) {
  if (event.button !== 0) return
  grab = { y: event.clientY, time: performance.now() }
  ;(event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId)
}
function snap(next: number) {
  if (next < 0) open.value = false
  active.value = Math.max(0, Math.min(snaps.value.length - 1, next))
}
function release(event: PointerEvent) {
  if (!grab) return
  const delta = grab.y - event.clientY
  const velocity = delta / Math.max(1, performance.now() - grab.time)
  grab = undefined
  if (event.type === 'pointerup' && (Math.abs(delta) > 36 || Math.abs(velocity) > .48)) snap(active.value + Math.sign(delta))
  shift.value = 0
}
</script>
<template>
  <DialogSurface :open="open" kind="sheet" :label="title" :size="`calc(${fraction * 100}dvh + ${shift}px)`" @close="open = false">
    <button type="button" class="handle" aria-label="Resize sheet" @pointerdown="down" @pointermove="grab && (shift = grab.y - $event.clientY)" @pointerup="release" @pointercancel="release" @keydown.up.prevent="snap(active + 1)" @keydown.down.prevent="snap(active - 1)" @click="event => { if (!event.detail) snap(active + 1 < snaps.length ? active + 1 : 0) }"><span /></button>
    <div class="top"><strong>{{ title }}</strong><button type="button" aria-label="Close sheet" @click="open = false">×</button></div>
    <p v-if="description">{{ description }}</p><slot />
  </DialogSurface>
</template>
<style scoped>.handle { display: grid; place-items: center; width: 100%; height: 1.6rem; cursor: ns-resize; touch-action: none; } .handle span { width: 2.75rem; height: .28rem; border-radius: 99px; background: var(--beui-muted-foreground); } .top { display: flex; align-items: center; justify-content: space-between; } .top button,.handle { border: 0; background: transparent; color: inherit; } .top button { font-size: 1.4rem; cursor: pointer; } p { font-size: .85rem; color: var(--beui-muted-foreground); }</style>
