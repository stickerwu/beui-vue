<script setup lang="ts">
import { computed, nextTick, shallowRef, useId, useTemplateRef, watch } from 'vue'
import FloatingPanel from './FloatingPanel.vue'
import { dateValue, dayOffset, iso, monthOffset, type DatePreset, type DateRange } from './date'

const { defaultMonth, min, max, locale = 'en-US', isDateDisabled, label = 'Date range', disabled, closeOnSelect = false, presets = [], inline = false } = defineProps<{
  defaultMonth?: string; min?: string; max?: string; locale?: string; isDateDisabled?: (value: string) => boolean; label?: string; disabled?: boolean; closeOnSelect?: boolean; presets?: readonly DatePreset[]; inline?: boolean
}>()
const model = defineModel<DateRange | null>({ default: null })
const open = defineModel<boolean>('open', { default: false })
const uid = useId()
const anchor = useTemplateRef('anchor')
const focusDay = shallowRef(defaultMonth ?? model.value?.from ?? iso(new Date()))
const month = computed(() => `${focusDay.value.slice(0, 7)}-01`)
const hover = shallowRef('')
const labels = computed(() => new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }))
const months = computed(() => Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2020,index,1)))))
const weekdays = computed(() => Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(Date.UTC(2023,0,1 + index)))))
const days = computed(() => {
  const first = dayOffset(month.value, -dateValue(month.value).getUTCDay())
  return Array.from({ length: 42 }, (_, index) => dayOffset(first, index))
})
const summary = computed(() => model.value ? `${labels.value.format(dateValue(model.value.from))} – ${model.value.to ? labels.value.format(dateValue(model.value.to)) : '…'}` : 'Choose dates')
function blocked(date: string) { return Boolean(disabled || (min && date < min) || (max && date > max) || isDateDisabled?.(date)) }
function inSelection(date: string) {
  const from = model.value?.from
  const to = model.value?.to ?? hover.value
  if (!from) return false
  if (!to) return date === from
  return date >= (from < to ? from : to) && date <= (from < to ? to : from)
}
function close(reason = '') { open.value = false; hover.value = ''; if (reason === 'escape') anchor.value?.focus() }
function choose(date: string) {
  if (blocked(date)) return
  focusDay.value = date
  const current = model.value
  if (!current || current.to) { model.value = { from: date }; hover.value = ''; return }
  model.value = current.from <= date ? { from: current.from, to: date } : { from: date, to: current.from }
  if (closeOnSelect) close('escape')
}
function focusCurrent() { nextTick(() => document.getElementById(`${uid}-${focusDay.value}`)?.focus({ preventScroll: true })) }
function moveDate(date: string, direction: number, focus = false) {
  let value = min && date < min ? min : max && date > max ? max : date
  for (let attempts = 0; attempts < 366 && blocked(value); attempts++) {
    value = dayOffset(value, direction)
    if ((min && value < min) || (max && value > max)) return
  }
  if (blocked(value)) return
  focusDay.value = value
  if (focus) focusCurrent()
}
function keys(event: KeyboardEvent, date: string) {
  const week = dateValue(date).getUTCDay()
  const offsets: Record<string,number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -week, End: 6 - week }
  const step = offsets[event.key]
  if (step !== undefined) { event.preventDefault(); moveDate(dayOffset(date, step), step < 0 ? -1 : 1, true) }
  if (event.key === 'PageUp' || event.key === 'PageDown') {
    event.preventDefault(); const direction = event.key === 'PageUp' ? -1 : 1; moveDate(monthOffset(date, (event.shiftKey ? 12 : 1) * direction), direction, true)
  }
}
watch(() => model.value?.from, value => { if (value && !model.value?.to) focusDay.value = value })
</script>
<template><div class="date-root"><button v-if="!inline" ref="anchor" class="date-trigger" type="button" :disabled="disabled" :aria-expanded="open" aria-haspopup="dialog" @click="open = !open"><span>{{ label }}</span>{{ summary }}</button>
  <component :is="inline ? 'div' : FloatingPanel" :open="open" :anchor="anchor" role="dialog" :aria-label="label" class="calendar" @dismiss="close" @placed="focusCurrent">
    <div class="header"><button type="button" aria-label="Previous month" :disabled="Boolean(min && month <= min.slice(0,7) + '-01')" @click="moveDate(monthOffset(focusDay,-1), -1)">‹</button>
      <select aria-label="Month" :value="Number(month.slice(5,7))" @change="moveDate(monthOffset(focusDay, Number(($event.target as HTMLSelectElement).value) - Number(month.slice(5,7))), 1)"><option v-for="(name, index) in months" :key="name" :value="index + 1">{{ name }}</option></select>
      <input aria-label="Year" type="number" :value="Number(month.slice(0,4))" :min="min ? Number(min.slice(0,4)) : 1000" :max="max ? Number(max.slice(0,4)) : 9999" @change="event => { const year = (event.target as HTMLInputElement).valueAsNumber; if (year >= 1000 && year <= 9999) moveDate(monthOffset(focusDay, 12 * (year - Number(month.slice(0,4)))), 1) }" />
      <button type="button" aria-label="Next month" :disabled="Boolean(max && month >= max.slice(0,7) + '-01')" @click="moveDate(monthOffset(focusDay,1), 1)">›</button>
    </div>
    <div class="grid"><span v-for="(weekday, index) in weekdays" :key="index" class="weekday" aria-hidden="true">{{ weekday }}</span>
      <button v-for="date in days" :id="`${uid}-${date}`" :key="date" type="button" :aria-label="labels.format(dateValue(date))" :aria-pressed="inSelection(date)" :data-edge="date === model?.from || date === model?.to" :data-other="date.slice(0,7) !== month.slice(0,7)" :tabindex="date === focusDay ? 0 : -1" :disabled="blocked(date)" @click="choose(date)" @keydown="keys($event,date)" @pointerenter="hover = date">{{ Number(date.slice(-2)) }}</button>
    </div>
    <div v-if="presets.length" class="presets"><button v-for="preset in presets" :key="preset.label" type="button" :disabled="blocked(preset.value.from) || Boolean(preset.value.to && blocked(preset.value.to))" @click="model = { ...preset.value }; focusDay = preset.value.from; closeOnSelect && close('escape')">{{ preset.label }}</button></div>
    <div class="footer"><span aria-live="polite">{{ summary }}</span><button type="button" :disabled="!model || disabled" @click="model = null">Clear</button></div>
  </component></div></template>
<style scoped>.date-trigger { display: grid; gap: .2rem; padding: .6rem .9rem; border: 1px solid var(--beui-border); border-radius: .75rem; text-align: start; background: var(--beui-card); color: var(--beui-foreground); cursor: pointer; } .date-trigger span,.weekday,.footer { font-size: .75rem; color: var(--beui-muted-foreground); } .calendar { width: 20rem; padding: .75rem; border-radius: .85rem; } .header,.footer,.presets { display: flex; align-items: center; justify-content: space-between; gap: .3rem; } .header input { width: 4.8rem; } .calendar :is(button,input,select) { border: 0; background: transparent; font: inherit; color: inherit; padding: .25rem; } .calendar button { cursor: pointer; } .grid { display: grid; grid-template-columns: repeat(7,1fr); gap: .14rem; margin-block: .75rem; text-align: center; } .grid button { border-radius: .5rem; min-height: 2rem; font-size: .85rem; } .grid button[data-other=true] { color: var(--beui-muted-foreground); } .grid button[aria-pressed=true] { background: var(--beui-muted); } .grid button[data-edge=true] { background: var(--beui-primary); color: var(--beui-primary-foreground); } .calendar button:hover:not(:disabled) { outline: 1px solid var(--beui-border); } .calendar button:disabled { opacity: .35; } .footer { border-top: 1px solid var(--beui-border); padding-top: .6rem; }</style>
