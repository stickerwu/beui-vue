<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useCalendarRange, type CalendarRange } from './use-calendar-range'

interface Cell { y: number; m: number }
const props = withDefaults(defineProps<{
  years?: readonly number[]; returns?: readonly (readonly number[])[]; selection?: CalendarRange<Cell> | null
  defaultSelection?: CalendarRange<Cell> | null; labels?: Partial<Record<string, string>>
}>(), { years: () => [], returns: () => [] })
const emit = defineEmits<{ 'update:selection': [range: CalendarRange<Cell> | null]; selectionChange: [range: CalendarRange<Cell> | null] }>()
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const compound = (values: readonly number[]) => (values.reduce((product, value) => product * (1 + value / 100), 1) - 1) * 100
const signed = (value: number) => `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(1)}%`
const indexOf = (cell: Cell) => cell.m === 12 ? cell.y : cell.y * 12 + cell.m
const track = (cell: Cell) => cell.m === 12
const labelFor = (cell: Cell) => cell.m === 12 ? `${props.years[cell.y]}` : `${months[cell.m]} ${props.years[cell.y]}`
const rows = computed(() => props.years.map((year, ordinal) => {
  const series = months.map((_, index) => props.returns[ordinal]?.[index] ?? 0)
  return { year, values: [...series, compound(series)] }
}))
const { hover, tip, range, select, clear } = useCalendarRange<Cell>({
  selection: () => props.selection, initial: props.defaultSelection, index: indexOf, track,
  valid: cell => Number.isInteger(cell.y) && cell.y >= 0 && cell.y < props.years.length && Number.isInteger(cell.m) && cell.m >= 0 && cell.m <= 12,
  emit: value => { emit('update:selection', value); emit('selectionChange', value) },
})
const cursor = shallowRef(0)
function selected(cell: Cell) {
  if (!range.value || track(cell) !== range.value.track) return false
  const index = indexOf(cell)
  return index >= range.value.low && index <= range.value.high
}
const readout = computed(() => {
  if (range.value && range.value.low !== range.value.high) {
    const { low, high, track: years } = range.value
    const values = years ? rows.value.slice(low, high + 1).map(row => row.values[12]) : rows.value.flatMap(row => row.values.slice(0, 12)).slice(low, high + 1)
    const cellAt = (index: number) => years ? { y: index, m: 12 } : { y: Math.floor(index / 12), m: index % 12 }
    return `${labelFor(cellAt(low))} – ${labelFor(cellAt(high))} · ${signed(compound(values))}`
  }
  const current = tip.value
  return current ? `${labelFor(current)} · ${signed(rows.value[current.y].values[current.m])}` : ''
})
function move(event: KeyboardEvent, index: number) {
  if (event.key === 'Escape') { clear(); hover.value = null; return }
  const shifts: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -13, ArrowDown: 13 }
  if (!(event.key in shifts)) return
  event.preventDefault()
  const table = (event.currentTarget as HTMLElement).closest('table')
  table?.querySelector<HTMLButtonElement>(`button[data-cell="${index + shifts[event.key]}"]`)?.focus()
}
function color(value: number, yearly: boolean) {
  const strength = 8 + Math.min(Math.abs(value) / (yearly ? 30 : 8), 1) * 55
  return `color-mix(in srgb, ${value >= 0 ? '#059669' : '#e11d48'} ${strength}%, transparent)`
}
</script>

<template>
  <div class="returns" data-slot="returns-calendar"><div class="scroll"><table :aria-label="labels?.label ?? 'Monthly returns'">
    <thead><tr><th scope="col">{{ labels?.year ?? 'Year' }}</th><th v-for="month in months" :key="month" scope="col">{{ month }}</th><th scope="col">{{ labels?.annual ?? 'Total' }}</th></tr></thead>
    <tbody><tr v-for="(row, ordinal) in rows" :key="row.year"><th scope="row">{{ row.year }}</th>
      <td v-for="(value, month) in row.values" :key="month"><button type="button" :data-cell="ordinal * 13 + month" :aria-label="`${labelFor({ y: ordinal, m: month })}, ${signed(value)}`"
        :tabindex="cursor === ordinal * 13 + month ? 0 : -1" :aria-pressed="selected({ y: ordinal, m: month })"
        :style="{ backgroundColor: color(value, month === 12), opacity: range && !selected({ y: ordinal, m: month }) ? .42 : 1 }"
        @click="select({ y: ordinal, m: month })" @focus="cursor = ordinal * 13 + month; hover = { y: ordinal, m: month }" @blur="hover = null"
        @pointerenter="$event.pointerType !== 'touch' && (hover = { y: ordinal, m: month })" @pointerleave="hover = null" @keydown="move($event, ordinal * 13 + month)">{{ signed(value) }}</button></td>
    </tr></tbody>
  </table></div><div v-if="readout" class="tip" role="tooltip">{{ readout }}</div></div>
</template>

<style scoped>
.returns { width: 100%; }
.scroll { overflow-x: auto; }
.returns table { display: table; width: 100%; border-spacing: 2px; border-collapse: separate; font-variant-numeric: tabular-nums; font-size: 11px; margin: 0; }
.returns tr, .returns td, .returns th { border: 0; background: transparent; padding: 0; text-align: center; }
.returns th { font-weight: 500; }
.returns button { display: block; width: 100%; min-width: 34px; min-height: 30px; border: 0; padding: 3px; border-radius: 4px; font: inherit; color: inherit; cursor: pointer; }
.returns button[aria-pressed='true'], .returns button:focus-visible { outline: 1.5px solid currentColor; outline-offset: -2px; }
.tip { margin: 7px 0 0; text-align: center; font-size: 12px; }
</style>
