<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const statusBarMessages = {
  label: 'Status history',
  tableCaption: '{label} data',
  period: 'Period',
  status: 'Status',
  details: 'Details',
  legend: 'Status legend',
  inspect: '{label}: inspect period',
  empty: 'No status data',
  operational: 'Operational',
  degraded: 'Degraded',
  outage: 'Outage',
  maintenance: 'Maintenance',
  unknown: 'No data',
}
export type StatusBarMessages = typeof statusBarMessages
export interface StatusBarDatum {
  /** Stable, unique identity. Keep it when updating a period's status. */
  id: string
  /** Consumer-formatted period, date, or event label. */
  label: string
  /** Must match an ID in statuses. */
  status: string
  description?: string
}
export interface StatusBarStatus { id: string; label: string; color: string }
export const STATUS_BAR_STATUSES: readonly StatusBarStatus[] = [
  { id: 'operational', label: 'Operational', color: '#059669' },
  { id: 'degraded', label: 'Degraded', color: '#d97706' },
  { id: 'outage', label: 'Outage', color: '#e11d48' },
  { id: 'maintenance', label: 'Maintenance', color: '#2563eb' },
  { id: 'unknown', label: 'No data', color: 'var(--beui-muted-foreground)' },
]
</script>

<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { easeOut, pressSpring } from '../core/motion'
import ChartTip from './ChartTip.vue'
import { interpolate, useHoverCapable } from './plot-utils'

const props = withDefaults(defineProps<{
  data: readonly StatusBarDatum[]; statuses?: readonly StatusBarStatus[]; label?: string; activeId?: string | null
  defaultActiveId?: string | null; labels?: Partial<StatusBarMessages>; hideLegend?: boolean; showCounts?: boolean; showLabels?: boolean
}>(), { showLabels: true })
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeChange: [id: string | null] }>()
const t = (key: keyof StatusBarMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? statusBarMessages[key], values)
const title = computed(() => props.label ?? t('label'))
// Only the built-in states translate; consumer-defined statuses keep their own labels.
const statuses = computed(() => props.statuses ?? STATUS_BAR_STATUSES.map(status => ({ ...status, label: t(status.id as keyof StatusBarMessages) })))
const rows = computed(() => {
  const states = new Map<string, StatusBarStatus>()
  for (const status of statuses.value) {
    if (states.has(status.id)) throw new Error(`StatusBar: duplicate status ID "${status.id}".`)
    states.set(status.id, status)
  }
  const ids = new Set<string>()
  return props.data.map(datum => {
    if (ids.has(datum.id)) throw new Error(`StatusBar: duplicate period ID "${datum.id}".`)
    ids.add(datum.id)
    const status = states.get(datum.status)
    if (!status) throw new Error(`StatusBar: define the status "${datum.status}" in statuses.`)
    return { datum, status }
  })
})

const internal = shallowRef(props.defaultActiveId ?? null)
// Resolve stale identities during render so returning periods never revive a cursor.
const requestedId = computed(() => {
  const id = props.activeId === undefined ? internal.value : props.activeId
  return id !== null && rows.value.some(({ datum }) => datum.id === id) ? id : null
})
const activeIndex = computed(() => rows.value.findIndex(({ datum }) => datum.id === requestedId.value))
const active = computed(() => rows.value[activeIndex.value] ?? null)
function setActive(id: string | null) {
  if (props.activeId === undefined) internal.value = id
  if (requestedId.value !== id) { emit('update:activeId', id); emit('activeChange', id) }
}

const reduced = useReducedMotion()
const canHover = useHoverCapable()
const tooltipId = useId()
const plot = useTemplateRef<HTMLElement>('plot')
const tooltipOpen = shallowRef(false)
let pointerDriven = false
let focused = false
let lastPointerId: string | null = null
const index = computed(() => Math.max(activeIndex.value, 0))
const row = computed(() => rows.value[index.value])
function inspectPointer(event: PointerEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  if (!bounds.width) return
  const fraction = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
  const id = rows.value[Math.min(rows.value.length - 1, Math.floor(fraction * rows.value.length))].datum.id
  setActive(id)
  if (lastPointerId !== id) tooltipOpen.value = true
  lastPointerId = id
}
const onFocus = () => { focused = true; if (!pointerDriven) { setActive(row.value.datum.id); tooltipOpen.value = true } }
const onBlur = () => { focused = false; pointerDriven = false; tooltipOpen.value = false }
const onPointerEnter = (event: PointerEvent) => { if (canHover.value && event.pointerType !== 'touch') inspectPointer(event) }
const onPointerMove = (event: PointerEvent) => {
  if (event.pointerType === 'touch' ? event.buttons === 1 : canHover.value || event.buttons === 1) inspectPointer(event)
}
const onPointerLeave = () => { lastPointerId = null; if (!focused || pointerDriven) tooltipOpen.value = false }
const onPointerDown = (event: PointerEvent) => { pointerDriven = true; lastPointerId = null; inspectPointer(event) }
const onPointerCancel = () => { pointerDriven = false; tooltipOpen.value = false }
// Native range changes finish before click. Release the pointer guard so assistive-technology changes are accepted.
const onClick = () => { pointerDriven = false }
function onKeyDown(event: KeyboardEvent) {
  pointerDriven = false
  if (event.key === 'Escape') tooltipOpen.value = false
  else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) tooltipOpen.value = true
}
function onChange(event: Event) {
  // Native thumb travel differs from equal-width bars. Pointer hit testing owns pointer gestures; the range owns keyboard and AT input.
  if (pointerDriven) return
  const next = rows.value[Number((event.target as HTMLInputElement).value)]
  if (next) { setActive(next.datum.id); tooltipOpen.value = true }
}

// Spread a short entrance across the entire history, even with hundreds of periods.
const ENTRANCE_SPAN = 0.18
const ENTRANCE_TRANSFORM = ['translateY(4px) scaleY(0.9)', 'translateY(0px) scaleY(1)']
const entrance = computed(() => reduced.value ? { opacity: 1 } : { opacity: 1, transform: ENTRANCE_TRANSFORM })
const transitionAt = (position: number) => {
  const delay = reduced.value ? 0 : position / Math.max(rows.value.length - 1, 1) * ENTRANCE_SPAN
  return { opacity: { duration: reduced.value ? 0.15 : 0.24, ease: easeOut, delay }, transform: { ...pressSpring, delay } }
}
</script>

<template>
  <section class="status-bar" data-slot="status-bar" :aria-label="title">
    <slot name="header" />
    <p v-if="!rows.length" class="empty">{{ t('empty') }}</p>
    <div v-else class="plot" data-slot="status-bar-plot">
      <div ref="plot" class="box">
        <div class="bars" aria-hidden="true">
          <motion.span v-for="({ datum, status }, position) in rows" :key="datum.id" class="bar" :data-status-period="datum.id" :data-status="status.id"
            :initial="{ opacity: 0 }" :while-in-view="entrance" :viewport="{ once: true }" :transition="transitionAt(position)">
            <!-- Stable period keys keep the history still. Only the changed color layer crossfades when a new status arrives. -->
            <Transition name="status-color">
              <span :key="`${status.id}:${status.color}`" class="color" :style="{ backgroundColor: status.color }" />
            </Transition>
            <span class="ring" :style="{ opacity: tooltipOpen && activeIndex === position ? 1 : 0 }" />
          </motion.span>
        </div>
        <input type="range" class="range" :aria-label="t('inspect', { label: title })" min="0" :max="rows.length - 1" step="1" :value="index"
          :aria-valuetext="[row.datum.label, row.status.label, row.datum.description].filter(Boolean).join('. ')"
          :aria-describedby="tooltipOpen && activeIndex >= 0 ? tooltipId : undefined"
          @focus="onFocus" @blur="onBlur" @pointerenter="onPointerEnter" @pointermove="onPointerMove" @pointerleave="onPointerLeave"
          @pointerdown="onPointerDown" @pointercancel="onPointerCancel" @click="onClick" @keydown="onKeyDown" @change="onChange" @input="onChange">
      </div>
      <div v-if="showLabels" class="ends"><span>{{ rows[0].datum.label }}</span><span>{{ rows[rows.length - 1].datum.label }}</span></div>
    </div>
    <ChartTip :id="tooltipId" :open="tooltipOpen && active !== null" :anchor="plot" :anchor-point="{ x: (index + 0.5) / Math.max(rows.length, 1), y: 0.1 }" side="top" @dismiss="tooltipOpen = false">
      <slot v-if="active" name="tooltip" :datum="active.datum" :status="active.status" :index="activeIndex">
        <span class="tip">
          <span class="tip-label">{{ active.datum.label }}</span>
          <span class="tip-status"><span class="tip-dot" aria-hidden="true" :style="{ backgroundColor: active.status.color }" />{{ active.status.label }}</span>
          <span v-if="active.datum.description" class="tip-label">{{ active.datum.description }}</span>
        </span>
      </slot>
    </ChartTip>
    <ul v-if="!hideLegend" class="legend" :aria-label="t('legend')" data-slot="status-bar-legend">
      <li v-for="status in statuses" :key="status.id"><span class="key" aria-hidden="true" :style="{ backgroundColor: status.color }" /><span>{{ status.label }}</span>
        <span v-if="showCounts" class="count">({{ rows.filter(item => item.status.id === status.id).length }})</span></li>
    </ul>
    <div class="sr">
      <table>
        <caption>{{ t('tableCaption', { label: title }) }}</caption>
        <thead><tr><th scope="col">{{ t('period') }}</th><th scope="col">{{ t('status') }}</th><th scope="col">{{ t('details') }}</th></tr></thead>
        <tbody><tr v-for="{ datum, status } in rows" :key="datum.id"><th scope="row">{{ datum.label }}</th><td>{{ status.label }}</td><td>{{ datum.description ?? '' }}</td></tr></tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.status-bar { min-width: 0; width: 100%; font-family: inherit; }
.status-bar > * + * { margin-top: 12px; }
.empty { margin: 0; padding: 16px 0; font-size: 14px; color: var(--beui-muted-foreground); }
.plot { min-width: 0; }
.plot > * + * { margin-top: 6px; }
.box { position: relative; height: 44px; border-radius: 6px; }
.box:has(:focus-visible) { outline: 2px solid color-mix(in srgb, var(--beui-foreground) 12%, transparent); outline-offset: 4px; }
.bars { display: flex; height: 100%; align-items: center; gap: 2px; }
@media (min-width: 640px) { .bars { gap: 4px; } }
.bar { position: relative; display: block; flex: 1 1 0%; min-width: 0; height: 32px; border-radius: 9999px; }
.color, .ring { position: absolute; border-radius: inherit; pointer-events: none; }
.color { inset: 0; }
.ring { inset: -2px; box-shadow: 0 0 0 1px color-mix(in srgb, var(--beui-foreground) 60%, transparent); transition: opacity .1s cubic-bezier(.16, 1, .3, 1); }
.status-color-enter-active { transition: opacity .16s cubic-bezier(.16, 1, .3, 1); }
.status-color-leave-active { transition: opacity .12s cubic-bezier(.16, 1, .3, 1); }
.status-color-enter-from, .status-color-leave-to { opacity: 0; }
.range { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: crosshair; }
.ends { display: flex; justify-content: space-between; gap: 16px; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.tip { display: flex; flex-direction: column; gap: 4px; text-align: left; }
.tip-label { color: var(--beui-muted-foreground); }
.tip-status { display: flex; align-items: center; gap: 8px; font-weight: 500; }
.tip-dot { flex: none; width: 6px; height: 6px; border-radius: 9999px; }
.legend { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; margin: 12px 0 0; padding: 8px 0 0; list-style: none; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.legend li { display: flex; align-items: center; gap: 6px; margin: 0; font-size: inherit; line-height: inherit; color: inherit; }
.key { width: 6px; height: 12px; border-radius: 9999px; }
.count { font-variant-numeric: tabular-nums; }
.sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>
