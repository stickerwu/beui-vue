<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { normalizeChart, type LineChartSeries } from '../graphics/chart-geometry'
import ChartInspector from './ChartInspector.vue'

const props = withDefaults(defineProps<{
  series: readonly LineChartSeries[]; periods: readonly string[]; view?: 'area' | 'bar'; period?: string; defaultPeriod?: string
  formatValue?: (value: number) => string; label?: string; labels?: Partial<Record<string, string>>
}>(), { view: 'bar', formatValue: (value: number) => value.toLocaleString('en-US') })
const emit = defineEmits<{ 'update:period': [period: string]; periodChange: [period: string] }>()
const internal = shallowRef(props.defaultPeriod)
const pinned = shallowRef<string | null>(null)
const hovered = shallowRef<string | null>(null)
const inspecting = shallowRef(false)
const highlight = computed(() => hovered.value ?? pinned.value)
const normalized = computed(() => normalizeChart(props.series, props.periods))
const columns = computed(() => normalized.value.categories.map((period, index) => {
  const rows = normalized.value.rows
  const values = rows.map(row => row.values[index])
  const max = Math.max(0, ...values.map(value => value ?? 0))
  const valid = max > 0 && values.every(value => value !== null && value >= 0)
  const total = valid ? values.reduce<number>((sum, value) => sum + (value ?? 0) / max, 0) : 0
  let offset = 0
  const segments = rows.map((row, position) => {
    const value = values[position]
    const share = total ? (value ?? 0) / max / total * 100 : 0
    const segment = { id: row.id, name: row.name, color: row.color, value, share, offset }
    offset += share
    return segment
  })
  return { period, valid, segments }
}))
const index = computed(() => {
  const next = columns.value.findIndex(column => column.period === (props.period ?? internal.value))
  return next < 0 ? columns.value.length - 1 : next
})
const current = computed(() => columns.value[index.value])
const descriptions = computed(() => columns.value.map(column => [column.period, ...column.segments.map(segment => `${segment.name} ${column.valid ? `${segment.share.toFixed(1)}%` : props.labels?.noData ?? 'No data'}`)].join('. ')))
function inspect(next: number) {
  const period = columns.value[next].period
  if (index.value !== next) {
    if (props.period === undefined) internal.value = period
    emit('update:period', period); emit('periodChange', period)
  }
  inspecting.value = true
}
const polygons = computed(() => normalized.value.rows.map((row, rowIndex) => {
  const paths: string[] = []
  let run: number[] = []
  const flush = () => {
    if (!run.length) return
    const edge = (at: number, upper: boolean, position = at + .5) => {
      const segment = columns.value[at].segments[rowIndex]
      return `${100 * position / columns.value.length},${100 - segment.offset - (upper ? segment.share : 0)}`
    }
    const top = run.map(at => edge(at, true))
    const bottom = run.map(at => edge(at, false)).reverse()
    const only = run[0]
    const points = run.length === 1 ? [edge(only, true, only), edge(only, true, only + 1), edge(only, false, only + 1), edge(only, false, only)] : [...top, ...bottom]
    paths.push(`M${points.join(' L')} Z`)
    run = []
  }
  columns.value.forEach((column, position) => { if (column.valid) run.push(position); else flush() })
  flush()
  return { ...row, path: paths.join(' ') }
}))
const title = computed(() => props.label ?? props.labels?.label ?? 'Composition chart')
</script>

<template>
  <section :aria-label="title" data-slot="composition-chart" class="composition">
    <div class="plot">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <template v-if="view === 'bar'"><g v-for="(column, ordinal) in columns" :key="column.period"><rect v-for="segment in column.segments" :key="segment.id" :x="(ordinal + .12) / columns.length * 100" :width=".76 / columns.length * 100" :y="100 - segment.offset - segment.share" :height="segment.share" :fill="segment.color" :opacity="highlight && highlight !== segment.id ? .25 : 1" /></g></template>
        <template v-else><path v-for="row in polygons" :key="row.id" :d="row.path" :fill="row.color" :opacity="highlight && highlight !== row.id ? .25 : 1" /></template>
      </svg>
      <ChartInspector :label="`${title}: inspect periods`" :values="descriptions" :index="index" band @inspect="inspect" @close="inspecting = false" />
      <div v-if="inspecting && current" role="tooltip" class="readout">{{ current.period }}</div>
    </div>
    <div class="axis" aria-hidden="true"><span>{{ columns[0]?.period }}</span><span>{{ columns.at(-1)?.period }}</span></div>
    <ul v-if="current" class="legend" :aria-label="current.period"><li v-for="segment in current.segments" :key="segment.id"><button type="button" :aria-pressed="pinned === segment.id"
      @focus="hovered = segment.id" @blur="hovered = null" @pointerenter="$event.pointerType !== 'touch' && (hovered = segment.id)" @pointerleave="hovered = null" @click="pinned = pinned === segment.id ? null : segment.id">
      <i :style="{ background: segment.color }" />{{ segment.name }}<b>{{ current.valid ? `${segment.share.toFixed(1)}%` : '—' }}</b><small>{{ segment.value === null ? labels?.noData ?? 'No data' : formatValue(segment.value) }}</small>
    </button></li></ul>
  </section>
</template>

<style scoped>
.composition { width: 100%; }
.plot { position: relative; height: 200px; }
.plot svg { display: block; width: 100%; height: 100%; }
.plot:focus-within { outline: 2px solid currentColor; outline-offset: 3px; }
.plot rect, .plot path { transition: opacity .16s ease-out; }
.axis, .legend { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.axis { justify-content: space-between; opacity: .7; }
.legend { padding: 0; margin: 8px 0 0; flex-wrap: wrap; list-style: none; }
.legend li { margin: 0; }
.legend button { display: flex; align-items: center; gap: 5px; border: 0; padding: 4px 8px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.legend i { width: 9px; height: 9px; border-radius: 50%; }
.legend button[aria-pressed='true'] { outline: 1px solid currentColor; border-radius: 6px; }
.readout { position: absolute; pointer-events: none; top: 6px; right: 6px; padding: 3px 8px; border-radius: 5px; background: CanvasText; color: Canvas; font-size: 12px; }
</style>
