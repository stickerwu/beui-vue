import { computed, inject, provide, shallowRef, useId, watchEffect, type InjectionKey } from 'vue'
import { buildTreemap, layoutTreemap, TREEMAP_COLORS, type TreemapNode } from './models/treemap'
import { interpolate, useHoverCapable, readonlyView } from './plot-utils'

/** English defaults. Override per instance with `labels`. */
export const treemapMessages = {
  label: 'Treemap', tableCaption: '{label} data', item: 'Item', value: 'Value', share: 'Share of total', details: 'Details',
  legend: 'Treemap legend', tiles: 'Treemap tiles', ofTotal: '{share}% of total', noPositive: 'No positive values', empty: 'No treemap data',
}
export type TreemapMessages = typeof treemapMessages

export interface TreemapProps {
  /** Flat leaves or nested groups. Tile area uses leaf values; groups sum their descendants. */
  data: readonly TreemapNode[]
  label?: string
  formatValue?: (value: number) => string
  /** Top-level palette; nodes can override their inherited color and textColor. */
  colors?: readonly string[]
  textColor?: string
  activeId?: string | null
  defaultActiveId?: string | null
  /** Override any built-in string. */
  labels?: Partial<TreemapMessages>
}

export type TreemapEmit = {
  (event: 'update:activeId', id: string | null): void
  (event: 'activeChange', id: string | null): void
}

const defaultFormat = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })

export function useTreemapModel(props: TreemapProps, emit: TreemapEmit) {
  const t = (key: keyof TreemapMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? treemapMessages[key], values)
  const label = computed(() => props.label ?? t('label'))
  const formatValue = (value: number) => (props.formatValue ?? defaultFormat)(value)
  const model = computed(() => buildTreemap(props.data, props.colors ?? TREEMAP_COLORS, props.textColor ?? '#ffffff'))
  const size = shallowRef({ width: 1000, height: 625 })
  const tiles = computed(() => layoutTreemap(model.value.nodes, size.value.width, size.value.height))
  const canHover = useHoverCapable()
  const tooltipId = useId()
  const plot = shallowRef<HTMLElement | null>(null)

  const local = shallowRef(props.defaultActiveId ?? null)
  const cursor = shallowRef<string | null>(null)
  const tooltipOpen = shallowRef(false)
  const requested = computed(() => props.activeId === undefined ? local.value : props.activeId)
  const active = computed(() => tiles.value.find(tile => tile.id === requested.value) ?? null)
  const tabstop = computed(() => (tiles.value.find(tile => tile.id === cursor.value) ?? tiles.value[0])?.id)
  watchEffect(() => { if (local.value !== null && !tiles.value.some(tile => tile.id === local.value)) local.value = null })

  function setActive(id: string | null) {
    if (requested.value === id) return
    if (props.activeId === undefined) local.value = id
    emit('update:activeId', id)
    emit('activeChange', id)
  }

  const setSize = (value: typeof size.value) => { size.value = value }
  const setPlot = (value: typeof plot.value) => { plot.value = value }
  const setCursor = (value: typeof cursor.value) => { cursor.value = value }
  const setTooltipOpen = (value: typeof tooltipOpen.value) => { tooltipOpen.value = value }
  return { t, label, formatValue, model, size: readonlyView(size), setSize, tiles, canHover, tooltipId, plot: readonlyView(plot), setPlot, cursor: readonlyView(cursor), setCursor, tooltipOpen: readonlyView(tooltipOpen), setTooltipOpen, active, tabstop, setActive }
}

export type TreemapModel = ReturnType<typeof useTreemapModel>
const TREEMAP: InjectionKey<TreemapModel> = Symbol('treemap')

export function provideTreemap(model: TreemapModel) { provide(TREEMAP, model) }

/** The state of the enclosing `Treemap`; its parts must be rendered inside it. */
export function useTreemap() {
  const model = inject(TREEMAP, null)
  if (!model) throw new Error('Treemap parts must be rendered inside Treemap.')
  return model
}
