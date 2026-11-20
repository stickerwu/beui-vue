<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useCalendarRange, type CalendarRange } from './use-calendar-range'

interface Cell { w: number; d: number }
const props = withDefaults(defineProps<{
  unit?: string; weeks?: number; maxCount?: number; values?: readonly (readonly number[])[]; endDate?: Date; color?: string
  selection?: CalendarRange<Cell> | null; defaultSelection?: CalendarRange<Cell> | null; labels?: Partial<Record<string, string>>
}>(), { weeks: 16, maxCount: 14, color: '#059669' })
const emit = defineEmits<{ 'update:selection': [range: CalendarRange<Cell> | null]; selectionChange: [range: CalendarRange<Cell> | null] }>()
const today = shallowRef<Date | null>(null)
onMounted(() => { today.value = new Date() })
const dayMs = 86400000
const end = computed(() => {
  const day = props.endDate ?? today.value
  return day && Number.isFinite(day.getTime()) ? Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) : null
})
const weeks = computed(() => Math.max(0, Math.floor(props.weeks)))
const start = computed(() => end.value === null ? null : end.value - (((new Date(end.value).getUTCDay() + 6) % 7) + (weeks.value - 1) * 7) * dayMs)
const formatDay = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
const formatMonth = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
const indexOf = (cell: Cell) => cell.w * 7 + cell.d
const cells = computed(() => Array.from({ length: weeks.value * 7 }, (_, index) => {
  const week = Math.floor(index / 7), weekday = index % 7
  const date = start.value === null ? null : start.value + index * dayMs
  const intensity = Math.min(1, Math.max(0, props.values?.[week]?.[weekday] || 0))
  return {
    w: week, d: weekday, index, count: Math.round(intensity * props.maxCount), level: Math.min(4, Math.floor(intensity * 5)),
    label: date === null ? `Week ${week + 1}, day ${weekday + 1}` : formatDay.format(date),
    month: date === null ? '' : formatMonth.format(date), future: date !== null && end.value !== null && date > end.value,
  }
}))
const { selection, hover, tip, range, select, clear } = useCalendarRange<Cell>({
  selection: () => props.selection, initial: props.defaultSelection, index: indexOf,
  valid: cell => Number.isInteger(cell.w) && Number.isInteger(cell.d) && cell.d >= 0 && cell.d < 7 && cell.w >= 0 && cell.w < weeks.value && !cells.value[indexOf(cell)].future,
  emit: value => { emit('update:selection', value); emit('selectionChange', value) },
})
const months = computed(() => cells.value.filter(cell => cell.d === 0 && (cell.w === 0 || cells.value[cell.index - 7].month !== cell.month)))
const selected = (index: number) => Boolean(range.value && index >= range.value.low && index <= range.value.high)
const tipText = computed(() => {
  if (range.value && range.value.low !== range.value.high) {
    const slice = cells.value.slice(range.value.low, range.value.high + 1)
    return `${slice[0].label} – ${slice[slice.length - 1].label} · ${slice.reduce((sum, cell) => sum + cell.count, 0)} ${props.unit ?? props.labels?.unit ?? 'events'}`
  }
  if (!tip.value) return ''
  const cell = cells.value[indexOf(tip.value)]
  return `${cell.label} · ${cell.count} ${props.unit ?? props.labels?.unit ?? 'events'}`
})
const cursor = shallowRef(0)
const filter = shallowRef<number | null>(null)
const strength = [0, 24, 46, 70, 94]
const fill = (bucket: number) => bucket === 0 ? 'color-mix(in srgb, currentColor 7%, transparent)' : `color-mix(in srgb, ${props.color} ${strength[bucket]}%, transparent)`
function move(event: KeyboardEvent, index: number) {
  if (event.key === 'Escape') { clear(); hover.value = null; return }
  const shifts: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }
  const offset = shifts[event.key]
  if (offset === undefined) return
  event.preventDefault()
  const next = index + offset
  if (!cells.value[next] || cells.value[next].future) return
  const parent = (event.currentTarget as HTMLElement).parentElement
  parent?.querySelector<HTMLButtonElement>(`button[data-cell="${next}"]`)?.focus()
}
</script>

<template>
  <section class="heat" data-slot="heat-calendar" :aria-label="labels?.label ?? 'Activity calendar'">
    <div class="scroll"><div class="matrix" :style="{ gridTemplateColumns: `repeat(${weeks}, 16px)` }">
      <small v-for="month in months" :key="month.index" class="month" :style="{ gridColumn: month.w + 1, gridRow: 1 }">{{ month.month }}</small>
      <button v-for="cell in cells" :key="cell.index" type="button" class="cell" :data-cell="cell.index" :disabled="cell.future"
        :tabindex="cursor === cell.index ? 0 : -1" :aria-label="`${cell.label}, ${cell.count} ${unit ?? labels?.unit ?? 'events'}`" :aria-pressed="selected(cell.index)"
        :style="{ gridColumn: cell.w + 1, gridRow: cell.d + 2, backgroundColor: fill(cell.level), opacity: cell.future ? 0 : (selection && !selected(cell.index)) || (filter !== null && filter !== cell.level) ? .3 : 1 }"
        @pointerenter="$event.pointerType !== 'touch' && (hover = cell)" @pointerleave="hover = null" @focus="cursor = cell.index; hover = cell" @blur="hover = null"
        @click="select({ w: cell.w, d: cell.d })" @keydown="move($event, cell.index)" />
    </div></div>
    <div class="heat-legend"><span>{{ labels?.less ?? 'Less' }}</span>
      <button v-for="(_, level) in strength" :key="level" type="button" :aria-label="`Intensity ${level}`" :aria-pressed="filter === level" :style="{ backgroundColor: fill(level) }"
        @focus="filter = level" @blur="filter = null" @pointerenter="$event.pointerType !== 'touch' && (filter = level)" @pointerleave="filter = null" @click="filter = filter === level ? null : level" />
      <span>{{ labels?.more ?? 'More' }}</span>
    </div>
    <div v-if="tipText" role="tooltip" class="calendar-tip">{{ tipText }}</div>
  </section>
</template>

<style scoped>
.heat { position: relative; width: max-content; max-width: 100%; margin: auto; }
.scroll { max-width: 100%; overflow-x: auto; padding: 2px; }
.matrix { display: grid; gap: 4px; grid-template-rows: 14px repeat(7, 16px); }
.month { width: max-content; font-size: 10px; line-height: 12px; }
.cell, .heat-legend button { padding: 0; border: 0; border-radius: 3px; color: inherit; cursor: pointer; }
.cell[aria-pressed='true'], .cell:focus-visible { outline: 1.5px solid currentColor; }
.heat-legend { display: flex; justify-content: flex-end; align-items: center; gap: 4px; font-size: 10px; margin: 8px 2px; }
.heat-legend button { width: 14px; height: 14px; }
.calendar-tip { text-align: center; font-size: 12px; }
@media (hover:hover) and (prefers-reduced-motion:no-preference) { .cell { transition: transform .12s ease-out; } .cell:hover:enabled { transform: scale(1.14); } }
</style>
