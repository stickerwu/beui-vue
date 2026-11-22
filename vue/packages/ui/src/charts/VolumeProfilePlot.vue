<script setup lang="ts">
import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { motion } from 'motion-v'
import { easeOut, layoutSpring } from '../core/motion'
import type { VolumeProfileRow } from './models/volume-profile'
import { useVolumeProfile } from './volume-profile-context'

// `class` styles the plot row (its height), as upstream's className does.
defineOptions({ inheritAttrs: false })
defineSlots<{
  /** Extra content placed after the plot. */
  default?(): unknown
}>()
const { showAxes = true } = defineProps<{
  /** Classes for the plot row; it defaults to 20rem tall. */
  barClass?: string
  /** Plot height is set by `class`; default 20rem. */
  showAxes?: boolean
}>()
const { t, label, model, rows, reduce, canHover, plot, tooltipId, tooltipOpen, activeIndex, setActive, color, pocColor, formatPrice, formatVolume, unit, setPlot, setTooltipOpen } = useVolumeProfile()
const element = useTemplateRef<HTMLElement>('element')
watch(element, node => { setPlot(node) }, { immediate: true, flush: 'post' })
onBeforeUnmount(() => { setPlot(null) })
const index = computed(() => Math.max(activeIndex.value, 0))
const row = computed(() => rows.value[index.value])

function describe(item: VolumeProfileRow) {
  return [
    t('range', { low: formatPrice(item.priceLow), high: formatPrice(item.priceHigh) }),
    t('amount', { volume: formatVolume(item.volume), unit: unit.value }),
    t('shareOfTotal', { share: `${(item.share * 100).toFixed(1)}%` }),
    item.isPoc ? t('poc') : item.inValueArea ? t('inside') : null,
  ].filter(Boolean).join('. ')
}

let pointerDriven = false
let focused = false
let lastPointerId: string | null = null
function inspect(event: PointerEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  if (!bounds.height) return
  const fraction = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
  // Hit-test real price geometry, including unequal bins and empty price gaps.
  const match = rows.value.find(item => fraction >= item.top && fraction <= item.top + item.height)
    ?? rows.value.reduce((nearest, item) => Math.abs(item.center - fraction) < Math.abs(nearest.center - fraction) ? item : nearest)
  setActive(match.id)
  if (lastPointerId !== match.id) setTooltipOpen(true)
  lastPointerId = match.id
}
function onFocus() {
  focused = true
  if (!pointerDriven) { setActive(row.value.id); setTooltipOpen(true) }
}
function onBlur() { focused = false; pointerDriven = false; setTooltipOpen(false) }
function onEnter(event: PointerEvent) { if (canHover.value && event.pointerType !== 'touch') inspect(event) }
function onMove(event: PointerEvent) {
  if (event.pointerType === 'touch' ? event.buttons === 1 : canHover.value || event.buttons === 1) inspect(event)
}
function onLeave() { lastPointerId = null; if (!focused || pointerDriven) setTooltipOpen(false) }
function onDown(event: PointerEvent) { pointerDriven = true; lastPointerId = null; inspect(event) }
function onCancel() { pointerDriven = false; setTooltipOpen(false) }
function onKeydown(event: KeyboardEvent) {
  pointerDriven = false
  if (event.key === 'Escape') setTooltipOpen(false)
  else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    if (activeIndex.value < 0) setActive(row.value.id)
    setTooltipOpen(true)
  }
}
function onChange(event: Event) {
  if (pointerDriven) return
  const next = rows.value[Number((event.target as HTMLInputElement).value)]
  if (next) { setActive(next.id); setTooltipOpen(true) }
}
const axis = computed(() => [1, 0.75, 0.5, 0.25, 0].map(position => ({ position, text: formatPrice(model.value.priceLow + (model.value.priceHigh - model.value.priceLow) * position) })))
const barOpacity = (item: VolumeProfileRow) => item.isPoc || item.inValueArea || !model.value.valueArea ? 0.9 : 0.3
</script>

<template>
  <p v-if="!rows.length" class="empty" :class="$attrs.class">{{ t('empty') }}</p>
  <div v-else data-slot="volume-profile-plot" class="plot-wrap" :class="{ axes: showAxes }">
    <div class="plot-row" :class="$attrs.class">
      <div v-if="showAxes" aria-hidden="true" class="y-axis">
        <span v-for="tick in axis" :key="tick.position"><span class="spacer">{{ tick.text }}</span><span class="tick" :style="{ top: `${(1 - tick.position) * 100}%` }">{{ tick.text }}</span></span>
      </div>
      <div ref="element" class="plot">
        <div aria-hidden="true" class="layers">
          <span v-for="position in [0, 0.25, 0.5, 0.75, 1]" :key="position" class="grid" :style="{ left: `${position * 100}%` }" />
          <div v-for="(item, i) in rows" :key="item.id" :data-volume-bin="item.id" :data-poc="item.isPoc || undefined" :data-value-area="item.inValueArea || undefined" class="bin" :style="{ top: `${item.top * 100}%`, height: `${item.height * 100}%` }">
            <motion.div class="bar" :class="barClass" :style="{ backgroundColor: item.isPoc ? pocColor : color, transformOrigin: 'left' }"
              :initial="{ opacity: 0, scaleX: item.proportion }" :animate="{ opacity: barOpacity(item), scaleX: item.proportion }"
              :transition="{ scaleX: reduce ? { duration: 0 } : layoutSpring, opacity: { duration: 0.18, ease: easeOut } }" />
            <motion.div class="sheen" :initial="false" :animate="{ opacity: tooltipOpen && activeIndex === i ? 1 : 0 }" :transition="{ duration: 0.1, ease: easeOut }" />
            <span v-if="item.isPoc" class="poc-line" :style="{ borderColor: pocColor }"><span class="poc-badge">{{ t('pocBadge') }}</span></span>
          </div>
        </div>
        <input type="range" :min="0" :max="rows.length - 1" :step="1" :value="index" :aria-label="t('inspect', { label })" aria-orientation="vertical"
          :aria-valuetext="describe(row)" :aria-describedby="tooltipOpen && activeIndex >= 0 ? tooltipId : undefined" class="inspector"
          @focus="onFocus" @blur="onBlur" @pointerenter="onEnter" @pointermove="onMove" @pointerleave="onLeave" @pointerdown="onDown" @pointercancel="onCancel" @click="pointerDriven = false"
          @keydown="onKeydown" @input="onChange" />
        <div v-if="showAxes" aria-hidden="true" class="x-axis"><span>0</span><span>{{ formatVolume(model.maxVolume / 2) }}</span><span>{{ formatVolume(model.maxVolume) }}</span></div>
      </div>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.empty { margin: 0; padding: 48px 0; text-align: center; font-size: 14px; color: var(--beui-muted-foreground); }
.plot-wrap { min-width: 0; }
.plot-wrap.axes { padding-bottom: 24px; }
.plot-row { display: flex; gap: 12px; min-width: 0; height: 20rem; }
.y-axis { position: relative; flex: none; text-align: right; font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-size: 12px; line-height: 16px; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.spacer { display: block; visibility: hidden; }
.tick { position: absolute; right: 0; transform: translateY(-50%); }
@media (max-width: 639px) { .y-axis, .x-axis { font-size: 10px; } }
.plot { position: relative; flex: 1; min-width: 0; border-radius: 2px; }
.plot:has(:focus-visible) { outline: 2px solid var(--beui-ring); outline-offset: 4px; }
.layers { position: absolute; inset: 0; pointer-events: none; }
.grid { position: absolute; top: 0; bottom: 0; border-left: 1px solid color-mix(in srgb, var(--beui-border) 60%, transparent); }
.bin { position: absolute; left: 0; right: 0; overflow: hidden; padding-block: 1px; box-sizing: border-box; }
.bar { width: 100%; height: 100%; border-radius: 0 2px 2px 0; }
.sheen { position: absolute; inset: 0; background: color-mix(in srgb, var(--beui-foreground) 5%, transparent); }
.poc-line { position: absolute; left: 0; right: 0; top: 50%; border-top: 1px dashed; }
.poc-badge { position: absolute; right: 0; transform: translateY(-50%); padding: 2px 6px; border-radius: 4px; background: var(--beui-background); color: var(--beui-foreground); font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-size: 10px; line-height: 1.5; font-weight: 500; }
.inspector { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: crosshair; writing-mode: vertical-lr; direction: rtl; touch-action: pan-x; }
.x-axis { position: absolute; left: 0; right: 0; top: 100%; display: flex; justify-content: space-between; margin-top: 8px; font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-size: 12px; line-height: 16px; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
</style>
