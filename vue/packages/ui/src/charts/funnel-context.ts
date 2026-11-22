import { computed, inject, provide, type InjectionKey } from 'vue'
import { interpolate } from './plot-utils'

/** English defaults. Override per instance with `labels`. */
export const funnelChartMessages = {
  label: 'Conversion funnel', unit: 'people', empty: 'No funnel data', stages: 'Funnel stages',
  fromPrevious: '{percent} from previous stage', gained: '{value} gained', dropped: '{value} dropped',
  ofStart: '{percent} of starting total', stage: '{stage}: {value} {unit}, {percent} of starting total',
  range: '{first} → {last} {unit}', overall: 'Overall conversion',
}
export type FunnelChartMessages = typeof funnelChartMessages
export interface FunnelStage { id: string; label: string; value: number; color?: string }

export interface FunnelChartProps {
  /** Ordered stages with finite, nonnegative counts; duplicate IDs are omitted. */
  stages: readonly FunnelStage[]
  direction?: 'vertical' | 'horizontal'
  unit?: string
  label?: string
  formatValue?: (value: number) => string
  /** Override any built-in string. */
  labels?: Partial<FunnelChartMessages>
}

const defaultFormat = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
export const funnelPercentage = (value: number | null) => value === null ? '—' : `${value.toFixed(1)}%`
const colors = ['#8b5cf6', '#7774ef', '#548ee4', '#2ca6bc', '#14b8a6']

/** Each stage's centre width encodes its value; shared boundaries join without gaps. */
function funnelPath(proportions: readonly number[], index: number, direction: 'horizontal' | 'vertical') {
  const value = proportions[index]
  const top = index === 0 ? value : (proportions[index - 1] + value) / 2
  const bottom = index === proportions.length - 1 ? value : (value + proportions[index + 1]) / 2
  const start = index / proportions.length
  const end = (index + 1) / proportions.length
  const middle = (start + end) / 2
  const quarter = (end - start) / 4
  const point = (cross: number, along: number) => direction === 'vertical' ? `${cross * 1000},${along * 500}` : `${along * 1000},${cross * 500}`
  const left = (width: number) => 0.5 - width * 0.46
  const right = (width: number) => 0.5 + width * 0.46
  return `M${point(left(top), start)} L${point(right(top), start)} C${point(right(top), start + quarter)} ${point(right(value), middle - quarter)} ${point(right(value), middle)} C${point(right(value), middle + quarter)} ${point(right(bottom), end - quarter)} ${point(right(bottom), end)} L${point(left(bottom), end)} C${point(left(bottom), end - quarter)} ${point(left(value), middle + quarter)} ${point(left(value), middle)} C${point(left(value), middle - quarter)} ${point(left(top), start + quarter)} ${point(left(top), start)} Z`
}

export function useFunnelModel(props: FunnelChartProps) {
  const t = (key: keyof FunnelChartMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? funnelChartMessages[key], values)
  const formatValue = (value: number) => (props.formatValue ?? defaultFormat)(value)
  const unit = computed(() => props.unit ?? t('unit'))
  const direction = computed(() => props.direction ?? 'vertical')
  const label = computed(() => props.label ?? t('label'))
  const model = computed(() => {
    const seen = new Set<string>()
    const valid = props.stages.filter(stage => {
      if (seen.has(stage.id) || !Number.isFinite(stage.value) || stage.value < 0) return false
      seen.add(stage.id)
      return true
    })
    const first = valid[0]?.value ?? 0
    const last = valid.at(-1)?.value ?? 0
    const maximum = valid.reduce((max, stage) => Math.max(max, stage.value), 0)
    const proportions = valid.map(stage => maximum > 0 ? stage.value / maximum : 0)
    const rows = valid.map((stage, index) => {
      const previous = valid[index - 1]?.value
      return {
        ...stage, color: stage.color ?? colors[index % colors.length],
        path: funnelPath(proportions, index, direction.value),
        conversion: first > 0 ? stage.value / first * 100 : null,
        step: previous !== undefined && previous > 0 ? stage.value / previous * 100 : null,
        change: previous === undefined ? null : stage.value - previous,
      }
    })
    return { rows, first, last, conversion: first > 0 ? last / first * 100 : null }
  })
  const rows = computed(() => model.value.rows)
  const first = computed(() => model.value.first)
  const last = computed(() => model.value.last)
  const conversion = computed(() => model.value.conversion)
  return { t, formatValue, unit, direction, label, rows, first, last, conversion }
}

export type FunnelModel = ReturnType<typeof useFunnelModel>
const FUNNEL: InjectionKey<FunnelModel> = Symbol('funnel-chart')

export function provideFunnel(model: FunnelModel) { provide(FUNNEL, model) }

/** The state of the enclosing `FunnelChart`; its parts must be rendered inside it. */
export function useFunnelChart() {
  const model = inject(FUNNEL, null)
  if (!model) throw new Error('Funnel chart parts must be inside FunnelChart')
  return model
}
