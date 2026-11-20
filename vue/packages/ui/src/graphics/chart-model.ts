import { computed, inject, provide, shallowRef, useId, watch, type InjectionKey } from 'vue'
import { normalizeChart, valueAxis, type LineChartSeries, type LineChartCurve } from './chart-geometry'

export type { LineChartSeries, LineChartCurve } from './chart-geometry'
export const lineChartMessages = {
  label: 'Line chart', loading: 'Loading data', loadingStatus: 'Loading', inspect: '{label}: inspect values',
  noData: 'No data', missing: 'no data', dataCaption: '{label} data', category: 'Category',
  series: 'Series', seriesValue: '{name} {value}',
}
export type LineChartMessages = typeof lineChartMessages
export interface LineChartProps {
  series: readonly LineChartSeries[]
  categories: readonly string[]
  variant?: 'line' | 'area'
  curve?: LineChartCurve
  domain?: readonly [number, number]
  activeId?: string | null
  defaultActiveId?: string | null
  hiddenSeries?: readonly string[]
  defaultHiddenSeries?: readonly string[]
  formatValue?: (value: number) => string
  formatTick?: (value: number) => string
  label?: string
  status?: 'ready' | 'loading'
  loadingLabel?: string
  labels?: Partial<LineChartMessages>
}

const decimal = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const chartKey: InjectionKey<ReturnType<typeof provideLineChart>> = Symbol('beui-line-chart')

export function provideLineChart(props: Readonly<LineChartProps>, changeActive: (id: string | null) => void, changeHidden: (ids: string[]) => void) {
  const tooltipId = useId()
  const data = computed(() => normalizeChart(props.series, props.categories))
  const active = shallowRef(props.defaultActiveId ?? null)
  const storedHidden = shallowRef(props.defaultHiddenSeries ?? [])
  const hovered = shallowRef<string | null>(null)
  const hidden = computed(() => props.hiddenSeries ?? storedHidden.value)
  const visible = computed(() => data.value.rows.filter(row => !hidden.value.includes(row.id)))
  const domain = computed(() => valueAxis(visible.value, props.variant === 'area', props.domain))
  const loading = computed(() => props.status === 'loading')
  const messages = computed(() => ({ ...lineChartMessages, ...props.labels }))
  const label = computed(() => props.label ?? messages.value.label)
  const requested = computed(() => props.activeId === undefined ? active.value : props.activeId)
  const index = computed(() => requested.value === null ? -1 : data.value.categories.indexOf(requested.value))
  const open = shallowRef(false)
  const overlay = shallowRef<HTMLElement | null>(null)
  const geometry = shallowRef({ width: 0, height: 0 })
  const inspecting = computed(() => open.value && index.value >= 0 && !loading.value)
  watch([data, requested], () => {
    if (props.activeId === undefined && index.value < 0) active.value = null
  }, { immediate: true })
  watch(loading, value => { if (value) open.value = false })
  function inspect(position: number) {
    const next = data.value.categories[position]
    if (next === undefined) return
    if (next !== requested.value) {
      if (props.activeId === undefined) active.value = next
      changeActive(next)
    }
    open.value = true
  }
  function toggle(id: string) {
    const next = hidden.value.includes(id) ? hidden.value.filter(key => key !== id) : [...hidden.value, id]
    if (props.hiddenSeries === undefined) storedHidden.value = next
    changeHidden(next)
  }
  const model = {
    props, data, hidden, visible, hovered, domain, index, open, inspect, toggle, tooltipId,
    overlay, geometry, inspecting, loading, label, messages,
    valueText: (value: number | null) => value === null ? messages.value.noData : (props.formatValue ?? decimal.format)(value),
    tickText: (value: number) => (props.formatTick ?? compact.format)(value),
  }
  provide(chartKey, model)
  return model
}

export function useLineChart() {
  const model = inject(chartKey)
  if (!model) throw new Error('Line chart parts must be rendered inside LineChart.')
  return model
}
