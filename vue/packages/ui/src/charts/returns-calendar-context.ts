import { computed, inject, onBeforeUnmount, onMounted, provide, shallowRef, useId, watchEffect, type InjectionKey } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { interpolate, useHoverCapable, readonlyView } from './plot-utils'

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
/** Zero-based row and month; month 12 selects the year total. */
export interface ReturnsCalendarCell { y: number; m: number }
export interface ReturnsCalendarSelection { start: ReturnsCalendarCell; end?: ReturnsCalendarCell }
export interface ReturnsCalendarTooltipData { label: string; value: number; note: string | null }

export interface ReturnsCalendarProps {
  /** Row labels, one per row of `returns`. */
  years?: readonly number[]
  /** `returns[year][month]` in percent, twelve months per row. */
  returns?: readonly (readonly number[])[]
  /** Controlled selection; null clears it. */
  selection?: ReturnsCalendarSelection | null
  defaultSelection?: ReturnsCalendarSelection | null
  /** Override any built-in string. */
  labels?: Partial<ReturnsCalendarMessages>
}
export type ReturnsCalendarEmit = {
  (event: 'update:selection', range: ReturnsCalendarSelection | null): void
  (event: 'selectionChange', range: ReturnsCalendarSelection | null): void
}

export const RETURNS_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const RETURNS_COLS = RETURNS_MONTHS.map((name, m) => ({ name, initial: name[0], m }))
/** The compounded column, addressed like a thirteenth month. */
export const RETURNS_YEAR = 12
const YEAR = RETURNS_YEAR
const MONTHS = RETURNS_MONTHS
const compound = (run: readonly number[]) => (run.reduce((acc, r) => acc * (1 + r / 100), 1) - 1) * 100
export const signed = (v: number, dp: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(dp)}`
export const UP = 'var(--beui-success, oklch(70% 0.18 155))'
export const DOWN = 'var(--beui-danger, oklch(62% 0.22 25))'
/** magnitude → strength of the one up or down hue, never a second color */
export const tint = (v: number, range: number, on: boolean) => `color-mix(in srgb, ${v >= 0 ? UP : DOWN} ${Math.round(Math.min(Math.abs(v) / range, 1) * 55 + (on ? 24 : 8))}%, transparent)`
/** A hue as text: on the light page its lightness is capped so 11px numbers reach AA (`--ink-l` flips per theme). */
export const ink = (v: number) => `oklch(from ${v >= 0 ? UP : DOWN} min(l, var(--ink-l, 1)) c h)`
export const same = (a: ReturnsCalendarCell | null, y: number, m: number) => a?.y === y && a?.m === m
export const RETURNS_RING = 'inset 0 0 0 1.5px var(--beui-foreground)'

export function useReturnsCalendarModel(props: ReturnsCalendarProps, emit: ReturnsCalendarEmit) {
  const t = (key: keyof ReturnsCalendarMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? returnsCalendarMessages[key], values)
  const years = computed(() => props.years ?? [])
  const reduce = useReducedMotion()
  const canHover = useHoverCapable()
  const storedHover = shallowRef<ReturnsCalendarCell | null>(null)
  const internal = shallowRef(props.defaultSelection ?? null)
  const requested = computed(() => props.selection === undefined ? internal.value : props.selection)
  const validCell = (cell: ReturnsCalendarCell) => Number.isInteger(cell.y) && Number.isInteger(cell.m) && cell.y >= 0 && cell.y < years.value.length && cell.m >= 0 && cell.m <= YEAR
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
  /** The grid element; `ReturnsCalendarGrid` registers it so the tooltip can find its cells. */
  const gridEl = shallowRef<HTMLElement | null>(null)
  const tooltipId = useId()
  // the entrance wave owns the cells until it has landed; hover lifts take over after
  const settled = shallowRef(false)
  let settleTimer: ReturnType<typeof setTimeout> | undefined
  onMounted(() => { settleTimer = setTimeout(() => { settled.value = true }, reduce.value ? 0 : (years.value.length + 13) * 20 + 500) })
  onBeforeUnmount(() => clearTimeout(settleTimer))

  // Normalize each displayed row to twelve months so missing values never shift the following year's positions.
  const rows = computed(() => years.value.map((_, y) => MONTHS.map((__, m) => props.returns?.[y]?.[m] ?? 0)))
  const totals = computed(() => rows.value.map(compound))
  /** every month in order, so a span is one slice */
  const flat = computed(() => rows.value.flat())
  const valueAt = (y: number, m: number) => props.returns?.[y]?.[m] ?? 0
  /** percent that saturates a month's tint */
  const range = 8

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
    const ys = years.value
    if (showYearSpan.value && yearSpan.value) return `${ys[yearSpan.value.lo]} – ${ys[yearSpan.value.hi]}`
    if (showSpan.value && span.value) return `${MONTHS[span.value.lo % 12]} ${ys[Math.floor(span.value.lo / 12)]} – ${MONTHS[span.value.hi % 12]} ${ys[Math.floor(span.value.hi / 12)]}`
    return at ? at.m === YEAR ? `${ys[at.y]}` : `${MONTHS[at.m]} ${ys[at.y]}` : ''
  })
  const tipNote = computed(() => {
    if (showYearSpan.value && yearSpan.value) return t('years', { count: yearSpan.value.hi - yearSpan.value.lo + 1 })
    if (showSpan.value && span.value) return t('months', { count: span.value.hi - span.value.lo + 1 })
    return tip.value?.m === YEAR ? t('forYear') : null
  })
  const enter = (y: number, m: number) => () => setHover({ y, m })
  const clearOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') clear() }

  const setGridEl = (value: typeof gridEl.value) => { gridEl.value = value }
  return {
    years, cols: RETURNS_COLS, months: MONTHS, t, reduce, canHover, hover, pinned, spanEnd, settled, totals, valueAt, range, clear, span, yearSpan, hot, tip, sweepRow,
    tipValue, tipLabel, tipNote, enter, select, clearOnEscape, setHover, gridEl: readonlyView(gridEl), setGridEl, tooltipId, selection, setSelection,
  }
}

export type ReturnsCalendarModel = ReturnType<typeof useReturnsCalendarModel>
const KEY: InjectionKey<ReturnsCalendarModel> = Symbol('returns-calendar')

export function provideReturnsCalendar(model: ReturnsCalendarModel) { provide(KEY, model) }

/** The state of the enclosing `ReturnsCalendar`; its parts must be rendered inside it. */
export function useReturnsCalendar() {
  const model = inject(KEY, null)
  if (!model) throw new Error('ReturnsCalendar parts must be inside ReturnsCalendar')
  return model
}
