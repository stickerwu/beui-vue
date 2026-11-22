import { computed, getCurrentInstance, inject, provide, shallowRef, type InjectionKey } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { interpolate } from './plot-utils'

export interface OrderBookLevel { price: number; size: number }
/** A level with its cumulative size, counted from the best price outward. */
export interface OrderBookDepthLevel extends OrderBookLevel { total: number }
export type OrderBookSideName = 'bid' | 'ask'
/** A level identified by its side and price, so it survives snapshot updates. */
export type OrderBookActiveLevel = { side: OrderBookSideName; price: number } | null
export interface OrderBookDepthSummaryData {
  side: OrderBookSideName
  /** Number of levels from the best price out to the inspected one. */
  levels: number
  /** Total base size across those levels. */
  size: number
  /** Total quote value across those levels. */
  quote: number
  /** Size-weighted average fill price. */
  averagePrice: number
}

/** English defaults. Override per instance with `labels`. */
export const orderBookMessages = {
  label: 'Order book', price: 'Price', size: 'Size', total: 'Total', cumulativeTotal: 'Cumulative total',
  asksTable: 'Asks · sell orders', bidsTable: 'Bids · buy orders', noAsks: 'No asks', noBids: 'No bids',
  referencePrice: 'Reference price:', spreadUnavailable: 'Spread unavailable', crossedBook: 'Crossed book',
  spread: 'Spread {spread} · {percent}%', bids: 'Bids', asks: 'Asks', visibleDepth: 'Visible depth',
  depthPlaceholder: 'Hover a level to see the cost of filling up to it', average: 'Avg',
}
export type OrderBookMessages = typeof orderBookMessages

export interface OrderBookProps {
  /** Snapshot of buy levels. Equal prices are combined; invalid and zero sizes are omitted. */
  bids: readonly OrderBookLevel[]
  /** Snapshot of sell levels. Supply new arrays when the book changes. */
  asks: readonly OrderBookLevel[]
  /** Number of nearest levels to show on each side. */
  levels?: number
  /** Last traded price. Omit to show the midpoint of the best bid and ask. */
  lastPrice?: number
  label?: string
  baseSymbol?: string
  quoteSymbol?: string
  formatPrice?: (value: number) => string
  formatSize?: (value: number) => string
  /**
   * The level whose depth is inspected: it and every better level on its side
   * are highlighted, and `OrderBookDepthSummary` totals them. Controlled.
   */
  activeLevel?: OrderBookActiveLevel
  defaultActiveLevel?: OrderBookActiveLevel
  /** Override any built-in string. */
  labels?: Partial<OrderBookMessages>
}

export type OrderBookEmit = {
  (event: 'update:activeLevel', value: OrderBookActiveLevel): void
  (event: 'activeLevelChange', value: OrderBookActiveLevel): void
  (event: 'levelSelect', level: OrderBookDepthLevel, side: OrderBookSideName): void
}

const priceFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const sizeFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

function prepare(levels: readonly OrderBookLevel[], side: OrderBookSideName, limit: number): OrderBookDepthLevel[] {
  const prices = new Map<number, number>()
  for (const { price, size } of levels) {
    if (!Number.isFinite(price) || !Number.isFinite(size) || price <= 0 || size <= 0) continue
    prices.set(price, (prices.get(price) ?? 0) + size)
  }
  let total = 0
  return [...prices].sort(([a], [b]) => side === 'bid' ? b - a : a - b).slice(0, limit).map(([price, size]) => { total += size; return { price, size, total } })
}

export function useOrderBookModel(props: OrderBookProps, emit: OrderBookEmit) {
  const t = (key: keyof OrderBookMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? orderBookMessages[key], values)
  const reduce = useReducedMotion()
  const instance = getCurrentInstance()
  // A price becomes a button only when the app listens for `level-select`.
  const selectable = computed(() => !!instance?.vnode.props?.onLevelSelect)
  const formatPrice = (value: number) => (props.formatPrice ?? ((v: number) => priceFormatter.format(v)))(value)
  const formatSize = (value: number) => (props.formatSize ?? ((v: number) => sizeFormatter.format(v)))(value)
  const baseSymbol = computed(() => props.baseSymbol ?? '')
  const quoteSymbol = computed(() => props.quoteSymbol ?? 'USD')

  const internal = shallowRef<OrderBookActiveLevel>(props.defaultActiveLevel ?? null)
  const book = computed(() => {
    const limit = props.levels != null && Number.isFinite(props.levels) ? Math.max(0, Math.floor(props.levels)) : 9
    const bids = prepare(props.bids, 'bid', limit), asks = prepare(props.asks, 'ask', limit)
    const bidTotal = bids.at(-1)?.total ?? 0, askTotal = asks.at(-1)?.total ?? 0
    const bestBid = bids[0]?.price, bestAsk = asks[0]?.price
    const missing = bestBid == null || bestAsk == null
    return { bids, asks, bidTotal, askTotal, maxTotal: Math.max(bidTotal, askTotal), midpoint: missing ? null : (bestBid + bestAsk) / 2, spread: missing ? null : bestAsk - bestBid }
  })
  const price = computed(() => props.lastPrice != null && Number.isFinite(props.lastPrice) && props.lastPrice > 0 ? props.lastPrice : book.value.midpoint)
  // Resolve the inspected level by price during render; a level that left the book clears the inspection.
  const active = computed(() => {
    const raw = props.activeLevel === undefined ? internal.value : props.activeLevel
    if (!raw) return null
    const index = (raw.side === 'bid' ? book.value.bids : book.value.asks).findIndex(level => level.price === raw.price)
    return index >= 0 ? { side: raw.side, index } : null
  })
  const summary = computed<OrderBookDepthSummaryData | null>(() => {
    if (!active.value) return null
    const levels = (active.value.side === 'bid' ? book.value.bids : book.value.asks).slice(0, active.value.index + 1)
    const size = levels.reduce((sum, level) => sum + level.size, 0)
    const quote = levels.reduce((sum, level) => sum + level.size * level.price, 0)
    return { side: active.value.side, levels: levels.length, size, quote, averagePrice: size ? quote / size : 0 }
  })
  function setActive(level: OrderBookActiveLevel) {
    if (props.activeLevel === undefined) internal.value = level
    emit('update:activeLevel', level); emit('activeLevelChange', level)
  }
  function selectLevel(level: OrderBookDepthLevel, side: OrderBookSideName) { emit('levelSelect', level, side) }
  const label = computed(() => props.label ?? t('label'))
  return { t, label, reduce, selectable, formatPrice, formatSize, baseSymbol, quoteSymbol, book, price, active, summary, setActive, selectLevel }
}

export type OrderBookModel = ReturnType<typeof useOrderBookModel>
const KEY: InjectionKey<OrderBookModel> = Symbol('order-book')

export function provideOrderBook(model: OrderBookModel) { provide(KEY, model) }

/** The state of the enclosing `OrderBook`; its parts must be rendered inside it. */
export function useOrderBook() {
  const model = inject(KEY, null)
  if (!model) throw new Error('Order book parts must be rendered inside OrderBook.')
  return model
}
