import { computed, inject, provide, shallowRef, type InjectionKey } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { interpolate } from './plot-utils'

/** English defaults. Override per instance with `labels`. */
export const candlestickChartMessages = {
  label: 'Candlestick chart',
  candle: 'Candle',
  open: 'O',
  high: 'H',
  low: 'L',
  close: 'C',
  volume: 'Vol',
  valueText: '{label}: open {open}, high {high}, low {low}, close {close}',
}
export type CandlestickChartMessages = typeof candlestickChartMessages
export interface Candle {
  /** Stable id, such as the open timestamp. */
  id: string
  /** Axis and readout label, such as "14:05". */
  label: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface CandlestickChartProps {
  candles: readonly Candle[]
  /** Draws a dashed line and tag at this price, usually the last trade. */
  lastPrice?: number
  /** Controlled crosshair candle, by `id`, so it stays on the same candle as new ones arrive. */
  activeId?: string | null
  defaultActiveId?: string | null
  formatPrice?: (value: number) => string
  formatVolume?: (value: number) => string
  /** Accessible name for the chart. */
  label?: string
  /** Override any built-in string. */
  labels?: Partial<CandlestickChartMessages>
}

export type CandlestickChartEmit = {
  (event: 'update:activeId', id: string | null): void
  (event: 'activeIdChange', id: string | null): void
}

const defaultPrice = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
const defaultVolume = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

export function useCandlestickModel(props: CandlestickChartProps, emit: CandlestickChartEmit) {
  const t = (key: keyof CandlestickChartMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? candlestickChartMessages[key], values)
  const title = computed(() => props.label ?? t('label'))
  const formatPrice = (value: number) => (props.formatPrice ?? defaultPrice)(value)
  const formatVolume = (value: number) => (props.formatVolume ?? defaultVolume)(value)
  const reduce = useReducedMotion()
  const candles = computed(() => props.candles)
  const internal = shallowRef(props.defaultActiveId ?? null)
  // Resolve the crosshair during render by id; a candle that scrolled out of the window clears it rather than landing on a neighbour.
  const active = computed(() => {
    const id = props.activeId === undefined ? internal.value : props.activeId
    const found = id === null ? -1 : candles.value.findIndex(candle => candle.id === id)
    return found >= 0 ? found : null
  })
  function setActive(next: number | null) {
    const id = next === null ? null : candles.value[next]?.id ?? null
    if (props.activeId === undefined) internal.value = id
    emit('update:activeId', id); emit('activeIdChange', id)
  }
  const lastPrice = computed(() => props.lastPrice)
  return { t, title, formatPrice, formatVolume, reduce, candles, active, setActive, lastPrice }
}

export type CandlestickChartModel = ReturnType<typeof useCandlestickModel>
const CANDLESTICK: InjectionKey<CandlestickChartModel> = Symbol('candlestick-chart')

export function provideCandlestickChart(model: CandlestickChartModel) { provide(CANDLESTICK, model) }

/** The state of the enclosing `CandlestickChart`; its parts must be rendered inside it. */
export function useCandlestickChart() {
  const model = inject(CANDLESTICK, null)
  if (!model) throw new Error('CandlestickChart parts must be rendered inside CandlestickChart.')
  return model
}
