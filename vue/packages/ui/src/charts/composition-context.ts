import { computed, inject, provide, shallowRef, useId, type InjectionKey } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { interpolate, useHoverCapable, readonlyView } from './plot-utils'

/** English defaults. Override per instance with `labels`. */
export const compositionChartMessages = {
  label: 'Composition over time',
  empty: 'No composition data',
  noData: 'No data',
  inspect: 'Inspect period',
  highlight: 'Highlight {name}',
  missingValue: 'Missing value',
  incomplete: 'No complete data for this period.',
}
export type CompositionChartMessages = typeof compositionChartMessages
export interface CompositionSeries {
  id: string
  name: string
  color: string
  /** Nonnegative values aligned with periods. Missing/invalid values leave a gap. */
  values: readonly (number | null)[]
}

export interface CompositionChartProps {
  series: readonly CompositionSeries[]
  /** Unique period labels in display order. */
  periods: readonly string[]
  view?: 'bar' | 'area'
  /** Inspected period. */
  period?: string
  defaultPeriod?: string
  formatValue?: (value: number) => string
  label?: string
  /** Override any built-in string. */
  labels?: Partial<CompositionChartMessages>
}

export type CompositionChartEmit = {
  (event: 'update:period', period: string): void
  (event: 'periodChange', period: string): void
}

const defaultFormat = (value: number) => value.toLocaleString('en', { maximumFractionDigits: 2 })

export function useCompositionModel(props: CompositionChartProps, emit: CompositionChartEmit) {
  const t = (key: keyof CompositionChartMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? compositionChartMessages[key], values)
  const label = computed(() => props.label ?? t('label'))
  const formatValue = (value: number) => (props.formatValue ?? defaultFormat)(value)
  const view = computed(() => props.view ?? 'bar')
  const model = computed(() => {
    const seen = new Set<string>()
    const rows = props.series.filter(row => !seen.has(row.id) && !!seen.add(row.id))
    const periodIds = new Set<string>()
    const columns = props.periods.flatMap((id, position) => {
      if (periodIds.has(id)) return []
      periodIds.add(id)
      const values = rows.map(row => row.values[position])
      const valid = values.length > 0 && values.every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)
      // Scale before summing so large finite input values cannot overflow shares.
      const max = valid ? Math.max(0, ...values.map(value => value ?? 0)) : 0
      const scaledTotal = max > 0 ? values.reduce<number>((sum, value) => sum + (value ?? 0) / max, 0) : 0
      let offset = 0
      const segments = rows.map((row, at) => {
        const value = values[at] ?? null
        const share = scaledTotal > 0 ? (value ?? 0) / max / scaledTotal * 100 : 0
        const segment = { ...row, value, share, offset }
        offset += share
        return segment
      })
      return [{ id, valid: valid && scaledTotal > 0, segments }]
    })
    return { rows, columns }
  })
  const rows = computed(() => model.value.rows)
  const columns = computed(() => model.value.columns)

  const internal = shallowRef(props.defaultPeriod)
  const pinned = shallowRef<string | null>(null)
  const hovered = shallowRef<string | null>(null)
  const focused = shallowRef<string | null>(null)
  const known = (id: string | null) => rows.value.some(row => row.id === id)
  const highlight = computed(() => [hovered.value, focused.value, pinned.value].find(id => id !== null && known(id)) ?? null)
  const index = computed(() => {
    const selected = props.period === undefined ? internal.value : props.period
    const found = columns.value.findIndex(column => column.id === selected)
    return found >= 0 ? found : columns.value.length - 1
  })
  const column = computed(() => columns.value[index.value])
  function select(next: string) {
    if (props.period === undefined) internal.value = next
    if (next !== columns.value[index.value]?.id) { emit('update:period', next); emit('periodChange', next) }
  }
  const reduce = useReducedMotion()
  const canHover = useHoverCapable()
  const tooltipId = useId()

  const setPinned = (value: typeof pinned.value) => { pinned.value = value }
  const setHovered = (value: typeof hovered.value) => { hovered.value = value }
  const setFocused = (value: typeof focused.value) => { focused.value = value }
  return { t, label, formatValue, view, rows, columns, pinned: readonlyView(pinned), setPinned, hovered: readonlyView(hovered), setHovered, focused: readonlyView(focused), setFocused, highlight, index, column, select, reduce, canHover, tooltipId }
}

export type CompositionModel = ReturnType<typeof useCompositionModel>
const COMPOSITION: InjectionKey<CompositionModel> = Symbol('composition-chart')

export function provideComposition(model: CompositionModel) { provide(COMPOSITION, model) }

/** The state of the enclosing `CompositionChart`; its parts must be rendered inside it. */
export function useCompositionChart() {
  const model = inject(COMPOSITION, null)
  if (!model) throw new Error('Composition chart parts must be rendered inside CompositionChart.')
  return model
}
