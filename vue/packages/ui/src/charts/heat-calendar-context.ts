import { computed, inject, onBeforeUnmount, onMounted, provide, shallowRef, useId, watchEffect, type InjectionKey } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { interpolate, useHoverCapable, readonlyView } from './plot-utils'

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

export interface HeatCalendarProps {
  /** Noun after every count, e.g. "commits", "ships". */
  unit?: string
  /** Number of week columns. */
  weeks?: number
  /** Count a cell at intensity 1 stands for; a cell reads `intensity × maxCount`. */
  maxCount?: number
  /** `values[week][day]` intensities in 0..1, seven days per week. Missing values are zero. */
  values?: readonly (readonly number[])[]
  /** Last UTC calendar day of the grid. Defaults to today after mount; explicit dates render identically in every timezone. */
  endDate?: Date
  /** The single hue. Any CSS color; magnitude maps to its strength, never to a second color. */
  color?: string
  /** Controlled selection; null clears it. Cell coordinates are zero-based week/day (Monday first). */
  selection?: HeatCalendarSelection | null
  defaultSelection?: HeatCalendarSelection | null
  /** Override any built-in string. */
  labels?: Partial<HeatCalendarMessages>
}
export type HeatCalendarEmit = {
  (event: 'update:selection', range: HeatCalendarSelection | null): void
  (event: 'selectionChange', range: HeatCalendarSelection | null): void
}
export interface HeatCalendarTooltipData { date: Date; count: number; total: number; startDate: Date; endDate: Date; days: number }

/** Five buckets: 0 is the neutral empty cell, 1 to 4 mix the one hue in harder. */
export const HEAT_STEPS = [0, 24, 46, 70, 94] as const
const EMPTY = 'color-mix(in srgb, var(--beui-foreground) 6%, transparent)'
/** Cell size and gap; every position in the grid derives from these. */
export const HEAT_GAP = 4
export const HEAT_PITCH = 16 + HEAT_GAP
export const HEAT_MONTH_ROW = 12
/** How far a cell rises when it is the hovered one, its neighbour, or two away. */
export const HEAT_LIFT = [1.3, 1.08, 1.03]
export const HEAT_DAYS = Array.from({ length: 7 }, (_, d) => d)
const startOfDay = (d: Date) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x }
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x }
/** Monday on or before `d`, so every column reads Mon to Sun, top to bottom. */
const mondayOf = (d: Date) => addDays(startOfDay(d), -((d.getUTCDay() + 6) % 7))
const formats = {
  day: new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }),
  month: new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' }),
  range: new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }),
}

export function useHeatCalendarModel(props: HeatCalendarProps, emit: HeatCalendarEmit) {
  const t = (key: keyof HeatCalendarMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? heatCalendarMessages[key], values)
  const unit = computed(() => props.unit ?? t('unit'))
  const reduce = useReducedMotion()
  const canHover = useHoverCapable()
  const weeks = computed(() => Math.max(0, Math.floor(props.weeks ?? 16)))
  const maxCount = computed(() => props.maxCount ?? 14)
  const color = computed(() => props.color ?? 'var(--beui-accent, oklch(72% 0.18 195))')
  const storedHover = shallowRef<HeatCalendarCell | null>(null)
  const internal = shallowRef(props.defaultSelection ?? null)
  const requested = computed(() => props.selection === undefined ? internal.value : props.selection)
  function setSelection(next: HeatCalendarSelection | null) {
    if (props.selection === undefined) internal.value = next
    emit('update:selection', next); emit('selectionChange', next)
  }
  /** The grid element; `HeatCalendarGrid` registers it so the tooltip can find its cells. */
  const gridEl = shallowRef<HTMLElement | null>(null)
  const tooltipId = useId()
  const step = shallowRef<number | null>(null)
  // the entrance wave owns the cells until it has landed; the ripple takes over after
  const settled = shallowRef(false)
  let settleTimer: ReturnType<typeof setTimeout> | undefined
  // "today" is read after mount: the server and a viewer on another calendar day must produce the same HTML, so the grid
  // renders first and its dates fill in on the client. An explicit `endDate` is deterministic and skips this.
  const today = shallowRef<Date | null>(null)
  onMounted(() => {
    settleTimer = setTimeout(() => { settled.value = true }, reduce.value ? 0 : (weeks.value + 7) * 18 + 500)
    today.value = startOfDay(new Date())
  })
  onBeforeUnmount(() => clearTimeout(settleTimer))
  const end = computed(() => props.endDate && Number.isFinite(props.endDate.getTime()) ? startOfDay(props.endDate) : today.value)
  const start = computed(() => end.value ? addDays(mondayOf(end.value), -(weeks.value - 1) * 7) : null)

  const level = (w: number, d: number) => Math.max(0, Math.min(1, props.values?.[w]?.[d] ?? 0))
  const bucket = (v: number) => Math.min(4, Math.floor(v * 5))
  const fill = (b: number) => b === 0 ? EMPTY : `color-mix(in srgb, ${color.value} ${HEAT_STEPS[b]}%, transparent)`
  const count = (v: number) => Math.round(v * maxCount.value)
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
    const anchor = pinned.value
    // a locked span clears on the next click anywhere, so leaving it is one press
    if (spanEnd.value) clear()
    else if (anchor && idx(anchor) === idx(cell)) setSelection(null)
    else if (anchor) setSelection({ start: anchor, end: cell })
    else setSelection({ start: cell })
  }
  /** the cell the grid reacts to: lift, ripple and label highlight follow the pointer */
  const hot = computed(() => hover.value ?? spanEnd.value ?? pinned.value)
  /** the cell the tooltip hangs from: a locked span keeps it on its end */
  const tip = computed(() => spanEnd.value ?? hover.value ?? pinned.value)
  const tipDate = computed(() => tip.value ? dateOf(tip.value.w, tip.value.d) : null)
  const hotMonth = computed(() => hot.value ? dateOf(hot.value.w, hot.value.d)?.getUTCMonth() ?? null : null)
  const tooltip = computed<HeatCalendarTooltipData | null>(() => {
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

  const setStep = (value: typeof step.value) => { step.value = value }
  const setGridEl = (value: typeof gridEl.value) => { gridEl.value = value }
  return {
    t, unit, formats, weeks, reduce, canHover, hover, pinned, spanEnd, step: readonlyView(step), setStep, settled, start, end, level, bucket, fill, count, dateOf, future,
    cols, clear, span, spanTotal, select, hot, tip, tipDate, hotMonth, setHover, gridEl: readonlyView(gridEl), setGridEl, tooltipId, tooltip, selection, setSelection,
  }
}

export type HeatCalendarModel = ReturnType<typeof useHeatCalendarModel>
const KEY: InjectionKey<HeatCalendarModel> = Symbol('heat-calendar')

export function provideHeatCalendar(model: HeatCalendarModel) { provide(KEY, model) }

/** The state of the enclosing `HeatCalendar`; its parts must be rendered inside it. */
export function useHeatCalendar() {
  const model = inject(KEY, null)
  if (!model) throw new Error('HeatCalendar parts must be inside HeatCalendar')
  return model
}
