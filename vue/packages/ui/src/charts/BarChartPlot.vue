<script setup lang="ts">
/* Bars grow out of the baseline with a short stagger the first time the chart scrolls into view. Each bar is a
 * unit rect placed with translate and scale, plus a rounded cap that only translates, so value changes animate
 * transforms alone and the corners never stretch. Categories glide to a new rank when sorting reorders them; a
 * hidden series collapses into the baseline while the axis rescales. Reduced motion: no growth, glide or
 * stagger, values update in place. */
import { computed, onBeforeUnmount, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { layoutSpring, easeOut } from '../core/motion'
import { useBarChart } from './bar-chart-context'
import { useElementWidth, useInViewOnce } from './plot-utils'
import XYInspector from './XYInspector.vue'

/** Gutter for value labels (vertical bars), in px. */
const VALUE_AXIS = 44
const PAD = { top: 12, right: 12, bottom: 0 } as const
/** Fraction of each category slot the bars occupy. */
const FILL = 0.7
const GAP = 3
const MAX_BAR = 32
const MAX_STACK = 56
const RADIUS = 4
// Collapsing to an exact zero scale can leave a hairline in some browsers.
const NONE = 0.0001
const FADE = { duration: 0.16, ease: easeOut } as const
const EXIT = { opacity: 0, transition: { duration: 0.1, ease: easeOut } } as const

const { labelWidth = 96, showGrid = true, height: heightProp } = defineProps<{
  /** Plot height in px. Horizontal charts default to 36px per category. */
  height?: number
  /** Width of the category label gutter for horizontal bars, in px. */
  labelWidth?: number
  showGrid?: boolean
}>()
const { t, formatTick, label, reduce, canHover, tooltipId, grouped, vertical, data, hidden, visibleRows, highlight, order, domain, activeIndex, open, touching, plot, setActive, totals, formatValue, setOpen, setTouching, setPlot } = useBarChart()

const clipId = useId()
const stage = useTemplateRef<HTMLDivElement>('stage')
const inspection = useTemplateRef<HTMLDivElement>('inspection')
const width = useElementWidth(stage)
const inView = useInViewOnce(stage)
const intro = shallowRef(true)
let introTimer: ReturnType<typeof setTimeout> | undefined
watch(inView, value => { if (value) introTimer = setTimeout(() => { intro.value = false }, 900) })
watch(inspection, element => { setPlot(element) }, { immediate: true, flush: 'post' })
onBeforeUnmount(() => { clearTimeout(introTimer); setPlot(null) })

const count = computed(() => data.value.categories.length)
const empty = computed(() => !count.value || !data.value.rows.length)
const height = computed(() => heightProp ?? (vertical.value ? 288 : Math.max(160, count.value * 36)))
// Band axis runs along categories; value axis along magnitudes.
const bandStart = computed(() => vertical.value ? VALUE_AXIS : 0)
const bandLength = computed(() => vertical.value ? Math.max(0, width.value - VALUE_AXIS - PAD.right) : height.value)
const valueStart = computed(() => vertical.value ? height.value - PAD.bottom : labelWidth)
const valueLength = computed(() => vertical.value ? height.value - PAD.top - PAD.bottom : Math.max(0, width.value - labelWidth - PAD.right * 2))
const slot = computed(() => bandLength.value / Math.max(1, count.value))
const scale = (value: number) => value / (domain.value.max || 1) * valueLength.value
/** Value to px along the value axis, for gridlines and tick labels. */
const valueAt = (value: number) => vertical.value ? valueStart.value - scale(value) : valueStart.value + scale(value)
const k = computed(() => Math.max(1, visibleRows.value.length))
const thickness = computed(() => grouped.value
  ? Math.max(1, Math.min(MAX_BAR, (slot.value * FILL - (k.value - 1) * GAP) / k.value))
  : Math.max(1, Math.min(MAX_STACK, slot.value * FILL)))
const groupThickness = computed(() => grouped.value ? k.value * thickness.value + (k.value - 1) * GAP : thickness.value)
const radius = computed(() => Math.min(RADIUS, thickness.value / 2))
const revealed = computed(() => inView.value || reduce.value)
const spring = computed(() => reduce.value ? { duration: 0 } : layoutSpring)
const activeRank = computed(() => activeIndex.value >= 0 ? order.value.indexOf(activeIndex.value) : -1)
const stride = computed(() => {
  const gap = vertical.value ? 56 : 18
  return count.value <= 1 || bandLength.value <= 0 ? 1 : Math.max(1, Math.ceil(count.value * gap / bandLength.value))
})
const tickAt = (tick: number) => vertical.value ? { y: valueAt(tick) } : { x: valueAt(tick) }
const gridLine = computed(() => vertical.value
  ? { x1: bandStart.value, x2: bandStart.value + bandLength.value, y1: 0, y2: 0 }
  : { y1: 0, y2: height.value, x1: 0, x2: 0 })

const columns = computed(() => order.value.map((categoryIndex, rank) => {
  const name = data.value.categories[categoryIndex]
  const delay = intro.value && !reduce.value ? Math.min(rank * 0.035, 0.4) : 0
  let stack = 0
  let visibleSlot = 0
  const topRow = [...visibleRows.value].reverse().find(row => (row.values[categoryIndex] ?? 0) > 0)
  const bars = data.value.rows.map(row => {
    const isHidden = hidden.value.includes(row.id)
    const value = isHidden ? 0 : (row.values[categoryIndex] ?? 0)
    const length = revealed.value ? scale(value) : 0
    const start = grouped.value || !revealed.value ? 0 : scale(stack)
    const offset = (slot.value - groupThickness.value) / 2 + (grouped.value ? (isHidden ? (k.value - 1) / 2 : visibleSlot) * (thickness.value + GAP) : 0)
    if (!isHidden) { stack += value; visibleSlot++ }
    const capped = grouped.value || row.id === topRow?.id
    const inset = capped ? radius.value : 0
    const bodyLength = Math.max(NONE, length - inset)
    const end = start + length
    const shown = value > 0 && !isHidden
    const opacity = shown ? (highlight.value !== null && highlight.value !== row.id ? 0.25 : 1) : 0
    const body: Record<string, number> = vertical.value
      ? { x: offset, y: valueStart.value - end + inset, scaleY: bodyLength, opacity }
      : { y: offset, x: valueStart.value + start, scaleX: bodyLength, opacity }
    const cap: Record<string, number> = vertical.value
      ? { x: offset, y: valueStart.value - end, opacity }
      : { y: offset, x: valueStart.value + end - radius.value * 2, opacity }
    return { id: row.id, color: row.color, capped, body, cap, transition: { default: { ...spring.value, delay }, opacity: { duration: 0.15, ease: easeOut } } }
  })
  return { name, position: bandStart.value + rank * slot.value, rank, bars }
}))

function valueText(rank: number) {
  const index = order.value[rank]
  return [
    data.value.categories[index],
    ...visibleRows.value.map(row => {
      const value = row.values[index]
      return t('seriesValue', { name: row.name, value: value === null ? t('missing') : formatValue(value) })
    }),
    ...(!grouped.value && visibleRows.value.length > 1 ? [t('totalValue', { value: formatValue(totals.value[index]) })] : []),
  ].join('. ')
}
const plotStyle = computed(() => vertical.value
  ? { left: `${bandStart.value}px`, width: `${bandLength.value}px`, top: `${PAD.top}px`, bottom: `${PAD.bottom}px` }
  : { left: `${valueStart.value}px`, width: `${valueLength.value}px`, top: '0px', height: `${bandLength.value}px` })
const band = computed(() => ({
  width: vertical.value ? slot.value : valueLength.value + PAD.right,
  height: vertical.value ? valueLength.value : slot.value,
  x: vertical.value ? bandStart.value + Math.max(activeRank.value, 0) * slot.value : valueStart.value,
  y: vertical.value ? PAD.top : Math.max(activeRank.value, 0) * slot.value,
  opacity: open.value && activeRank.value >= 0 ? 0.05 : 0,
}))
</script>

<template>
  <div class="plot" data-slot="bar-chart-plot">
    <div ref="stage" class="stage" :style="{ height: `${height}px` }">
      <p v-if="empty" class="empty">{{ t('noData') }}</p>
      <template v-else-if="width > 0">
        <svg aria-hidden="true" class="drawing" :width="width" :height="height">
          <defs>
            <clipPath :id="clipId">
              <!-- Caps of short bars would poke through the baseline. -->
              <rect v-if="vertical" x="0" y="-16" :width="width" :height="valueStart + 16" />
              <rect v-else :x="valueStart" y="0" :width="width" :height="height" />
            </clipPath>
          </defs>
          <AnimatePresence v-if="showGrid" :initial="false">
            <motion.line v-for="tick in domain.ticks" :key="tick" tabindex="-1" v-bind="gridLine" stroke="currentColor" :stroke-opacity="tick === 0 ? 0.3 : 0.12" class="muted"
              :initial="{ opacity: 0, ...tickAt(tick) }" :animate="{ opacity: 1, ...tickAt(tick) }" :exit="EXIT" :transition="{ opacity: FADE, default: spring }" />
          </AnimatePresence>
          <!-- A soft band behind the inspected category, the full depth of the plot, gliding between slots. -->
          <motion.rect tabindex="-1" x="0" y="0" :width="band.width" :height="band.height" rx="4" fill="currentColor" class="foreground" :initial="false"
            :animate="{ x: band.x, y: band.y, opacity: band.opacity }" :transition="{ default: touching ? { duration: 0 } : spring, opacity: { duration: 0.1, ease: easeOut } }" />
          <g :clip-path="`url(#${clipId})`">
            <motion.g v-for="column in columns" :key="column.name" tabindex="-1" :initial="false" :animate="vertical ? { x: column.position } : { y: column.position }" :transition="spring">
              <g v-for="bar in column.bars" :key="bar.id" :fill="bar.color">
                <motion.rect tabindex="-1" x="0" y="0" :width="vertical ? thickness : 1" :height="vertical ? 1 : thickness" :style="{ originX: 0, originY: 0 }"
                  :initial="false" :animate="bar.body" :transition="bar.transition" />
                <motion.rect v-if="bar.capped" tabindex="-1" x="0" y="0" :width="vertical ? thickness : radius * 2" :height="vertical ? radius * 2 : thickness" :rx="radius"
                  :initial="false" :animate="bar.cap" :transition="bar.transition" />
              </g>
            </motion.g>
          </g>
        </svg>
        <template v-if="vertical">
          <AnimatePresence :initial="false">
            <motion.span v-for="tick in domain.ticks" :key="tick" aria-hidden="true" class="value-tick" :style="{ width: `${VALUE_AXIS - 8}px` }"
              :initial="{ opacity: 0, y: valueAt(tick) }" :animate="{ opacity: 1, y: valueAt(tick) }" :exit="EXIT" :transition="{ opacity: FADE, default: spring }">
              <span class="tick-y">{{ formatTick(tick) }}</span>
            </motion.span>
          </AnimatePresence>
        </template>
        <template v-else>
          <motion.span v-for="column in columns" :key="column.name" aria-hidden="true" class="row-label" :class="{ hide: column.rank % stride !== 0 }"
            :style="{ width: `${labelWidth}px`, lineHeight: `${slot}px` }" :initial="false" :animate="{ y: column.rank * slot }" :transition="spring">{{ column.name }}</motion.span>
        </template>
      </template>
      <div ref="inspection" class="inspection" :style="plotStyle">
        <XYInspector :count="count" :active-index="activeRank" :label="t('inspect', { label })" :value-text="valueText" mode="band" :orientation="vertical ? 'horizontal' : 'vertical'"
          :open="open" :described-by="tooltipId" :can-hover="canHover" @active="setActive(data.categories[order[$event]])" @update:open="setOpen($event)" @touch-change="setTouching($event)" />
      </div>
    </div>
    <div v-if="!empty" aria-hidden="true" class="categories">
      <template v-if="width > 0">
        <template v-if="vertical">
          <motion.span v-for="column in columns" :key="column.name" class="col-label" :class="{ hide: column.rank % stride !== 0 }" :style="{ width: `${slot * stride}px` }"
            :initial="false" :animate="{ x: bandStart + (column.rank + 0.5) * slot - slot * stride / 2 }" :transition="spring">{{ column.name }}</motion.span>
        </template>
        <AnimatePresence v-else :initial="false">
          <motion.span v-for="tick in domain.ticks" :key="tick" aria-hidden="true" class="value-tick x" :initial="{ opacity: 0, x: valueAt(tick) }" :animate="{ opacity: 1, x: valueAt(tick) }"
            :exit="EXIT" :transition="{ opacity: FADE, default: spring }"><span class="tick-x">{{ formatTick(tick) }}</span></motion.span>
        </AnimatePresence>
      </template>
    </div>
  </div>
</template>

<style scoped>
.plot { min-width: 0; user-select: none; }
.stage { position: relative; width: 100%; }
.drawing { position: absolute; inset: 0; overflow: visible; }
.muted { color: var(--beui-muted-foreground); }
.foreground { color: var(--beui-foreground); }
.empty { display: flex; height: 100%; margin: 0; align-items: center; justify-content: center; font-size: 14px; line-height: 20px; color: var(--beui-muted-foreground); }
.value-tick { position: absolute; top: 0; left: 0; pointer-events: none; white-space: nowrap; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.tick-y { display: block; text-align: right; transform: translateY(-50%); }
.tick-x { display: block; transform: translateX(-50%); }
.row-label { position: absolute; top: 0; left: 0; overflow: hidden; padding-right: 12px; box-sizing: border-box; text-align: right; text-overflow: ellipsis; white-space: nowrap; pointer-events: none; font-size: 12px; color: var(--beui-muted-foreground); }
.hide { visibility: hidden; }
.inspection { position: absolute; border-radius: 2px; }
.inspection:has(:focus-visible) { outline: 2px solid var(--beui-chart-ring, color-mix(in srgb, var(--beui-foreground) 12%, transparent)); outline-offset: 4px; }
.categories { position: relative; height: 16px; margin-top: 8px; }
.col-label { position: absolute; top: 0; left: 0; overflow: hidden; padding: 0 2px; box-sizing: border-box; text-align: center; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; line-height: 1.5; color: var(--beui-muted-foreground); }
</style>
