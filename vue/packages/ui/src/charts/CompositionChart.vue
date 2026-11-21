<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const compositionChartMessages = {
  label: 'Composition over time',
  empty: 'No composition data',
  noData: 'No data',
  inspect: 'Inspect period',
  highlight: 'Highlight {name}',
  missingValue: 'Missing value',
  incomplete: 'No complete data for this period.',
}
export type CompositionChartMessages = typeof compositionChartMessages
export interface CompositionSeries {
  id: string
  name: string
  color: string
  /** Nonnegative values aligned with periods. Missing/invalid values leave a gap. */
  values: readonly (number | null)[]
}
</script>

<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import NumberTicker from '../numeric/NumberTicker.vue'
import ChartTip from './ChartTip.vue'
import { interpolate, useHoverCapable } from './plot-utils'
import { layoutSpring } from '../core/motion'

const props = withDefaults(defineProps<{
  series: readonly CompositionSeries[]; periods: readonly string[]; view?: 'area' | 'bar'; period?: string; defaultPeriod?: string
  formatValue?: (value: number) => string; label?: string; labels?: Partial<CompositionChartMessages>
}>(), { view: 'bar', formatValue: (value: number) => value.toLocaleString('en', { maximumFractionDigits: 2 }) })
const emit = defineEmits<{ 'update:period': [period: string]; periodChange: [period: string] }>()
const t = (key: keyof CompositionChartMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? compositionChartMessages[key], values)
const title = computed(() => props.label ?? t('label'))

const model = computed(() => {
  const seen = new Set<string>()
  const rows = props.series.filter(row => !seen.has(row.id) && !!seen.add(row.id))
  const periodIds = new Set<string>()
  const columns = props.periods.flatMap((id, position) => {
    if (periodIds.has(id)) return []
    periodIds.add(id)
    const values = rows.map(row => row.values[position])
    const valid = values.length > 0 && values.every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    // Scale before summing so large finite input values cannot overflow shares.
    const max = valid ? Math.max(0, ...values.map(value => value ?? 0)) : 0
    const scaledTotal = max > 0 ? values.reduce<number>((sum, value) => sum + (value ?? 0) / max, 0) : 0
    let offset = 0
    const segments = rows.map((row, at) => {
      const value = values[at] ?? null
      const share = scaledTotal > 0 ? (value ?? 0) / max / scaledTotal * 100 : 0
      const segment = { ...row, value, share, offset }
      offset += share
      return segment
    })
    return [{ id, valid: valid && scaledTotal > 0, segments }]
  })
  return { rows, columns }
})
const rows = computed(() => model.value.rows)
const columns = computed(() => model.value.columns)

const internal = shallowRef(props.defaultPeriod)
const pinned = shallowRef<string | null>(null)
const hovered = shallowRef<string | null>(null)
const focused = shallowRef<string | null>(null)
const known = (id: string | null) => rows.value.some(row => row.id === id)
const highlight = computed(() => [hovered.value, focused.value, pinned.value].find(id => id !== null && known(id)) ?? null)
const index = computed(() => {
  const selected = props.period === undefined ? internal.value : props.period
  const found = columns.value.findIndex(column => column.id === selected)
  return found >= 0 ? found : columns.value.length - 1
})
const column = computed(() => columns.value[index.value])
function select(next: string) {
  if (props.period === undefined) internal.value = next
  if (next !== columns.value[index.value]?.id) { emit('update:period', next); emit('periodChange', next) }
}

/** Separate polygons for contiguous runs; unknown periods never become interpolated data. */
const areas = computed(() => rows.value.map((row, rowAt) => {
  const paths: string[] = []
  let run: number[] = []
  const count = columns.value.length
  const flush = () => {
    if (!run.length) return
    const top = run.map(at => {
      const segment = columns.value[at].segments[rowAt]
      return `${(at + 0.5) / count * 100},${100 - segment.offset - segment.share}`
    })
    const bottom = [...run].reverse().map(at => `${(at + 0.5) / count * 100},${100 - columns.value[at].segments[rowAt].offset}`)
    // A single sample gets a column-width footprint instead of an invisible polygon.
    if (run.length === 1) {
      const at = run[0]
      const segment = columns.value[at].segments[rowAt]
      const left = at / count * 100
      const right = (at + 1) / count * 100
      paths.push(`M${left},${100 - segment.offset} L${left},${100 - segment.offset - segment.share} L${right},${100 - segment.offset - segment.share} L${right},${100 - segment.offset} Z`)
    } else paths.push(`M${top.join(' L')} L${bottom.join(' L')} Z`)
    run = []
  }
  columns.value.forEach((entry, at) => { if (entry.valid) run.push(at); else flush() })
  flush()
  return { ...row, path: paths.join(' ') }
}))

const reduced = useReducedMotion()
const canHover = useHoverCapable()
const tooltipId = useId()
const anchor = useTemplateRef<HTMLElement>('anchor')
const tooltipOpen = shallowRef(false)
const touching = shallowRef(false)
let pointerDriven = false
function inspectPointer(event: PointerEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  if (!bounds.width || !bounds.height || !columns.value.length) return
  const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
  select(columns.value[Math.min(columns.value.length - 1, Math.floor(x * columns.value.length))].id)
}
function pointerenter(event: PointerEvent) {
  if (event.pointerType !== 'touch' && !event.buttons) { inspectPointer(event); tooltipOpen.value = true }
}
function pointerdown(event: PointerEvent) {
  pointerDriven = true
  if (event.pointerType === 'touch') touching.value = true
  inspectPointer(event)
  tooltipOpen.value = true
}
function pointerup() { pointerDriven = false; touching.value = false }
function pointercancel() { pointerDriven = false; touching.value = false; tooltipOpen.value = false }
function pointermove(event: PointerEvent) {
  if (event.pointerType === 'touch' ? event.buttons === 1 : canHover.value) inspectPointer(event)
}
function blur() { pointerDriven = false; tooltipOpen.value = false }
function keydown(event: KeyboardEvent) { pointerDriven = false; if (event.key === 'Escape') tooltipOpen.value = false }
function change(event: Event) {
  // The range thumb and equal-width chart columns round differently.
  // Pointer selection has one source; native changes are for keyboard/AT.
  if (pointerDriven) return
  select(columns.value[Number((event.target as HTMLInputElement).value)].id)
  tooltipOpen.value = true
}
function legendKey(event: KeyboardEvent) {
  if (event.key === 'Escape') { pinned.value = null; hovered.value = null; focused.value = null }
}
const crosshair = computed(() => ({ x: (index.value + 0.5) / Math.max(1, columns.value.length) * 100 }))
const glide = computed(() => reduced.value || touching.value ? { duration: 0 } : layoutSpring)
</script>

<template>
  <section class="composition" :aria-label="title">
    <div v-if="!columns.length || !rows.length" class="empty">{{ t('empty') }}</div>
    <div v-else class="grid">
      <div class="plot">
        <div class="head"><span>{{ column?.id }}{{ column?.valid ? '' : ` · ${t('noData')}` }}</span><span class="mono">100%</span></div>
        <div ref="anchor" class="box" @pointerleave="tooltipOpen = false" @pointerenter="pointerenter" @pointerdown="pointerdown" @pointerup="pointerup" @pointercancel="pointercancel" @pointermove="pointermove">
          <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line v-for="y in [0, 25, 50, 75, 100]" :key="y" x1="0" x2="100" :y1="y" :y2="y" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" class="rule" />
            <template v-if="view === 'area'">
              <path v-for="row in areas" :key="row.id" class="area" :d="row.path" :fill="row.color" :style="{ opacity: highlight && highlight !== row.id ? 0.18 : 0.9 }" />
            </template>
            <template v-else>
              <template v-for="(col, at) in columns" :key="col.id">
                <template v-if="col.valid">
                  <rect v-for="segment in col.segments" :key="segment.id" class="bar" :x="at / columns.length * 100 + 10 / columns.length" :width="80 / columns.length"
                    :y="100 - segment.offset - segment.share" :height="segment.share" :fill="segment.color" :style="{ opacity: highlight && highlight !== segment.id ? 0.18 : 0.9 }" />
                </template>
              </template>
            </template>
            <motion.line :initial="false" :animate="{ x: crosshair.x }" :transition="glide" x1="0" x2="0" y1="0" y2="100" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="3 3" class="cross" />
          </svg>
          <input type="range" class="range" :aria-label="t('inspect')" min="0" :max="columns.length - 1" step="1" :value="index" :aria-valuetext="column?.id"
            :aria-describedby="tooltipOpen ? tooltipId : undefined" @focus="tooltipOpen = true" @blur="blur" @pointerdown="tooltipOpen = true" @keydown="keydown" @change="change" @input="change">
        </div>
        <ChartTip :id="tooltipId" :open="tooltipOpen" :anchor="anchor" :anchor-point="{ x: (index + 0.5) / columns.length, y: 0.3 }" side="top" max-width="calc(100vw - 1rem)" @dismiss="tooltipOpen = false">
          <span v-if="column" class="tip">
            <span class="tip-title">{{ column.id }}</span>
            <span v-if="column.valid" class="tip-rows">
              <span v-for="row in column.segments" :key="row.id" class="tip-row">
                <span class="tip-dot" aria-hidden="true" :style="{ backgroundColor: row.color }" />
                <span class="tip-name">{{ row.name }}</span>
                <span class="tip-value" :title="formatValue(row.value ?? 0)"><NumberTicker :value="row.value ?? 0" :format="() => formatValue(row.value ?? 0)" :start-on-view="false" :duration="0.2" :stagger="0" class-name="ws" /></span>
                <span class="tip-share"><NumberTicker :value="row.share" :format="() => row.share.toFixed(1)" suffix="%" :start-on-view="false" :duration="0.2" :stagger="0" /></span>
              </span>
            </span>
            <span v-else class="tip-missing">{{ t('incomplete') }}</span>
          </span>
        </ChartTip>
        <div class="axis"><span>{{ columns[0].id }}</span><span>{{ columns[columns.length - 1]?.id }}</span></div>
      </div>
      <div v-if="column" class="legend">
        <button v-for="row in column.segments" :key="row.id" type="button" :aria-label="t('highlight', { name: row.name })" :aria-pressed="pinned === row.id"
          :class="{ pinned: pinned === row.id, dim: highlight && highlight !== row.id }"
          @click="pinned = pinned === row.id ? null : row.id" @pointerenter="canHover && (hovered = row.id)" @pointerleave="hovered = null"
          @focus="focused = row.id" @blur="focused = null" @keydown="legendKey">
          <span class="swatch" aria-hidden="true" :style="{ backgroundColor: row.color }" />
          <span class="text"><span class="name">{{ row.name }}</span><span class="value mono" :title="row.value === null ? t('missingValue') : formatValue(row.value)">{{ column.valid ? `${row.share.toFixed(1)}%` : '—' }}</span></span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.composition { container-type: inline-size; width: 100%; font-family: inherit; }
.composition > * + * { margin-top: 16px; }
.grid { display: grid; gap: 16px; }
.empty { display: flex; min-height: 16rem; align-items: center; justify-content: center; font-size: 14px; color: var(--beui-muted-foreground); }
.plot { min-width: 0; }
.plot > * + * { margin-top: 12px; }
.head, .axis { display: flex; justify-content: space-between; gap: 16px; font-size: 11px; line-height: 1.5; color: var(--beui-muted-foreground); }
.mono { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); }
.box { position: relative; height: 16rem; }
@media (min-width: 640px) { .box { height: 20rem; } }
.box:has(:focus-visible) { outline: 2px solid color-mix(in srgb, var(--beui-foreground) 12%, transparent); outline-offset: 4px; }
svg { display: block; width: 100%; height: 100%; overflow: visible; }
.rule { color: var(--beui-border); }
.cross { color: color-mix(in srgb, var(--beui-foreground) 70%, transparent); }
.bar { transition: opacity .2s cubic-bezier(.16, 1, .3, 1); }
.area { transition: opacity .18s ease; animation: composition-in .18s ease both; }
@keyframes composition-in { from { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .bar, .area { transition: none; } }
.range { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: crosshair; }
.axis { margin-top: 12px; }
.legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; min-width: 0; }
@container (min-width: 480px) { .legend { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@container (min-width: 900px) { .legend { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
.legend button { display: flex; align-items: center; gap: 10px; min-width: 0; min-height: 48px; padding: 6px 8px; border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; font-size: 12px; line-height: 16px; text-align: left; cursor: pointer; transition: opacity .15s; }
.legend button.pinned { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); }
.legend button.dim { opacity: .4; }
.legend button:focus-visible { outline: 2px solid color-mix(in srgb, var(--beui-foreground) 12%, transparent); outline-offset: 2px; }
.swatch { flex: none; width: 4px; height: 24px; border-radius: 9999px; }
.text { display: grid; gap: 2px; min-width: 0; }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--beui-muted-foreground); }
.value { font-variant-numeric: tabular-nums; }
.tip { display: block; width: 18rem; max-width: 100%; min-width: 0; text-align: left; line-height: 1.3333; }
.tip-title { display: block; margin-bottom: 8px; font-size: 12px; font-weight: 500; }
.tip-rows { display: grid; gap: 8px; }
.tip-row { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.tip-dot { flex: none; width: 6px; height: 6px; border-radius: 9999px; }
.tip-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tip-value { flex: none; max-width: 7rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--beui-muted-foreground); font-variant-numeric: tabular-nums; }
.tip-share { flex: none; width: 3rem; text-align: right; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-variant-numeric: tabular-nums; }
.tip-missing { display: block; font-size: 12px; color: var(--beui-muted-foreground); }
:deep(.ws) { white-space: pre; }
</style>
