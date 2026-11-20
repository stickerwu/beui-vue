<script setup lang="ts">
import { computed, shallowRef, watchEffect } from 'vue'
import ChartInspector from './ChartInspector.vue'
import { normalizeChart, valueAxis, type LineChartSeries } from '../graphics/chart-geometry'

const props = withDefaults(defineProps<{
  series: readonly LineChartSeries[]; categories: readonly string[]; layout?: 'stacked' | 'grouped'; orientation?: 'vertical' | 'horizontal'
  sort?: 'none' | 'ascending' | 'descending'; max?: number; activeId?: string | null; defaultActiveId?: string | null
  hiddenSeries?: readonly string[]; defaultHiddenSeries?: readonly string[]; formatValue?: (value: number) => string
  formatTick?: (value: number) => string; label?: string; labels?: Partial<Record<string, string>>; height?: number
}>(), { layout: 'grouped', orientation: 'vertical', formatValue: (value: number) => value.toLocaleString('en-US'), height: 250 })
const emit = defineEmits<{ 'update:activeId': [id: string]; 'update:hiddenSeries': [ids: string[]]; activeChange: [id: string]; hiddenSeriesChange: [ids: string[]] }>()
const title = computed(() => props.label ?? props.labels?.label ?? 'Bar chart')
const data = computed(() => normalizeChart(props.series.map(row => ({ ...row, values: row.values.map(value => value !== null && value >= 0 ? value : null) })), props.categories))
const hiddenInternal = shallowRef(props.defaultHiddenSeries ?? [])
const hidden = computed(() => props.hiddenSeries ?? hiddenInternal.value)
const visible = computed(() => data.value.rows.filter(row => !hidden.value.includes(row.id)))
const active = shallowRef(props.defaultActiveId ?? null)
const open = shallowRef(false)
const columns = computed(() => {
  const columns = data.value.categories.map((name, index) => {
    let total = 0
    const bars = visible.value.map(row => {
      const amount = row.values[index]
      const offset = total
      total += amount ?? 0
      return { id: row.id, name: row.name, color: row.color, amount, offset }
    })
    return { name, bars, total }
  })
  if (props.sort === 'ascending') columns.sort((left, right) => left.total - right.total)
  if (props.sort === 'descending') columns.sort((left, right) => right.total - left.total)
  return columns
})
const axis = computed(() => valueAxis(props.layout === 'grouped' ? visible.value : [{ id: '', name: '', color: '', values: columns.value.map(column => column.total) }], true,
  props.max !== undefined && props.max > 0 ? [0, props.max] : undefined))
const horizontal = computed(() => props.orientation === 'horizontal')
const descriptions = computed(() => columns.value.map(column => [column.name, ...column.bars.map(bar => `${bar.name} ${bar.amount === null ? props.labels?.missing ?? 'no data' : props.formatValue(bar.amount)}`)].join('. ')))
const selected = computed(() => columns.value.findIndex(column => column.name === (props.activeId === undefined ? active.value : props.activeId)))
const inspected = computed(() => open.value ? columns.value[selected.value] : undefined)
watchEffect(() => { if (active.value && !columns.value.some(column => column.name === active.value)) active.value = null })
function inspect(index: number) {
  const id = columns.value[index].name
  if (selected.value !== index) { if (props.activeId === undefined) active.value = id; emit('update:activeId', id); emit('activeChange', id) }
  open.value = true
}
function toggle(id: string) {
  const next = hidden.value.includes(id) ? hidden.value.filter(item => item !== id) : [...hidden.value, id]
  if (props.hiddenSeries === undefined) hiddenInternal.value = next
  emit('update:hiddenSeries', next); emit('hiddenSeriesChange', next)
}
const bars = computed(() => {
  const slot = 100 / (columns.value.length || 1)
  return columns.value.flatMap((column, ordinal) => column.bars.flatMap((bar, index) => {
    if (bar.amount === null) return []
    const stacked = props.layout === 'stacked'
    const breadth = slot * .76 / (stacked ? 1 : column.bars.length)
    const category = slot * (ordinal + .12) + (stacked ? 0 : index * breadth)
    const base = stacked ? bar.offset / axis.value.max * 100 : 0
    const length = bar.amount / axis.value.max * 100
    const rect = horizontal.value ? { left: base, top: category, width: length, height: breadth * .96 } : { left: category, top: 100 - base - length, width: breadth * .96, height: length }
    return [{ key: JSON.stringify([column.name, bar.id]), ordinal, color: bar.color, rect: Object.fromEntries(Object.entries(rect).map(([field, value]) => [field, `${value}%`])) }]
  }))
})
</script>

<template>
  <section class="bar-chart" :aria-label="title" data-slot="bar-chart">
    <div class="bar-stage" :class="{ horizontal }" :style="{ height: `${height}px` }">
      <div class="canvas">
        <span v-for="tick in axis.ticks" :key="tick" class="gridline" :style="horizontal ? { left: `${tick / axis.max * 100}%` } : { bottom: `${tick / axis.max * 100}%` }"><small>{{ (formatTick ?? formatValue)(tick) }}</small></span>
        <span v-for="bar in bars" :key="bar.key" class="bar" :style="{ ...bar.rect, backgroundColor: bar.color, opacity: inspected && bar.ordinal !== selected ? .46 : 1 }" />
        <span v-for="(column, index) in columns" :key="column.name" class="category" :style="horizontal ? { top: `${(index + .5) / columns.length * 100}%` } : { left: `${(index + .5) / columns.length * 100}%` }">{{ column.name }}</span>
        <ChartInspector :label="`${title}: inspect values`" :values="descriptions" :index="selected" :vertical="horizontal" band @inspect="inspect" @close="open = false" />
        <div v-if="inspected" class="bar-readout" role="tooltip"><strong>{{ inspected.name }}</strong><div v-for="bar in inspected.bars" :key="bar.id">{{ bar.name }} · {{ bar.amount === null ? labels?.noData ?? 'No data' : formatValue(bar.amount) }}</div></div>
      </div>
    </div>
    <div v-if="data.rows.length > 1" class="legend" role="group" :aria-label="labels?.series ?? 'Series'"><button v-for="row in data.rows" :key="row.id" type="button" :aria-pressed="!hidden.includes(row.id)" @click="toggle(row.id)"><i :style="{ background: row.color }" />{{ row.name }}</button></div>
    <div class="sr-data"><table><caption>{{ title }} data</caption><thead><tr><th scope="col">{{ labels?.category ?? 'Category' }}</th><th v-for="row in data.rows" :key="row.id" scope="col">{{ row.name }}</th></tr></thead><tbody><tr v-for="(name, index) in data.categories" :key="name"><th scope="row">{{ name }}</th><td v-for="row in data.rows" :key="row.id">{{ row.values[index] === null ? labels?.noData ?? 'No data' : formatValue(row.values[index]!) }}</td></tr></tbody></table></div>
  </section>
</template>

<style scoped>
.bar-chart { width: 100%; position: relative; }
.bar-stage { box-sizing: border-box; padding: 12px 12px 25px 45px; }
.canvas { width: 100%; height: 100%; position: relative; }
.canvas:focus-within { outline: 2px solid currentColor; outline-offset: 3px; }
.bar, .gridline, .category { position: absolute; }
.bar { border-radius: 3px; transition: opacity .15s ease-out; }
.gridline { left: 0; width: 100%; border-bottom: 1px dashed #8884; }
.gridline small, .category { font-size: 11px; white-space: nowrap; }
.gridline small { position: absolute; right: calc(100% + 5px); transform: translateY(-50%); }
.category { top: calc(100% + 3px); transform: translateX(-50%); }
.horizontal .gridline { top: 0; width: 0; height: 100%; border: 0; border-left: 1px dashed #8884; }
.horizontal .gridline small { right: auto; top: calc(100% + 2px); transform: translateX(-50%); }
.horizontal .category { right: calc(100% + 5px); transform: translateY(-50%); }
.bar-readout { pointer-events: none; position: absolute; right: 2px; top: 0; padding: 6px 10px; background: CanvasText; color: Canvas; border-radius: 6px; font: 12px/1.5 system-ui; }
.legend { display: flex; flex-wrap: wrap; gap: 6px; }
.legend button { display: flex; gap: 6px; align-items: center; background: transparent; color: inherit; border: 0; min-height: 32px; padding: 4px; cursor: pointer; font: inherit; font-size: 12px; }
.legend i { width: 9px; height: 9px; border-radius: 50%; }
.legend button[aria-pressed='false'] { opacity: .5; text-decoration: line-through; }
.sr-data { clip-path: inset(50%); position: absolute; width: 1px; height: 1px; overflow: hidden; }
</style>
