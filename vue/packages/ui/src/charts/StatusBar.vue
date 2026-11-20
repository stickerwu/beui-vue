<script setup lang="ts">
import { computed, shallowRef, watchEffect } from 'vue'
import ChartInspector from './ChartInspector.vue'

interface Datum { id: string; label: string; status: string; description?: string }
interface Status { id: string; label: string; color: string }
const props = defineProps<{
  data: readonly Datum[]; statuses?: readonly Status[]; label?: string; activeId?: string | null
  defaultActiveId?: string | null; labels?: Partial<Record<string, string>>
}>()
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeChange: [id: string | null] }>()
const defaults = [
  { id: 'operational', label: 'Operational', color: '#059669' }, { id: 'degraded', label: 'Degraded', color: '#d97706' },
  { id: 'outage', label: 'Outage', color: '#e11d48' }, { id: 'maintenance', label: 'Maintenance', color: '#2563eb' },
  { id: 'unknown', label: 'No data', color: '#71717a' },
]
const statuses = computed(() => props.statuses ?? defaults.map(status => ({ ...status, label: props.labels?.[status.id] ?? status.label })))
const periods = computed(() => {
  const known = new Map(statuses.value.map(status => [status.id, status]))
  if (known.size !== statuses.value.length) throw new Error('StatusBar requires unique status ids.')
  const ids = new Set<string>()
  return props.data.map(datum => {
    if (ids.has(datum.id)) throw new Error(`StatusBar requires a unique id for ${datum.id}.`)
    ids.add(datum.id)
    const status = known.get(datum.status)
    if (!status) throw new Error(`StatusBar requires a definition for ${datum.status}.`)
    return { datum, status }
  })
})
const texts = computed(() => periods.value.map(({ datum, status }) => [datum.label, status.label, datum.description].filter(Boolean).join('. ')))
const internal = shallowRef(props.defaultActiveId ?? null)
const open = shallowRef(false)
const index = computed(() => periods.value.findIndex(({ datum }) => datum.id === (props.activeId === undefined ? internal.value : props.activeId)))
const active = computed(() => open.value ? periods.value[index.value] : undefined)
watchEffect(() => { if (internal.value && !periods.value.some(row => row.datum.id === internal.value)) internal.value = null })
function inspect(position: number) {
  const id = periods.value[position].datum.id
  if (position !== index.value) {
    if (props.activeId === undefined) internal.value = id
    emit('update:activeId', id); emit('activeChange', id)
  }
  open.value = true
}
const title = computed(() => props.label ?? props.labels?.label ?? 'Status history')
</script>

<template>
  <section data-slot="status-bar" :aria-label="title" class="status-bar">
    <div class="strip">
      <span v-for="(period, position) in periods" :key="period.datum.id" aria-hidden="true" :class="{ marked: active && index === position }" :style="{ backgroundColor: period.status.color }" />
      <ChartInspector :label="`${title}: inspect periods`" :values="texts" :index="index" band @inspect="inspect" @close="open = false" />
      <div v-if="active" role="tooltip" class="status-tip" :style="{ left: `${Math.max(15, Math.min(85, (index + .5) / periods.length * 100))}%` }">
        <slot name="tooltip" :datum="active.datum" :status="active.status"><b>{{ active.datum.label }}</b><br>{{ active.status.label }}<br v-if="active.datum.description">{{ active.datum.description }}</slot>
      </div>
    </div>
    <div v-if="periods.length" class="ends"><span>{{ periods[0].datum.label }}</span><span>{{ periods[periods.length - 1].datum.label }}</span></div>
    <ul class="statuses"><li v-for="status in statuses" :key="status.id"><i :style="{ background: status.color }" />{{ status.label }}</li></ul>
  </section>
</template>

<style scoped>
.status-bar { width: 100%; }
.strip { position: relative; display: flex; gap: min(3px, .45%); height: 34px; }
.strip > span { flex: 1; min-width: 0; border-radius: 3px; }
.strip:focus-within { outline: 2px solid currentColor; outline-offset: 4px; }
.strip .marked { outline: 1px solid currentColor; outline-offset: 2px; }
.ends, .statuses { display: flex; gap: 12px; font-size: 12px; }
.ends { justify-content: space-between; margin-top: 4px; opacity: .7; }
.statuses { flex-wrap: wrap; margin: 12px 0 0; padding: 0; list-style: none; }
.statuses li { display: flex; align-items: center; gap: 6px; margin: 0; }
.statuses i { width: 8px; height: 8px; border-radius: 50%; }
.status-tip { position: absolute; bottom: calc(100% + 8px); transform: translateX(-50%); background: CanvasText; color: Canvas; border-radius: 7px; padding: 4px 8px; width: max-content; max-width: 85%; pointer-events: none; font-size: 12px; line-height: 1.5; }
@media (prefers-reduced-motion: no-preference) { .strip > span { transition: transform .15s ease-out; } .strip .marked { transform: scaleY(1.08); } }
</style>
