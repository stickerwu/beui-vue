<script setup lang="ts">
import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { motion } from 'motion-v'
import { easeOut, pressSpring } from '../core/motion'
import { useStatusBar } from './status-bar-context'

// Spread a short entrance across the entire history, even with hundreds of periods.
const ENTRANCE_SPAN = 0.18
const ENTRANCE_TRANSFORM = ['translateY(4px) scaleY(0.9)', 'translateY(0px) scaleY(1)']

defineSlots<{
  /** Extra content placed under the bar and its end labels. */
  default?(): unknown
}>()
const { showLabels = true } = defineProps<{
  /** Customize segment height and roundness independently of the 44px hit area. */
  barClass?: string
  showLabels?: boolean
}>()
const { rows, label, activeIndex, setActive, plot, tooltipId, tooltipOpen, reduce, canHover, t, setPlot, setTooltipOpen } = useStatusBar()
const box = useTemplateRef<HTMLElement>('box')
watch(box, element => { setPlot(element) }, { immediate: true, flush: 'post' })
onBeforeUnmount(() => { setPlot(null) })

let pointerDriven = false
let focused = false
let lastPointerId: string | null = null
const index = computed(() => Math.max(activeIndex.value, 0))
const row = computed(() => rows.value[index.value])
function inspectPointer(event: PointerEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  if (!bounds.width) return
  const fraction = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
  const id = rows.value[Math.min(rows.value.length - 1, Math.floor(fraction * rows.value.length))].datum.id
  setActive(id)
  if (lastPointerId !== id) setTooltipOpen(true)
  lastPointerId = id
}
const onFocus = () => { focused = true; if (!pointerDriven) { setActive(row.value.datum.id); setTooltipOpen(true) } }
const onBlur = () => { focused = false; pointerDriven = false; setTooltipOpen(false) }
const onPointerEnter = (event: PointerEvent) => { if (canHover.value && event.pointerType !== 'touch') inspectPointer(event) }
const onPointerMove = (event: PointerEvent) => {
  if (event.pointerType === 'touch' ? event.buttons === 1 : canHover.value || event.buttons === 1) inspectPointer(event)
}
const onPointerLeave = () => { lastPointerId = null; if (!focused || pointerDriven) setTooltipOpen(false) }
const onPointerDown = (event: PointerEvent) => { pointerDriven = true; lastPointerId = null; inspectPointer(event) }
const onPointerCancel = () => { pointerDriven = false; setTooltipOpen(false) }
// Native range changes finish before click. Release the pointer guard so assistive-technology changes are accepted.
const onClick = () => { pointerDriven = false }
function onKeyDown(event: KeyboardEvent) {
  pointerDriven = false
  if (event.key === 'Escape') setTooltipOpen(false)
  else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) setTooltipOpen(true)
}
function onChange(event: Event) {
  // Native thumb travel differs from equal-width bars. Pointer hit testing owns pointer gestures; the range owns keyboard and AT input.
  if (pointerDriven) return
  const next = rows.value[Number((event.target as HTMLInputElement).value)]
  if (next) { setActive(next.datum.id); setTooltipOpen(true) }
}

const entrance = computed(() => reduce.value ? { opacity: 1 } : { opacity: 1, transform: ENTRANCE_TRANSFORM })
const transitionAt = (position: number) => {
  const delay = reduce.value ? 0 : position / Math.max(rows.value.length - 1, 1) * ENTRANCE_SPAN
  return { opacity: { duration: reduce.value ? 0.15 : 0.24, ease: easeOut, delay }, transform: { ...pressSpring, delay } }
}
</script>

<template>
  <p v-if="!rows.length" class="empty">{{ t('empty') }}</p>
  <div v-else class="plot" data-slot="status-bar-plot">
    <div ref="box" class="box">
      <div class="bars" aria-hidden="true">
        <motion.span v-for="({ datum, status }, position) in rows" :key="datum.id" class="bar" :class="barClass" :data-status-period="datum.id" :data-status="status.id"
          :initial="{ opacity: 0 }" :while-in-view="entrance" :viewport="{ once: true }" :transition="transitionAt(position)">
          <!-- Stable period keys keep the history still. Only the changed color layer crossfades when a new status arrives. -->
          <Transition name="status-color">
            <span :key="`${status.id}:${status.color}`" class="color" :style="{ backgroundColor: status.color }" />
          </Transition>
          <span class="ring" :style="{ opacity: tooltipOpen && activeIndex === position ? 1 : 0 }" />
        </motion.span>
      </div>
      <input type="range" class="range" :aria-label="t('inspect', { label })" min="0" :max="rows.length - 1" step="1" :value="index"
        :aria-valuetext="[row.datum.label, row.status.label, row.datum.description].filter(Boolean).join('. ')"
        :aria-describedby="tooltipOpen && activeIndex >= 0 ? tooltipId : undefined"
        @focus="onFocus" @blur="onBlur" @pointerenter="onPointerEnter" @pointermove="onPointerMove" @pointerleave="onPointerLeave"
        @pointerdown="onPointerDown" @pointercancel="onPointerCancel" @click="onClick" @keydown="onKeyDown" @change="onChange" @input="onChange">
    </div>
    <div v-if="showLabels" class="ends"><span>{{ rows[0].datum.label }}</span><span>{{ rows[rows.length - 1].datum.label }}</span></div>
    <slot />
  </div>
</template>

<style scoped>
.empty { margin: 0; padding: 16px 0; font-size: 14px; color: var(--beui-muted-foreground); }
.plot { min-width: 0; }
.plot > * + * { margin-top: 6px; }
.box { position: relative; height: 44px; border-radius: 6px; }
.box:has(:focus-visible) { outline: 2px solid color-mix(in srgb, var(--beui-foreground) 12%, transparent); outline-offset: 4px; }
.bars { display: flex; height: 100%; align-items: center; gap: 2px; }
@media (min-width: 640px) { .bars { gap: 4px; } }
.bar { position: relative; display: block; flex: 1 1 0%; min-width: 0; height: 32px; border-radius: 9999px; }
.color, .ring { position: absolute; border-radius: inherit; pointer-events: none; }
.color { inset: 0; }
.ring { inset: -2px; box-shadow: 0 0 0 1px color-mix(in srgb, var(--beui-foreground) 60%, transparent); transition: opacity .1s cubic-bezier(.16, 1, .3, 1); }
.status-color-enter-active { transition: opacity .16s cubic-bezier(.16, 1, .3, 1); }
.status-color-leave-active { transition: opacity .12s cubic-bezier(.16, 1, .3, 1); }
.status-color-enter-from, .status-color-leave-to { opacity: 0; }
.range { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: crosshair; }
.ends { display: flex; justify-content: space-between; gap: 16px; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
</style>
