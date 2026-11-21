<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const returnsCalendarMessages = {
  year: 'Year',
  monthCell: '{month} {year} {value}%',
  yearCell: '{year} {value}% for the year',
  years: '{count} years',
  months: '{count} months',
  forYear: 'for the year',
}
export type ReturnsCalendarMessages = typeof returnsCalendarMessages
export interface ReturnsCalendarCell { y: number; m: number }
export interface ReturnsCalendarSelection { start: ReturnsCalendarCell; end?: ReturnsCalendarCell }
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watchEffect } from 'vue'
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { easeOut, pressSpring } from '../core/motion'
import NumberTicker from '../numeric/NumberTicker.vue'
import ChartTip from './ChartTip.vue'
import { interpolate, useHoverCapable } from './plot-utils'

const props = withDefaults(defineProps<{
  years?: readonly number[]; returns?: readonly (readonly number[])[]; selection?: ReturnsCalendarSelection | null
  defaultSelection?: ReturnsCalendarSelection | null; labels?: Partial<ReturnsCalendarMessages>
}>(), { years: () => [], returns: () => [], selection: undefined })
const emit = defineEmits<{ 'update:selection': [range: ReturnsCalendarSelection | null]; selectionChange: [range: ReturnsCalendarSelection | null] }>()
const t = (key: keyof ReturnsCalendarMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? returnsCalendarMessages[key], values)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const cols = MONTHS.map((name, m) => ({ name, initial: name[0], m }))
/** The compounded column, addressed like a thirteenth month. */
const YEAR = 12
const compound = (run: readonly number[]) => (run.reduce((acc, r) => acc * (1 + r / 100), 1) - 1) * 100
const signed = (v: number, dp: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(dp)}`
/** magnitude → strength of the one up or down hue, never a second color */
const UP = 'var(--beui-success, oklch(70% 0.18 155))'
const DOWN = 'var(--beui-danger, oklch(62% 0.22 25))'
const tint = (v: number, range: number, on: boolean) => `color-mix(in srgb, ${v >= 0 ? UP : DOWN} ${Math.round(Math.min(Math.abs(v) / range, 1) * 55 + (on ? 24 : 8))}%, transparent)`
const ink = (v: number) => `oklch(from ${v >= 0 ? UP : DOWN} min(l, var(--ink-l, 1)) c h)`
const same = (a: ReturnsCalendarCell | null, y: number, m: number) => a?.y === y && a?.m === m
const RING = 'inset 0 0 0 1.5px var(--beui-foreground)'
/** percent that saturates a month's tint */
const range = 8

const reduce = useReducedMotion()
const canHover = useHoverCapable()
const storedHover = shallowRef<ReturnsCalendarCell | null>(null)
const internal = shallowRef(props.defaultSelection ?? null)
const requested = computed(() => props.selection === undefined ? internal.value : props.selection)
const validCell = (cell: ReturnsCalendarCell) => Number.isInteger(cell.y) && Number.isInteger(cell.m) && cell.y >= 0 && cell.y < props.years.length && cell.m >= 0 && cell.m <= YEAR
const selection = computed(() => {
  const value = requested.value
  return value && validCell(value.start) && (!value.end || (validCell(value.end) && (value.start.m === YEAR) === (value.end.m === YEAR))) ? value : null
})
watchEffect(() => { if (requested.value && !selection.value && props.selection === undefined) internal.value = null })
const hover = computed(() => storedHover.value && validCell(storedHover.value) ? storedHover.value : null)
const pinned = computed(() => selection.value?.start ?? null)
const spanEnd = computed(() => selection.value?.end ?? null)
function setSelection(next: ReturnsCalendarSelection | null) {
  if (props.selection === undefined) internal.value = next
  emit('update:selection', next); emit('selectionChange', next)
}
const setHover = (cell: ReturnsCalendarCell | null) => { storedHover.value = cell }
const gridEl = useTemplateRef<HTMLElement>('grid')
const tooltipId = useId()
// the entrance wave owns the cells until it has landed; hover lifts take over after
const settled = shallowRef(false)
let settleTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => { settleTimer = setTimeout(() => { settled.value = true }, reduce.value ? 0 : (props.years.length + 13) * 20 + 500) })
onBeforeUnmount(() => clearTimeout(settleTimer))

// Normalize each displayed row to twelve months so missing values never shift the following year's positions.
const rows = computed(() => props.years.map((_, y) => MONTHS.map((__, m) => props.returns[y]?.[m] ?? 0)))
const totals = computed(() => rows.value.map(compound))
/** every month in order, so a span is one slice */
const flat = computed(() => rows.value.flat())
const valueAt = (y: number, m: number) => props.returns[y]?.[m] ?? 0

// one click on a month anchors a span and dims everything else; hovering then previews the run from the anchor to the pointer
// and compounds it live, a second click locks it, and the next click anywhere clears it
const ci = (c: ReturnsCalendarCell) => c.y * 12 + c.m
const clear = () => setSelection(null)
const anchored = computed(() => pinned.value !== null && pinned.value.m !== YEAR)
const spanTo = computed(() => spanEnd.value ?? (anchored.value && hover.value && hover.value.m !== YEAR ? hover.value : null))
const span = computed(() => {
  const start = pinned.value
  if (!anchored.value || !start) return null
  const to = spanTo.value
  return to ? { lo: Math.min(ci(start), ci(to)), hi: Math.max(ci(start), ci(to)) } : { lo: ci(start), hi: ci(start) }
})
const spanValue = computed(() => span.value ? compound(flat.value.slice(span.value.lo, span.value.hi + 1)) : 0)
// the Year column runs its own selection: anchor a year, then a second year spans whole years
const yearAnchored = computed(() => pinned.value !== null && pinned.value.m === YEAR)
const yearTo = computed(() => spanEnd.value ?? (yearAnchored.value && hover.value && hover.value.m === YEAR ? hover.value : null))
const yearSpan = computed(() => {
  const start = pinned.value
  if (!yearAnchored.value || !start) return null
  const end = yearTo.value ?? start
  return { lo: Math.min(start.y, end.y), hi: Math.max(start.y, end.y) }
})
const yearSpanValue = computed(() => yearSpan.value ? compound(flat.value.slice(yearSpan.value.lo * 12, (yearSpan.value.hi + 1) * 12)) : 0)
function select(cell: ReturnsCalendarCell) {
  const start = pinned.value
  if (spanEnd.value || same(start, cell.y, cell.m)) clear()
  // extend within the same track — month→month or year→year; a different track re-anchors
  else if (start && (start.m === YEAR) === (cell.m === YEAR)) setSelection({ start, end: cell })
  else setSelection({ start: cell })
}
/** the cell the grid reacts to: lift, labels and the year replay follow the pointer */
const hot = computed(() => hover.value ?? spanEnd.value ?? pinned.value)
/** the cell the tooltip hangs from: a locked span keeps it on its end */
const tip = computed(() => spanEnd.value ?? hover.value ?? pinned.value)
// the year replay is a plain-hover flourish; hold it back while a year span is being built
const sweepRow = computed(() => !yearAnchored.value && hot.value?.m === YEAR ? hot.value.y : null)
const showSpan = computed(() => span.value !== null && span.value.lo !== span.value.hi)
const showYearSpan = computed(() => yearSpan.value !== null && yearSpan.value.lo !== yearSpan.value.hi)
const tipValue = computed(() => {
  const at = tip.value
  if (showYearSpan.value) return yearSpanValue.value
  if (showSpan.value && span.value) return spanValue.value
  return at ? at.m === YEAR ? totals.value[at.y] : valueAt(at.y, at.m) : 0
})
const tipLabel = computed(() => {
  const at = tip.value
  const ys = props.years
  if (showYearSpan.value && yearSpan.value) return `${ys[yearSpan.value.lo]} – ${ys[yearSpan.value.hi]}`
  if (showSpan.value && span.value) return `${MONTHS[span.value.lo % 12]} ${ys[Math.floor(span.value.lo / 12)]} – ${MONTHS[span.value.hi % 12]} ${ys[Math.floor(span.value.hi / 12)]}`
  return at ? at.m === YEAR ? `${ys[at.y]}` : `${MONTHS[at.m]} ${ys[at.y]}` : ''
})
const tipNote = computed(() => {
  if (showYearSpan.value && yearSpan.value) return t('years', { count: yearSpan.value.hi - yearSpan.value.lo + 1 })
  if (showSpan.value && span.value) return t('months', { count: span.value.hi - span.value.lo + 1 })
  return tip.value?.m === YEAR ? t('forYear') : null
})

// tooltip: dismissed (Escape, or a tap elsewhere) until the tip moves to another cell
const dismissed = shallowRef<ReturnsCalendarCell | null>(null)
const tipKey = computed(() => tip.value ? `${tip.value.y}-${tip.value.m}` : 'closed')
const tipOpen = computed(() => tip.value !== null && dismissed.value !== tip.value)
const anchorEl = computed(() => {
  const at = tip.value
  return at ? gridEl.value?.querySelector<HTMLElement>(`[data-return-cell="${at.y}-${at.m}"]`) ?? null : null
})
function dismiss() { dismissed.value = tip.value }
const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && tipOpen.value) dismiss() }
const onDown = (event: PointerEvent) => { if (tipOpen.value && event.pointerType === 'touch' && !gridEl.value?.contains(event.target as Node)) dismiss() }
onMounted(() => { document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onDown, true) })
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown, true) })

const enter = (y: number, m: number) => () => setHover({ y, m })
const clearOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') clear() }
function cellState(y: number, m: number) {
  const on = same(hot.value, y, m)
  const v = valueAt(y, m)
  const i = y * 12 + m
  const isEnd = span.value ? i === span.value.lo || i === span.value.hi : same(pinned.value, y, m)
  // a year span lights whole rows; months in the picked years stay lit, the rest dim
  const dim = span.value ? i < span.value.lo || i > span.value.hi : yearSpan.value ? y < yearSpan.value.lo || y > yearSpan.value.hi : !!hot.value && !on && hot.value.y !== y && hot.value.m !== m
  return { on, v, isEnd, dim }
}
function cellAnimate(y: number, m: number, on: boolean) {
  if (sweepRow.value === y && !reduce.value) return { opacity: 1, scale: [1, 1.1, 1], transition: { duration: 0.36, ease: easeOut, delay: m * 0.035 } }
  if (settled.value) return { opacity: 1, scale: on && canHover.value && !reduce.value ? 1.15 : 1, transition: pressSpring }
  return { opacity: 1, scale: 1, transition: reduce.value ? { duration: 0 } : { ...pressSpring, delay: (y + m) * 0.02 } }
}
const yearDim = (y: number) => (span.value ? y < Math.floor(span.value.lo / 12) || y > Math.floor(span.value.hi / 12) : yearSpan.value ? y < yearSpan.value.lo || y > yearSpan.value.hi : !!hot.value && hot.value.y !== y) ? 0.35 : 1
const yearEnd = (y: number) => yearSpan.value ? y === yearSpan.value.lo || y === yearSpan.value.hi : same(pinned.value, y, YEAR)
</script>

<template>
  <div class="returns be-returns-calendar" data-slot="returns-calendar">
    <div ref="grid" class="grid" @pointerleave="setHover(null)">
      <span />
      <span v-for="c in cols" :key="c.name" class="head" :class="{ hot: hot?.m === c.m }">{{ c.initial }}</span>
      <span class="head" :class="{ hot: hot?.m === YEAR }">{{ t('year') }}</span>

      <template v-for="(year, y) in years" :key="year">
        <span class="year-label" :class="{ hot: hot?.y === y }">{{ `’${String(year).slice(2)}` }}</span>

        <template v-for="c in cols" :key="`${year}-${c.name}`">
          <span class="cell" :style="{ opacity: cellState(y, c.m).dim ? 0.35 : 1 }">
            <!-- the hit area is the cell plus half the gap on every side, so the grid has no dead space; the visual inside never takes pointer events -->
            <motion.button type="button" class="hit" :data-return-cell="`${y}-${c.m}`" :aria-describedby="cellState(y, c.m).on ? tooltipId : undefined"
              :aria-label="t('monthCell', { month: c.name, year: String(year), value: signed(cellState(y, c.m).v, 1) })" :aria-pressed="cellState(y, c.m).isEnd"
              :while-tap="reduce ? undefined : { scale: 0.92, transition: pressSpring }"
              @pointerenter="enter(y, c.m)()" @focus="enter(y, c.m)()" @blur="setHover(null)" @click="select({ y, m: c.m })" @keydown="clearOnEscape">
              <motion.span class="face" :style="{
                background: tint(cellState(y, c.m).v, range, cellState(y, c.m).on),
                color: `color-mix(in srgb, var(--beui-foreground) ${Math.round(85 + Math.min(Math.abs(cellState(y, c.m).v) / range, 1) * 15)}%, transparent)`,
                boxShadow: cellState(y, c.m).isEnd ? RING : 'none',
              }" :initial="reduce ? false : { opacity: 0, scale: 0.6 }" :animate="cellAnimate(y, c.m, cellState(y, c.m).on)">
                <!-- the ring lives INSIDE the cell so it always shares the cell's exact size, scale and roundness -->
                <Transition name="ring">
                  <span v-if="cellState(y, c.m).on && !cellState(y, c.m).isEnd" class="ring" :style="{ borderColor: cellState(y, c.m).v >= 0 ? UP : DOWN }" />
                </Transition>
                {{ Math.abs(cellState(y, c.m).v) >= 4 ? Math.round(cellState(y, c.m).v) : '' }}
              </motion.span>
            </motion.button>
          </span>
        </template>

        <span class="total" :style="{ opacity: yearDim(y) }">
          <motion.button type="button" class="hit" :data-return-cell="`${y}-${YEAR}`" :aria-describedby="same(hot, y, YEAR) ? tooltipId : undefined"
            :aria-label="t('yearCell', { year: String(year), value: signed(totals[y], 1) })" :aria-pressed="yearEnd(y)"
            :while-tap="reduce ? undefined : { scale: 0.96, transition: pressSpring }"
            @pointerenter="enter(y, YEAR)()" @focus="enter(y, YEAR)()" @blur="setHover(null)" @click="select({ y, m: YEAR })" @keydown="clearOnEscape">
            <!-- a neutral cell under the colored number: the tint of the same hue ate its contrast -->
            <motion.span class="face year" :style="{
              background: same(hot, y, YEAR) ? 'var(--beui-background)' : 'color-mix(in srgb, var(--beui-foreground) 6%, transparent)',
              color: ink(totals[y]),
              boxShadow: yearEnd(y) ? RING : same(hot, y, YEAR) ? 'inset 0 0 0 1px color-mix(in srgb, var(--beui-foreground) 12%, transparent)' : 'none',
            }" :initial="reduce ? false : { opacity: 0 }" :animate="{ opacity: 1 }"
              :transition="reduce ? { duration: 0 } : { duration: 0.4, ease: easeOut, delay: 0.02 * (y + 13) }">
              <Transition name="ring">
                <span v-if="same(hot, y, YEAR) && !yearEnd(y)" class="ring" :style="{ borderColor: totals[y] >= 0 ? UP : DOWN }" />
              </Transition>
              {{ signed(totals[y], 0) }}%
            </motion.span>
          </motion.button>
        </span>
      </template>
    </div>
    <ChartTip :key="tipKey" :id="tooltipId" :open="tip !== null && tipOpen" :anchor="anchorEl" :follow-cursor="false" side="top" @dismiss="dismiss">
      <span class="tip">
        <span class="muted">{{ tipLabel }}</span>
        <span class="value" :style="{ color: ink(tipValue) }">
          <NumberTicker :value="Math.round(Math.abs(tipValue) * 10)" :format="v => (v / 10).toFixed(1)" :prefix="tipValue >= 0 ? '+' : '−'" suffix="%" :duration="0.35" :start-on-view="false" />
        </span>
        <span v-if="tipNote" class="muted">{{ tipNote }}</span>
      </span>
    </ChartTip>
  </div>
</template>

<style scoped>
.returns { --ink-l: .5; width: 480px; max-width: 100%; font-family: inherit; }
.grid { position: relative; display: grid; grid-template-columns: 32px repeat(12, 1fr) 52px; gap: 4px; }
.head { padding-bottom: 4px; text-align: center; font-size: 10px; line-height: 1.5; color: var(--beui-muted-foreground); transition: color .2s; }
.head.hot, .year-label.hot { color: var(--beui-foreground); }
.year-label { display: flex; align-items: center; justify-content: flex-end; padding-right: 6px; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 10px; line-height: 1.5; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); transition: color .2s; }
.cell { position: relative; display: block; width: 100%; aspect-ratio: 1 / 1; transition: opacity .2s; }
.total { position: relative; display: block; transition: opacity .2s; }
.hit { position: absolute; inset: -2px; display: block; margin: 0; padding: 0; border: 0; border-radius: 5px; background: transparent; color: inherit; font: inherit; outline: none; cursor: pointer; }
.hit:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 12%, transparent); }
.face { position: absolute; inset: 2px; display: grid; place-items: center; border-radius: 4px; pointer-events: none; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 9px; line-height: 1.5; font-weight: 500; font-variant-numeric: tabular-nums; transition: background .15s, box-shadow .15s; }
.face.year { font-size: 11px; }
.ring { position: absolute; inset: 0; border: 1.5px solid; border-radius: inherit; pointer-events: none; }
.ring-enter-active { transition: opacity .12s cubic-bezier(.16, 1, .3, 1); }
.ring-leave-active { transition: opacity .12s cubic-bezier(.16, 1, .3, 1); }
.ring-enter-from, .ring-leave-to { opacity: 0; }
.tip { display: flex; align-items: center; gap: 6px; text-align: left; line-height: 1.3333; white-space: nowrap; }
.muted { color: var(--beui-muted-foreground); }
.value { display: inline-flex; align-items: center; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-variant-numeric: tabular-nums; }
</style>

<style>
.dark .be-returns-calendar, [data-beui-theme='dark'] .be-returns-calendar { --ink-l: 1; }
</style>
