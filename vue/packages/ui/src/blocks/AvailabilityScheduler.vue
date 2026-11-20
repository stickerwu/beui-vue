<script setup lang="ts">
import { computed, useId } from 'vue'
import { useValue } from '../agents/shared'
import { WEEKDAYS, buildOptions, clampRange, defaultWeek, endOptions, startOptions, type DayKey, type TimeRange, type WeekAvailability } from './scheduler-model'

const props = withDefaults(defineProps<{value?:WeekAvailability, modelValue?:WeekAvailability, defaultValue?:WeekAvailability, step?:number}>(), {step:30})
const emit = defineEmits<{'update:modelValue':[value:WeekAvailability], change:[value:WeekAvailability]}>()
const {value:week,set} = useValue<WeekAvailability>(() => props.modelValue ?? props.value, props.defaultValue ?? defaultWeek(), next => {
  emit('update:modelValue', next)
  emit('change', next)
})
const options = computed(() => buildOptions(Math.max(1, Math.min(720, Math.floor(props.step) || 30))))
const id = useId()
let serial = 0
function toggle(day:DayKey) {
  const current = week.value[day]
  set({...week.value, [day]:{...current,enabled:!current.enabled}})
}
function ranges(day:DayKey, next:TimeRange[]) {
  set({...week.value, [day]:{...week.value[day],ranges:next}})
}
function change(day:DayKey, row:TimeRange, edge:'start'|'end', input:string) {
  const pair = clampRange(edge === 'start' ? input : row.start, edge === 'end' ? input : row.end, options.value, edge)
  ranges(day, week.value[day].ranges.map(item => item.id === row.id ? {...item,...pair} : item))
}
function add(day:DayKey) {
  const existing = week.value[day].ranges
  const start = existing.at(-1)?.end ?? '09:00'
  ranges(day, [...existing, {id:`${id}-${++serial}`, ...clampRange(start,'17:00',options.value,'start')}])
}
</script>
<template>
  <div class="be-block be-block-panel be-block-stack" aria-label="Weekly availability">
    <div v-for="day in WEEKDAYS" :key="day.key" class="be-week-row">
      <label><input type="checkbox" :checked="week[day.key].enabled" @change="toggle(day.key)" /> {{day.label}}</label>
      <div v-if="week[day.key].enabled">
        <div v-for="(range,position) in week[day.key].ranges" :key="range.id" class="be-block-row">
          <select :value="range.start" :aria-label="`${day.label} start ${position+1}`" @change="change(day.key,range,'start',($event.target as HTMLSelectElement).value)">
            <option v-for="option in startOptions(options,range.end,range.start)" :key="option.value" :value="option.value">{{option.label}}</option>
          </select>–
          <select :value="range.end" :aria-label="`${day.label} end ${position+1}`" @change="change(day.key,range,'end',($event.target as HTMLSelectElement).value)">
            <option v-for="option in endOptions(options,range.start,range.end)" :key="option.value" :value="option.value">{{option.label}}</option>
          </select>
          <button type="button" :aria-label="`Remove ${day.label} range ${position+1}`" @click="ranges(day.key,week[day.key].ranges.filter(item=>item.id!==range.id))">×</button>
        </div>
        <button class="be-block-muted" type="button" :aria-label="`Add range for ${day.label}`" @click="add(day.key)">+ Add range</button>
      </div><span v-else class="be-block-muted">Unavailable</span>
    </div>
  </div>
</template>
<style scoped>.be-week-row{display:grid;grid-template-columns:minmax(6rem,1fr) 2fr;gap:.5rem;align-items:start;padding:.4rem 0;border-bottom:1px solid var(--beui-border)}select{background:var(--beui-muted);border-radius:.35rem;padding:.25rem;color:inherit}</style>
