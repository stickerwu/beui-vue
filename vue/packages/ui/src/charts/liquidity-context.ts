import { computed, inject, provide, type InjectionKey } from 'vue'
import { buildLiquidityHeatmap, type LiquiditySnapshot } from './models/liquidity-heatmap'
import { interpolate } from './plot-utils'

/** English defaults. Override per instance with `labels`. */
export const liquidityHeatmapMessages = {
  label: 'Liquidity heatmap', unit: 'units', empty: 'No liquidity data', table: 'Liquidity by price and time', cell: '{time}, {price}: {size} {unit}',
  cellEmpty: '{time}, {price}: No data', noData: 'No data', market: 'Market {price}', legend: 'Resting liquidity · {unit}',
}
export type LiquidityHeatmapMessages = typeof liquidityHeatmapMessages
export type { LiquiditySnapshot }
export const LIQUIDITY_HEAT = ['#17233b', '#254f80', '#217c90', '#27af98', '#97d56b', '#f4df76']

export interface LiquidityHeatmapProps {
  /** Time-ordered snapshots; use consistent price buckets and stable IDs. */
  snapshots: readonly LiquiditySnapshot[]
  /** Fixed intensity ceiling keeps colors comparable across live updates. */
  maxSize?: number
  unit?: string
  label?: string
  formatPrice?: (price: number) => string
  formatSize?: (size: number) => string
  /** Override any built-in string. */
  labels?: Partial<LiquidityHeatmapMessages>
}

const defaultPrice = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
const defaultSize = (value: number) => value.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })

export function useLiquidityHeatmapModel(props: LiquidityHeatmapProps) {
  const t = (key: keyof LiquidityHeatmapMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? liquidityHeatmapMessages[key], values)
  const label = computed(() => props.label ?? t('label'))
  const formatPrice = (price: number) => (props.formatPrice ?? defaultPrice)(price)
  const formatSize = (size: number) => (props.formatSize ?? defaultSize)(size)
  const model = computed(() => buildLiquidityHeatmap(props.snapshots))
  const columns = computed(() => model.value.columns)
  const prices = computed(() => model.value.prices)
  const ceiling = computed(() => props.maxSize !== undefined && Number.isFinite(props.maxSize) && props.maxSize > 0 ? props.maxSize : model.value.maximum)
  const unit = computed(() => props.unit ?? t('unit'))
  return { t, label, formatPrice, formatSize, columns, prices, ceiling, unit }
}

export type LiquidityHeatmapModel = ReturnType<typeof useLiquidityHeatmapModel>
const LIQUIDITY: InjectionKey<LiquidityHeatmapModel> = Symbol('liquidity-heatmap')

export function provideLiquidityHeatmap(model: LiquidityHeatmapModel) { provide(LIQUIDITY, model) }

/** The state of the enclosing `LiquidityHeatmap`; its parts must be rendered inside it. */
export function useLiquidityHeatmap() {
  const model = inject(LIQUIDITY, null)
  if (!model) throw new Error('Liquidity heatmap parts must be inside LiquidityHeatmap')
  return model
}
