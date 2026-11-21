<script setup lang="ts">
import { nextTick, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'

/**
 * Chart tooltip surface. Mirrors the upstream `Tooltip` used with `anchorRef` + `followCursor`: it
 * follows the real pointer while one drives the chart, falls back to `anchorPoint` (fractions of the
 * anchor box) for keyboard focus, sits 12px (pointer) / 8px (point) from the reference, flips once
 * per session when it would leave the viewport, and shifts to keep an 8px margin. Pure geometry runs
 * once per frame; the entrance is the 180ms ease-out scale/fade of `TooltipSurface`.
 */
const { open, anchor = null, anchorPoint, side = 'top', id, followCursor = true, maxWidth } = defineProps<{
  open: boolean
  anchor?: Element | null
  anchorPoint?: { x: number; y: number }
  side?: 'top' | 'bottom'
  id?: string
  /** Track the real pointer over the anchor (default). Off: hang from the anchor box itself. */
  followCursor?: boolean
  /** CSS max-width of the surface, for content wider than the 16rem default. */
  maxWidth?: string
}>()
const emit = defineEmits<{ dismiss: [] }>()

const rendered = shallowRef(open)
const ready = shallowRef(false)
const positioner = useTemplateRef('positioner')
const origin = shallowRef('center bottom')
let cursor: { x: number; y: number } | null = null
let pointerFocus = false
let chosen: 'top' | 'bottom' | null = null
let frame = 0

function place() {
  frame = 0
  const element = positioner.value
  if (!open || !anchor || !element) return
  const box = anchor.getBoundingClientRect()
  const px = cursor?.x ?? box.left + box.width * (anchorPoint?.x ?? 0.5)
  const py = cursor?.y ?? (anchorPoint ? box.top + box.height * anchorPoint.y : side === 'top' ? box.top : box.bottom)
  const width = element.offsetWidth
  const height = element.offsetHeight
  const gap = cursor ? 12 : 8
  const pad = 8
  let resolved = chosen ?? side
  const fits = (which: 'top' | 'bottom') => which === 'top' ? py - gap - height >= pad : py + gap + height <= window.innerHeight - pad
  if (!fits(resolved) && fits(resolved === 'top' ? 'bottom' : 'top')) resolved = resolved === 'top' ? 'bottom' : 'top'
  if (cursor) chosen = resolved
  const x = Math.max(pad, Math.min(px - width / 2, window.innerWidth - pad - width))
  const y = resolved === 'top' ? py - gap - height : py + gap
  const ratio = window.devicePixelRatio || 1
  element.style.transform = `translate3d(${Math.round(x * ratio) / ratio}px, ${Math.round(y * ratio) / ratio}px, 0)`
  origin.value = resolved === 'top' ? 'center bottom' : 'center top'
  ready.value = true
}
function schedule() { if (!frame) frame = requestAnimationFrame(place) }

function point(event: PointerEvent) {
  if (event.type === 'pointermove' && event.pointerType === 'touch' && !event.buttons) return
  cursor = { x: event.clientX, y: event.clientY }
  if (event.type === 'pointerdown') pointerFocus = true
  schedule()
}
function keyboard() { cursor = null; pointerFocus = false; schedule() }
function focus() { if (!pointerFocus) cursor = null; pointerFocus = false; schedule() }
function leave() { cursor = null }
function scroll() { if (cursor && open) emit('dismiss'); else schedule() }

watch(() => [anchor, followCursor] as const, ([element, follow], _, cleanup) => {
  if (!element || !follow) return
  element.addEventListener('pointerenter', point as EventListener, { passive: true })
  element.addEventListener('pointermove', point as EventListener, { passive: true })
  element.addEventListener('pointerdown', point as EventListener, { passive: true })
  element.addEventListener('pointerleave', leave)
  element.addEventListener('pointercancel', leave)
  element.addEventListener('keydown', keyboard)
  element.addEventListener('focusin', focus)
  cleanup(() => {
    cursor = null
    element.removeEventListener('pointerenter', point as EventListener)
    element.removeEventListener('pointermove', point as EventListener)
    element.removeEventListener('pointerdown', point as EventListener)
    element.removeEventListener('pointerleave', leave)
    element.removeEventListener('pointercancel', leave)
    element.removeEventListener('keydown', keyboard)
    element.removeEventListener('focusin', focus)
  })
}, { immediate: true })

watch(() => open, value => {
  if (value) { rendered.value = true; chosen = null; nextTick(schedule) }
  else chosen = null
})
watch(() => [anchorPoint?.x, anchorPoint?.y, side], schedule)
watch(positioner, (element, _, cleanup) => {
  if (!element) { ready.value = false; return }
  schedule()
  const resize = new ResizeObserver(schedule)
  resize.observe(element)
  window.addEventListener('scroll', scroll, true)
  window.addEventListener('resize', schedule)
  cleanup(() => { resize.disconnect(); window.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', schedule) })
}, { flush: 'post' })
onBeforeUnmount(() => { if (frame) cancelAnimationFrame(frame) })
</script>

<template>
  <Teleport to="body">
    <span v-if="rendered" ref="positioner" class="chart-tip-position" :style="{ visibility: ready ? 'visible' : 'hidden', '--chart-tip-origin': origin }" :inert="!open || undefined" :aria-hidden="!open || undefined">
      <Transition appear name="chart-tip" @after-leave="rendered = false">
        <span v-if="open" :id="id" role="tooltip" class="chart-tip" :style="maxWidth ? { maxWidth } : undefined"><slot /></span>
      </Transition>
    </span>
  </Teleport>
</template>

<style>
.chart-tip-position { position: fixed; left: 0; top: 0; z-index: 9999; width: max-content; max-width: calc(100vw - 16px); pointer-events: none; }
.chart-tip { display: block; box-sizing: border-box; max-width: min(16rem, calc(100vw - 16px)); white-space: normal; overflow-wrap: anywhere; padding: 4px 10px; border: 1px solid var(--beui-border); border-radius: 8px; background: var(--beui-background); color: var(--beui-foreground); font-size: 12px; line-height: 16px; font-weight: 500; box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1); transform-origin: var(--chart-tip-origin, center); }
.chart-tip-enter-active { transition: opacity .18s cubic-bezier(.16, 1, .3, 1), transform .18s cubic-bezier(.16, 1, .3, 1); }
.chart-tip-leave-active { transition: opacity .12s cubic-bezier(.16, 1, .3, 1), transform .12s cubic-bezier(.16, 1, .3, 1); }
.chart-tip-enter-from, .chart-tip-leave-to { opacity: 0; transform: scale(.94); }
@media (prefers-reduced-motion: reduce) { .chart-tip-enter-from, .chart-tip-leave-to { transform: none; } }
</style>
