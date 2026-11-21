<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const barChartMessages = {
  label: 'Bar chart', inspect: '{label}: inspect categories', noData: 'No data', missing: 'no data', dataCaption: '{label} data',
  category: 'Category', total: 'Total', series: 'Series', seriesValue: '{name} {value}', totalValue: 'Total {value}',
}
export type BarChartMessages = typeof barChartMessages
</script>

<script setup lang="ts">
/* Bars grow out of the baseline with a short stagger the first time the chart scrolls into view. Each bar is a
 * unit rect placed with translate and scale, plus a rounded cap that only translates, so value changes animate
 * transforms alone and the corners never stretch. Categories glide to a new rank when sorting reorders them; a
 * hidden series collapses into the baseline while the axis rescales. Reduced motion: no growth, glide or
 * stagger, values update in place. */
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import NumberTicker from '../numeric/NumberTicker.vue'
import { layoutSpring, easeOut } from '../core/motion'
import { normalizeChart, valueAxis, type LineChartSeries } from '../graphics/chart-geometry'
import ChartTip from './ChartTip.vue'
import XYInspector from './XYInspector.vue'
import XYLegend from './XYLegend.vue'
import { interpolate, SR_ONLY, useHoverCapable } from './plot-utils'

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

const props = withDefaults(defineProps<{
  series: readonly LineChartSeries[]; categories: readonly string[]; layout?: 'stacked' | 'grouped'; orientation?: 'vertical' | 'horizontal'
  sort?: 'none' | 'ascending' | 'descending'; max?: number; activeId?: string | null; defaultActiveId?: string | null
  hiddenSeries?: readonly string[]; defaultHiddenSeries?: readonly string[]; formatValue?: (value: number) => string
  formatTick?: (value: number) => string; label?: string; labels?: Partial<BarChartMessages>
  /** Plot height in px. Horizontal charts default to 36px per category. */
  height?: number
  /** Width of the category label gutter for horizontal bars, in px. */
  labelWidth?: number
  showGrid?: boolean
}>(), { layout: 'grouped', orientation: 'vertical', labelWidth: 96, showGrid: true })
const emit = defineEmits<{ 'update:activeId': [id: string | null]; 'update:hiddenSeries': [ids: string[]]; activeChange: [id: string | null]; hiddenSeriesChange: [ids: string[]] }>()

const decimal = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const t = (key: keyof BarChartMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? barChartMessages[key], values)
const formatValue = (value: number) => (props.formatValue ?? decimal.format)(value)
const formatTick = (value: number) => (props.formatTick ?? compact.format)(value)
const title = computed(() => props.label ?? t('label'))
const reduce = useReducedMotion()
const canHover = useHoverCapable()
const tooltipId = useId()
const clipId = useId()

const data = computed(() => normalizeChart(props.series.map(row => ({ ...row, values: row.values.map(value => value !== null && value >= 0 ? value : null) })), props.categories))
const hiddenInternal = shallowRef<readonly string[]>(props.defaultHiddenSeries ?? [])
const hidden = computed(() => props.hiddenSeries ?? hiddenInternal.value)
const visibleRows = computed(() => data.value.rows.filter(row => !hidden.value.includes(row.id)))
const hovered = shallowRef<string | null>(null)
const highlight = computed(() => visibleRows.value.some(row => row.id === hovered.value) ? hovered.value : null)
const totals = computed(() => data.value.categories.map((_, index) => visibleRows.value.reduce((sum, row) => sum + (row.values[index] ?? 0), 0)))
// Visual order. Ties keep their given order so equal bars never swap places.
const order = computed(() => {
  const ranks = data.value.categories.map((_, index) => index)
  if (props.sort === 'ascending') ranks.sort((a, b) => totals.value[a] - totals.value[b] || a - b)
  else if (props.sort === 'descending') ranks.sort((a, b) => totals.value[b] - totals.value[a] || a - b)
  return ranks
})
const grouped = computed(() => props.layout !== 'stacked')
const vertical = computed(() => props.orientation !== 'horizontal')
const domain = computed(() => valueAxis(grouped.value ? visibleRows.value : [{ id: '', name: '', color: '', values: totals.value }], true,
  props.max !== undefined && props.max > 0 ? [0, props.max] : undefined))

// The inspected category is held by id and resolved during render.
const internalActive = shallowRef<string | null>(props.defaultActiveId ?? null)
const requested = computed(() => props.activeId === undefined ? internalActive.value : props.activeId)
const activeIndex = computed(() => requested.value === null ? -1 : data.value.categories.indexOf(requested.value))
watch([data, requested], () => { if (props.activeId === undefined && internalActive.value !== null && activeIndex.value < 0) internalActive.value = null }, { immediate: true })
const open = shallowRef(false)
const touching = shallowRef(false)
function setActive(id: string) {
  if (props.activeId === undefined) internalActive.value = id
  if (requested.value !== id) { emit('update:activeId', id); emit('activeChange', id) }
}
function toggle(id: string) {
  const next = hidden.value.includes(id) ? hidden.value.filter(key => key !== id) : [...hidden.value, id]
  if (props.hiddenSeries === undefined) hiddenInternal.value = next
  emit('update:hiddenSeries', next); emit('hiddenSeriesChange', next)
}

const stage = useTemplateRef<HTMLDivElement>('stage')
const plot = useTemplateRef<HTMLDivElement>('plot')
const width = shallowRef(0)
const inView = shallowRef(false)
const intro = shallowRef(true)
let resizeObserver: ResizeObserver | undefined
let intersection: IntersectionObserver | undefined
let introTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  const element = stage.value
  if (!element) return
  width.value = element.clientWidth
  resizeObserver = new ResizeObserver(() => { width.value = element.clientWidth })
  resizeObserver.observe(element)
  if ('IntersectionObserver' in window) {
    intersection = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { inView.value = true; intersection?.disconnect() }
    }, { threshold: 0.3 })
    intersection.observe(element)
  } else inView.value = true
})
watch(inView, value => { if (value) introTimer = setTimeout(() => { intro.value = false }, 900) })
onBeforeUnmount(() => { resizeObserver?.disconnect(); intersection?.disconnect(); clearTimeout(introTimer) })

const count = computed(() => data.value.categories.length)
const empty = computed(() => !count.value || !data.value.rows.length)
const height = computed(() => props.height ?? (vertical.value ? 288 : Math.max(160, count.value * 36)))
// Band axis runs along categories; value axis along magnitudes.
const bandStart = computed(() => vertical.value ? VALUE_AXIS : 0)
const bandLength = computed(() => vertical.value ? Math.max(0, width.value - VALUE_AXIS - PAD.right) : height.value)
const valueStart = computed(() => vertical.value ? height.value - PAD.bottom : props.labelWidth)
const valueLength = computed(() => vertical.value ? height.value - PAD.top - PAD.bottom : Math.max(0, width.value - props.labelWidth - PAD.right * 2))
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

const tooltipRows = computed(() => visibleRows.value.map(row => ({ id: row.id, name: row.name, color: row.color, value: row.values[activeIndex.value] ?? null })))
const category = computed(() => data.value.categories[activeIndex.value])
const total = computed(() => totals.value[activeIndex.value] ?? 0)
const anchorPoint = computed(() => {
  const reach = grouped.value ? Math.max(0, ...tooltipRows.value.map(row => row.value ?? 0)) : total.value
  const along = Math.min(1, reach / (domain.value.max || 1))
  const across = (Math.max(activeRank.value, 0) + 0.5) / Math.max(count.value, 1)
  return vertical.value ? { x: across, y: 1 - along } : { x: along, y: across }
})
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
  <section class="bar-chart" :aria-label="title" data-slot="bar-chart">
    <div class="plot">
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
        <div ref="plot" class="inspection" :style="plotStyle">
          <XYInspector :count="count" :active-index="activeRank" :label="t('inspect', { label: title })" :value-text="valueText" mode="band" :orientation="vertical ? 'horizontal' : 'vertical'"
            :open="open" :described-by="tooltipId" :can-hover="canHover" @active="setActive(data.categories[order[$event]])" @update:open="open = $event" @touch-change="touching = $event" />
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
    <ChartTip :id="tooltipId" :open="open && category !== undefined" :anchor="plot" follow-cursor :anchor-point="anchorPoint" side="top" max-width="16rem" @dismiss="open = false">
      <span v-if="category !== undefined" class="bar-tip">
        <span class="bar-tip-title">{{ category }}</span>
        <span class="bar-tip-rows">
          <span v-for="row in tooltipRows" :key="row.id" class="bar-tip-row">
            <span aria-hidden="true" class="bar-tip-dot" :style="{ backgroundColor: row.color }" />
            <span class="bar-tip-name">{{ row.name }}</span>
            <span class="bar-tip-value">{{ row.value === null ? t('noData') : '' }}<NumberTicker v-if="row.value !== null" :value="row.value" :format="() => formatValue(row.value!)" :start-on-view="false" :duration="0.2" :stagger="0" class-name="ws" /></span>
          </span>
          <span v-if="!grouped && tooltipRows.length > 1" class="bar-tip-row total">
            <span class="bar-tip-name">{{ t('total') }}</span>
            <span class="bar-tip-value strong"><NumberTicker :value="total" :format="() => formatValue(total)" :start-on-view="false" :duration="0.2" :stagger="0" class-name="ws" /></span>
          </span>
        </span>
      </span>
    </ChartTip>
    <XYLegend v-if="data.rows.length > 1" class="legend" :rows="data.rows" :hidden="hidden" :can-hover="canHover" :label="t('series')" @toggle="toggle" @hover="hovered = $event" />
    <div :style="SR_ONLY">
      <table>
        <caption>{{ t('dataCaption', { label: title }) }}</caption>
        <thead><tr><th scope="col">{{ t('category') }}</th><th v-for="row in data.rows" :key="row.id" scope="col">{{ row.name }}</th></tr></thead>
        <tbody><tr v-for="(name, index) in data.categories" :key="name"><th scope="row">{{ name }}</th><td v-for="row in data.rows" :key="row.id">{{ row.values[index] === null ? t('noData') : formatValue(row.values[index]!) }}</td></tr></tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.bar-chart { position: relative; width: 100%; min-width: 0; display: grid; gap: 12px; }
.plot { min-width: 0; user-select: none; }
.stage { position: relative; width: 100%; }
.drawing { position: absolute; inset: 0; overflow: visible; }
.muted { color: var(--beui-muted-foreground); }
.foreground { color: var(--beui-foreground); }
.empty { display: flex; height: 100%; margin: 0; align-items: center; justify-content: center; font-size: 14px; line-height: 20px; color: var(--beui-muted-foreground); }
.value-tick { position: absolute; top: 0; left: 0; pointer-events: none; white-space: nowrap; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 11px; line-height: 1.3333; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.tick-y { display: block; text-align: right; transform: translateY(-50%); }
.tick-x { display: block; transform: translateX(-50%); }
.row-label { position: absolute; top: 0; left: 0; overflow: hidden; padding-right: 12px; box-sizing: border-box; text-align: right; text-overflow: ellipsis; white-space: nowrap; pointer-events: none; font-size: 12px; color: var(--beui-muted-foreground); }
.hide { visibility: hidden; }
.inspection { position: absolute; border-radius: 2px; }
.inspection:has(:focus-visible) { outline: 2px solid var(--beui-chart-ring, color-mix(in srgb, var(--beui-foreground) 12%, transparent)); outline-offset: 4px; }
.categories { position: relative; height: 16px; margin-top: 8px; }
.col-label { position: absolute; top: 0; left: 0; overflow: hidden; padding: 0 2px; box-sizing: border-box; text-align: center; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; line-height: 1.3333; color: var(--beui-muted-foreground); }
.legend { min-width: 0; }
</style>

<!-- Tooltip content is teleported to the body, so its rules cannot be scoped. -->
<style>
.bar-tip { display: block; min-width: 9rem; max-width: 100%; }
.bar-tip-title { display: block; margin-bottom: 6px; font-size: 12px; line-height: 1.3333; font-weight: 500; }
.bar-tip-rows { display: grid; gap: 4px; }
.bar-tip-row { display: flex; align-items: center; gap: 8px; font-size: 11px; line-height: 1.3333; }
.bar-tip-dot { flex: none; width: 4px; height: 10px; border-radius: 9999px; }
.bar-tip-name { min-width: 0; flex: 1; overflow: hidden; padding-right: 12px; text-overflow: ellipsis; white-space: nowrap; color: var(--beui-muted-foreground); }
.bar-tip-value { flex: none; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-variant-numeric: tabular-nums; }
.bar-tip-value .ws { white-space: pre; }
.bar-tip-row.total { margin-top: 2px; padding-top: 6px; border-top: 1px solid var(--beui-border); }
.bar-tip-row.total .bar-tip-name { padding-right: 0; }
.bar-tip-value.strong { font-weight: 500; }
</style>
