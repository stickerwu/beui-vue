import { computed, inject, provide, shallowRef, useId, watch, type InjectionKey } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { normalizeChart, valueAxis, type LineChartSeries } from '../graphics/chart-geometry'
import { interpolate, useHoverCapable, readonlyView } from './plot-utils'

/** English defaults. Override per instance with `labels`. */
export const barChartMessages = {
  label: 'Bar chart', inspect: '{label}: inspect categories', noData: 'No data', missing: 'no data', dataCaption: '{label} data',
  category: 'Category', total: 'Total', series: 'Series', seriesValue: '{name} {value}', totalValue: 'Total {value}',
}
export type BarChartMessages = typeof barChartMessages

export interface BarChartProps {
  /** Nonnegative values aligned with categories. Missing or negative values leave a gap. */
  series: readonly LineChartSeries[]
  /** Unique category labels in display order. */
  categories: readonly string[]
  layout?: 'grouped' | 'stacked'
  orientation?: 'vertical' | 'horizontal'
  /** Order categories by their visible total. Bars glide to their new place when it changes. */
  sort?: 'none' | 'ascending' | 'descending'
  /** Fixed top of the value axis. Defaults to a rounded value above the tallest bar. */
  max?: number
  /** Inspected category, by label. */
  activeId?: string | null
  defaultActiveId?: string | null
  /** Series ids hidden through the legend. */
  hiddenSeries?: readonly string[]
  defaultHiddenSeries?: readonly string[]
  formatValue?: (value: number) => string
  /** Axis tick labels. Defaults to compact notation (1.2K). */
  formatTick?: (value: number) => string
  label?: string
  /** Override any built-in string, including the shared `xyChart` ones. */
  labels?: Partial<BarChartMessages>
}

export interface BarChartTooltipRow { id: string; name: string; color: string; value: number | null }
export interface BarChartTooltipData { category: string; index: number; rows: BarChartTooltipRow[]; total: number }

export type BarChartEmit = {
  (event: 'update:activeId', id: string | null): void
  (event: 'activeChange', id: string | null): void
  (event: 'update:hiddenSeries', ids: string[]): void
  (event: 'hiddenSeriesChange', ids: string[]): void
}

const decimal = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

export function useBarChartModel(props: BarChartProps, emit: BarChartEmit) {
  const t = (key: keyof BarChartMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? barChartMessages[key], values)
  const formatValue = (value: number) => (props.formatValue ?? decimal.format)(value)
  const formatTick = (value: number) => (props.formatTick ?? compact.format)(value)
  const label = computed(() => props.label ?? t('label'))
  const reduce = useReducedMotion()
  const canHover = useHoverCapable()
  const tooltipId = useId()
  const layout = computed(() => props.layout ?? 'grouped')
  const orientation = computed(() => props.orientation ?? 'vertical')
  const grouped = computed(() => layout.value !== 'stacked')
  const vertical = computed(() => orientation.value !== 'horizontal')

  const data = computed(() => normalizeChart(props.series.map(row => ({ ...row, values: row.values.map(value => value !== null && value >= 0 ? value : null) })), props.categories))
  const hiddenInternal = shallowRef<readonly string[]>(props.defaultHiddenSeries ?? [])
  const hidden = computed(() => props.hiddenSeries ?? hiddenInternal.value)
  const visibleRows = computed(() => data.value.rows.filter(row => !hidden.value.includes(row.id)))
  const hovered = shallowRef<string | null>(null)
  const highlight = computed(() => visibleRows.value.some(row => row.id === hovered.value) ? hovered.value : null)
  const totals = computed(() => data.value.categories.map((_, index) => visibleRows.value.reduce((sum, row) => sum + (row.values[index] ?? 0), 0)))
  // Visual order. Ties keep their given order so equal bars never swap places.
  const order = computed(() => {
    const ranks = data.value.categories.map((_, index) => index)
    if (props.sort === 'ascending') ranks.sort((a, b) => totals.value[a] - totals.value[b] || a - b)
    else if (props.sort === 'descending') ranks.sort((a, b) => totals.value[b] - totals.value[a] || a - b)
    return ranks
  })
  const domain = computed(() => valueAxis(grouped.value ? visibleRows.value : [{ id: '', name: '', color: '', values: totals.value }], true,
    props.max !== undefined && props.max > 0 ? [0, props.max] : undefined))

  // The inspected category is held by id and resolved during render.
  const internalActive = shallowRef<string | null>(props.defaultActiveId ?? null)
  const requested = computed(() => props.activeId === undefined ? internalActive.value : props.activeId)
  const activeIndex = computed(() => requested.value === null ? -1 : data.value.categories.indexOf(requested.value))
  watch([data, requested], () => { if (props.activeId === undefined && internalActive.value !== null && activeIndex.value < 0) internalActive.value = null }, { immediate: true })
  const open = shallowRef(false)
  const touching = shallowRef(false)
  /** The inspection overlay the tooltip hangs from; registered by `BarChartPlot`. */
  const plot = shallowRef<HTMLElement | null>(null)
  function setActive(id: string) {
    if (props.activeId === undefined) internalActive.value = id
    if (requested.value !== id) { emit('update:activeId', id); emit('activeChange', id) }
  }
  function toggle(id: string) {
    const next = hidden.value.includes(id) ? hidden.value.filter(key => key !== id) : [...hidden.value, id]
    if (props.hiddenSeries === undefined) hiddenInternal.value = next
    emit('update:hiddenSeries', next); emit('hiddenSeriesChange', next)
  }

  const setHovered = (value: typeof hovered.value) => { hovered.value = value }
  const setOpen = (value: typeof open.value) => { open.value = value }
  const setTouching = (value: typeof touching.value) => { touching.value = value }
  const setPlot = (value: typeof plot.value) => { plot.value = value }
  return { t, formatValue, formatTick, label, reduce, canHover, tooltipId, layout, orientation, grouped, vertical, data, hidden, visibleRows, hovered: readonlyView(hovered), setHovered, highlight, totals, order, domain, activeIndex, open: readonlyView(open), setOpen, touching: readonlyView(touching), setTouching, plot: readonlyView(plot), setPlot, setActive, toggle }
}

export type BarChartModel = ReturnType<typeof useBarChartModel>
const BAR_CHART: InjectionKey<BarChartModel> = Symbol('bar-chart')

export function provideBarChart(model: BarChartModel) { provide(BAR_CHART, model) }

/** The state of the enclosing `BarChart`; its parts must be rendered inside it. */
export function useBarChart() {
  const model = inject(BAR_CHART, null)
  if (!model) throw new Error('Bar chart parts must be rendered inside BarChart.')
  return model
}
