<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const heatCalendarMessages = {
  unit: 'commits',
  cell: '{count} {unit} on {date}',
  cellUndated: '{count} {unit}',
  range: '{start} – {end}',
  days: '{days} days',
  less: 'less',
  more: 'more',
  level: 'Show activity level {level}',
}
export type HeatCalendarMessages = typeof heatCalendarMessages
export interface HeatCalendarCell { w: number; d: number }
export interface HeatCalendarSelection { start: HeatCalendarCell; end?: HeatCalendarCell }
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watchEffect } from 'vue'
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { pressSpring } from '../core/motion'
import NumberTicker from '../numeric/NumberTicker.vue'
import ChartTip from './ChartTip.vue'
import { interpolate, useHoverCapable } from './plot-utils'

const props = withDefaults(defineProps<{
  unit?: string; weeks?: number; maxCount?: number; values?: readonly (readonly number[])[]; endDate?: Date; color?: string
  selection?: HeatCalendarSelection | null; defaultSelection?: HeatCalendarSelection | null; labels?: Partial<HeatCalendarMessages>
}>(), { weeks: 16, maxCount: 14, color: 'var(--beui-accent, oklch(72% 0.18 195))', selection: undefined })
const emit = defineEmits<{ 'update:selection': [range: HeatCalendarSelection | null]; selectionChange: [range: HeatCalendarSelection | null] }>()
const t = (key: keyof HeatCalendarMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? heatCalendarMessages[key], values)
const unit = computed(() => props.unit ?? t('unit'))

/** Five buckets: 0 is the neutral empty cell, 1 to 4 mix the one hue in harder. */
const STEPS = [0, 24, 46, 70, 94] as const
const EMPTY = 'color-mix(in srgb, var(--beui-foreground) 6%, transparent)'
/** Cell size and gap; every position in the grid derives from these. */
const CELL = 16
const GAP = 4
const PITCH = CELL + GAP
const MONTH_ROW = 12
/** How far a cell rises when it is the hovered one, its neighbour, or two away. */
const LIFT = [1.3, 1.08, 1.03]
const DAYS = Array.from({ length: 7 }, (_, d) => d)
const startOfDay = (d: Date) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x }
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x }
/** Monday on or before `d`, so every column reads Mon to Sun, top to bottom. */
const mondayOf = (d: Date) => addDays(startOfDay(d), -((d.getUTCDay() + 6) % 7))
const formats = {
  day: new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }),
  month: new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' }),
  range: new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }),
}

const reduce = useReducedMotion()
const canHover = useHoverCapable()
const weeks = computed(() => Math.max(0, Math.floor(props.weeks)))
const storedHover = shallowRef<HeatCalendarCell | null>(null)
const internal = shallowRef(props.defaultSelection ?? null)
const requested = computed(() => props.selection === undefined ? internal.value : props.selection)
function setSelection(next: HeatCalendarSelection | null) {
  if (props.selection === undefined) internal.value = next
  emit('update:selection', next); emit('selectionChange', next)
}
const gridEl = useTemplateRef<HTMLElement>('grid')
const tooltipId = useId()
const step = shallowRef<number | null>(null)
// the entrance wave owns the cells until it has landed; the ripple takes over after
const settled = shallowRef(false)
let settleTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => { settleTimer = setTimeout(() => { settled.value = true }, reduce.value ? 0 : (weeks.value + 7) * 18 + 500) })
onBeforeUnmount(() => clearTimeout(settleTimer))

// "today" is read after mount: the server and a viewer on another calendar day must produce the same HTML, so the grid
// renders first and its dates fill in on the client. An explicit `endDate` is deterministic and skips this.
const today = shallowRef<Date | null>(null)
onMounted(() => { today.value = startOfDay(new Date()) })
const end = computed(() => props.endDate && Number.isFinite(props.endDate.getTime()) ? startOfDay(props.endDate) : today.value)
const start = computed(() => end.value ? addDays(mondayOf(end.value), -(weeks.value - 1) * 7) : null)

const level = (w: number, d: number) => Math.max(0, Math.min(1, props.values?.[w]?.[d] ?? 0))
const bucket = (v: number) => Math.min(4, Math.floor(v * 5))
const fill = (b: number) => b === 0 ? EMPTY : `color-mix(in srgb, ${props.color} ${STEPS[b]}%, transparent)`
const count = (v: number) => Math.round(v * props.maxCount)
const dateOf = (w: number, d: number) => start.value ? addDays(start.value, w * 7 + d) : null
const future = (w: number, d: number) => { const date = dateOf(w, d); return end.value !== null && date !== null && date > end.value }
const validCell = (cell: HeatCalendarCell) => Number.isInteger(cell.w) && Number.isInteger(cell.d) && cell.w >= 0 && cell.w < weeks.value && cell.d >= 0 && cell.d < 7 && !future(cell.w, cell.d)
const selection = computed(() => {
  const value = requested.value
  return value && validCell(value.start) && (!value.end || validCell(value.end)) ? value : null
})
watchEffect(() => { if (requested.value && !selection.value && props.selection === undefined) internal.value = null })
const pinned = computed(() => selection.value?.start ?? null)
const spanEnd = computed(() => selection.value?.end ?? null)
const hover = computed(() => storedHover.value && validCell(storedHover.value) ? storedHover.value : null)
const setHover = (cell: HeatCalendarCell | null) => { storedHover.value = cell }

// one label per month, at its first column; the leading label yields if the next month starts within two columns
const cols = computed(() => {
  const list = Array.from({ length: weeks.value }, (_, w) => {
    const date = start.value ? addDays(start.value, w * 7) : null
    const m = date ? date.getUTCMonth() : -1
    const fresh = start.value !== null && date !== null && (w === 0 || addDays(start.value, (w - 1) * 7).getUTCMonth() !== m)
    return { w, m, label: fresh && date ? formats.month.format(date) : null as string | null }
  })
  if (list[1]?.label || list[2]?.label) list[0].label = null
  return list
})

// one click anchors a span and dims everything else; hovering then previews the run from the anchor to the pointer and
// totals it live, and a second click locks it so the number stays on screen while the pointer moves on
const idx = (c: HeatCalendarCell) => c.w * 7 + c.d
const clear = () => setSelection(null)
const spanTo = computed(() => spanEnd.value ?? (pinned.value ? (hover.value ?? pinned.value) : null))
const span = computed(() => pinned.value && spanTo.value ? { lo: Math.min(idx(pinned.value), idx(spanTo.value)), hi: Math.max(idx(pinned.value), idx(spanTo.value)) } : null)
const spanTotal = computed(() => {
  let total = 0
  if (span.value) for (let i = span.value.lo; i <= span.value.hi; i++) {
    if (future(Math.floor(i / 7), i % 7)) break
    total += count(level(Math.floor(i / 7), i % 7))
  }
  return total
})
function select(cell: HeatCalendarCell) {
  const start = pinned.value
  // a locked span clears on the next click anywhere, so leaving it is one press
  if (spanEnd.value) clear()
  else if (start && idx(start) === idx(cell)) setSelection(null)
  else if (start) setSelection({ start, end: cell })
  else setSelection({ start: cell })
}
/** the cell the grid reacts to: lift, ripple and label highlight follow the pointer */
const hot = computed(() => hover.value ?? spanEnd.value ?? pinned.value)
/** the cell the tooltip hangs from: a locked span keeps it on its end */
const tip = computed(() => spanEnd.value ?? hover.value ?? pinned.value)
const tipDate = computed(() => tip.value ? dateOf(tip.value.w, tip.value.d) : null)
const hotMonth = computed(() => hot.value ? dateOf(hot.value.w, hot.value.d)?.getUTCMonth() ?? null : null)
const tooltip = computed(() => {
  const at = tip.value, date = tipDate.value
  if (!at || !date) return null
  const run = span.value
  return {
    date, count: count(level(at.w, at.d)), total: spanTotal.value,
    startDate: start.value && run ? addDays(start.value, run.lo) : date,
    endDate: start.value && run ? addDays(start.value, run.hi) : date,
    days: run ? run.hi - run.lo + 1 : 1,
  }
})

// tooltip: dismissed (Escape, or a tap elsewhere) until the tip moves to another cell
const dismissed = shallowRef<HeatCalendarCell | null>(null)
const tipKey = computed(() => tip.value ? `${tip.value.w}-${tip.value.d}` : 'closed')
const tipOpen = computed(() => tooltip.value !== null && dismissed.value !== tip.value)
const anchorEl = computed(() => {
  const at = tip.value
  return at ? gridEl.value?.querySelector<HTMLElement>(`[data-heat-cell="${at.w}-${at.d}"]`) ?? null : null
})
const dismiss = () => { dismissed.value = tip.value }
const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && tipOpen.value) dismiss() }
const onDown = (event: PointerEvent) => { if (tipOpen.value && event.pointerType === 'touch' && !gridEl.value?.contains(event.target as Node)) dismiss() }
onMounted(() => { document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onDown, true) })
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown, true) })

const cells = computed(() => cols.value.flatMap(({ w }) => DAYS.flatMap(d => {
  if (future(w, d)) return []
  const date = dateOf(w, d)
  const v = level(w, d)
  const b = bucket(v)
  const i = w * 7 + d
  const on = hot.value?.w === w && hot.value?.d === d
  const isEnd = span.value ? i === span.value.lo || i === span.value.hi : pinned.value?.w === w && pinned.value?.d === d
  const dim = (step.value !== null && step.value !== b) || (span.value !== null && (i < span.value.lo || i > span.value.hi))
  // the ripple: the hovered cell rises most, the ring around it a little, two out barely
  const dist = hot.value ? Math.max(Math.abs(hot.value.w - w), Math.abs(hot.value.d - d)) : 9
  const lift = reduce.value || !canHover.value ? 1 : dist === 0 ? LIFT[0] : dist < LIFT.length ? LIFT[dist] : 1
  const animate = settled.value
    ? { opacity: 1, scale: lift, transition: { ...pressSpring, delay: Math.min(dist, 3) * 0.03 } }
    : { opacity: 1, scale: 1, transition: reduce.value ? { duration: 0 } : { ...pressSpring, delay: (w + d) * 0.018 } }
  return [{
    key: `w${w}-d${d}`, w, d, b, on, isEnd, dim, dist, lift, animate, background: fill(b),
    label: date ? t('cell', { count: count(v), unit: unit.value, date: formats.day.format(date) }) : t('cellUndated', { count: count(v), unit: unit.value }),
  }]
})))
</script>

<template>
  <div class="heat" data-slot="heat-calendar">
    <div ref="grid" class="grid" :style="{ width: `${weeks * PITCH - GAP}px`, gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, gridTemplateRows: `${MONTH_ROW}px repeat(7, auto)`, gap: `${GAP}px` }" @pointerleave="setHover(null)">
      <template v-for="c in cols" :key="`m${c.w}`">
        <span v-if="c.label" class="month" :class="{ hot: hotMonth === c.m }" :style="{ gridColumn: c.w + 1, gridRow: 1 }">{{ c.label }}</span>
      </template>
      <!-- the outer span owns the legend dim so it never fights the transforms inside -->
      <span v-for="cell in cells" :key="cell.key" class="cell" :style="{ gridColumn: cell.w + 1, gridRow: cell.d + 2, opacity: cell.dim ? 0.25 : 1, zIndex: cell.lift > 1 ? LIFT.length - cell.dist : 0 }">
        <!-- the hit area is the cell plus half the gap on every side, so a fast pointer never falls through; the visual inside never takes pointer events -->
        <motion.button type="button" class="hit" :aria-label="cell.label" :data-heat-cell="`${cell.w}-${cell.d}`" :aria-pressed="cell.isEnd" :aria-describedby="cell.on ? tooltipId : undefined"
          :while-tap="reduce ? undefined : { scale: 0.9, transition: pressSpring }"
          @pointerenter="setHover({ w: cell.w, d: cell.d })" @focus="setHover({ w: cell.w, d: cell.d })" @blur="setHover(null)" @click="select({ w: cell.w, d: cell.d })" @keydown.esc="clear">
          <!-- the diagonal wave: each cell arrives (w + d) steps after the corner; once settled, the ripple spreads out by distance -->
          <motion.span class="face" :style="{ background: cell.background, boxShadow: cell.isEnd ? '0 0 0 2px var(--beui-background), 0 0 0 3.5px var(--beui-foreground)' : 'none' }"
            :initial="reduce ? false : { opacity: 0, scale: 0.4 }" :animate="cell.animate">
            <Transition name="ring"><span v-if="cell.on && !cell.isEnd" class="ring" /></Transition>
          </motion.span>
        </motion.button>
      </span>
    </div>
    <ChartTip :key="tipKey" :id="tooltipId" :open="tipOpen" :anchor="anchorEl" :follow-cursor="false" side="top" @dismiss="dismiss">
      <span v-if="tooltip" class="tip">
        <span class="count"><NumberTicker :value="tooltip.days > 1 ? tooltip.total : tooltip.count" :duration="0.35" :start-on-view="false" />{{ unit }}</span>
        <span class="muted">{{ tooltip.days > 1 ? t('range', { start: formats.range.format(tooltip.startDate), end: formats.range.format(tooltip.endDate) }) : formats.day.format(tooltip.date) }}</span>
        <span v-if="tooltip.days > 1" class="muted">{{ t('days', { days: tooltip.days }) }}</span>
      </span>
    </ChartTip>
    <div class="legend">
      <span class="range">{{ start && end ? t('range', { start: formats.range.format(start), end: formats.range.format(end) }) : ' ' }}</span>
      <!-- hovering a step keeps only cells of that level lit, so the legend doubles as a filter -->
      <span class="steps" @pointerleave="step = null">
        <span class="range edge">{{ t('less') }}</span>
        <button v-for="(s, i) in STEPS" :key="s" type="button" :aria-label="t('level', { level: i })" :aria-pressed="step === i" :style="{ background: fill(i), transform: !reduce && step === i ? 'scale(1.25)' : undefined }"
          @pointerenter="canHover && (step = i)" @focus="step = i" @blur="step = null" @click="step = step === i ? null : i" />
        <span class="range edge">{{ t('more') }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.heat { width: fit-content; max-width: 100%; font-family: inherit; }
.grid { position: relative; display: grid; max-width: 100%; }
.month { white-space: nowrap; font-size: 10px; line-height: 1; color: var(--beui-muted-foreground); transition: color .2s; }
.month.hot { color: var(--beui-foreground); }
.cell { position: relative; display: block; width: 100%; aspect-ratio: 1 / 1; transition: opacity .2s; }
.hit { position: absolute; inset: -2px; display: block; margin: 0; padding: 0; border: 0; border-radius: 5px; background: transparent; outline: none; cursor: pointer; }
.hit:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 12%, transparent); }
.face { position: absolute; inset: 2px; display: block; border-radius: 4px; pointer-events: none; transition: box-shadow .15s; }
.ring { position: absolute; inset: 0; display: block; border: 1.5px solid color-mix(in srgb, var(--beui-foreground) 55%, transparent); border-radius: inherit; pointer-events: none; }
.ring-enter-active, .ring-leave-active { transition: opacity .12s cubic-bezier(.16, 1, .3, 1); }
.ring-enter-from, .ring-leave-to { opacity: 0; }
.tip { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; text-align: left; line-height: 1.3333; }
.count { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-variant-numeric: tabular-nums; }
.muted, .range { color: var(--beui-muted-foreground); }
.legend { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
.range { font-size: 12px; line-height: 16px; }
.steps { display: flex; align-items: center; gap: 4px; }
.steps button { width: 12px; height: 12px; margin: 0; padding: 0; border: 0; border-radius: 3px; cursor: pointer; transition: transform .15s; }
.steps button:focus-visible { outline: 2px solid color-mix(in srgb, var(--beui-foreground) 12%, transparent); outline-offset: 2px; }
.edge:first-child { margin-right: 2px; }
.edge:last-child { margin-left: 2px; }
</style>
