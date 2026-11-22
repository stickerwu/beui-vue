import { computed, inject, provide, shallowRef, useId, watch, type InjectionKey } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { cleanSankey, layoutSankey, SANKEY_COLORS, type PlacedLink, type PlacedNode, type SankeyLink, type SankeyNode } from './models/sankey-chart'
import { interpolate, useHoverCapable, readonlyView } from './plot-utils'

/** English defaults. Override per instance with `labels`. */
export const sankeyChartMessages = {
  label: 'Sankey chart', tableCaption: '{label} data', flow: 'Flow', value: 'Value', shareOfSource: 'Share of source', flowRow: '{source} to {target}',
  nodes: '{label} nodes', nodeFlows: 'in {in}, out {out}', tooltipFlows: 'In {in} · Out {out}', from: 'From', to: 'To', more: '{count} more',
  linkShare: '{share} of {source}', noFlows: 'No flows to show', empty: 'No sankey data',
}
export type SankeyChartMessages = typeof sankeyChartMessages
export type { PlacedLink as SankeyPlacedLink, PlacedNode as SankeyPlacedNode, SankeyLink, SankeyNode }
export type SankeyActive = { type: 'node'; node: PlacedNode } | { type: 'link'; link: PlacedLink }

export interface SankeyChartProps {
  nodes: readonly SankeyNode[]
  links: readonly SankeyLink[]
  label?: string
  formatValue?: (value: number) => string
  colors?: readonly string[]
  nodeWidth?: number
  nodePadding?: number
  activeId?: string | null
  defaultActiveId?: string | null
  /** Override any built-in string. */
  labels?: Partial<SankeyChartMessages>
}

export type SankeyChartEmit = {
  (event: 'update:activeId', id: string | null): void
  (event: 'activeChange', id: string | null): void
}

const defaultFormat = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })

export function useSankeyModel(props: SankeyChartProps, emit: SankeyChartEmit) {
  const t = (key: keyof SankeyChartMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? sankeyChartMessages[key], values)
  const title = computed(() => props.label ?? t('label'))
  const formatValue = (value: number) => (props.formatValue ?? defaultFormat)(value)
  const reduce = useReducedMotion()
  const canHover = useHoverCapable()
  const nodeWidth = computed(() => props.nodeWidth ?? 12)
  const nodePadding = computed(() => props.nodePadding ?? 16)
  const data = computed(() => cleanSankey(props.nodes, props.links))
  /** The plot element the layout is measured from and the tooltip hangs from; registered by `SankeyChartPlot`. */
  const plot = shallowRef<HTMLElement | null>(null)
  const size = shallowRef({ width: 640, height: 320 })
  const layout = computed(() => layoutSankey(data.value, { width: size.value.width, height: size.value.height, nodeWidth: nodeWidth.value, nodePadding: nodePadding.value, colors: props.colors ?? SANKEY_COLORS }))
  const nodes = computed(() => layout.value.nodes)
  const links = computed(() => layout.value.links)
  const columns = computed(() => layout.value.columns)
  const step = computed(() => layout.value.step)

  const local = shallowRef(props.defaultActiveId ?? null)
  const cursor = shallowRef<string | null>(null)
  const open = shallowRef(false)
  const requested = computed(() => props.activeId === undefined ? local.value : props.activeId)
  const active = computed<SankeyActive | null>(() => {
    const node = nodes.value.find(item => item.id === requested.value)
    if (node) return { type: 'node', node }
    const link = links.value.find(item => item.id === requested.value)
    return link ? { type: 'link', link } : null
  })
  watch(active, current => { if (props.activeId === undefined && local.value !== null && !current) local.value = null })
  function setActive(id: string | null) {
    if (requested.value === id) return
    if (props.activeId === undefined) local.value = id
    emit('update:activeId', id)
    emit('activeChange', id)
  }
  const hasNodes = computed(() => props.nodes.length > 0)
  const tabStop = computed(() => (nodes.value.find(node => node.id === cursor.value) ?? nodes.value[0])?.id)
  const tooltipId = useId()
  const percent = (value: number) => `${(value * 100).toFixed(1)}%`
  const flows = computed(() => {
    const totals = new Map<string, number>()
    const incoming = new Map<string, number>()
    for (const link of data.value.links) { totals.set(link.source, (totals.get(link.source) ?? 0) + link.value); incoming.set(link.target, (incoming.get(link.target) ?? 0) + link.value) }
    const names = new Map(data.value.nodes.map(node => [node.id, node.label]))
    return data.value.links.map(link => {
      const source = Math.max(totals.get(link.source) ?? 0, incoming.get(link.source) ?? 0)
      return { id: link.id ?? `${link.source}:${link.target}`, source: names.get(link.source) ?? link.source, target: names.get(link.target) ?? link.target, value: link.value, share: source ? link.value / source : 0 }
    })
  })

  const setPlot = (value: typeof plot.value) => { plot.value = value }
  const setSize = (value: typeof size.value) => { size.value = value }
  const setCursor = (value: typeof cursor.value) => { cursor.value = value }
  const setOpen = (value: typeof open.value) => { open.value = value }
  return { t, title, formatValue, reduce, canHover, nodeWidth, data, plot: readonlyView(plot), setPlot, size: readonlyView(size), setSize, nodes, links, columns, step, cursor: readonlyView(cursor), setCursor, open: readonlyView(open), setOpen, active, setActive, tabStop, tooltipId, percent, flows, hasNodes }
}

export type SankeyModel = ReturnType<typeof useSankeyModel>
const SANKEY: InjectionKey<SankeyModel> = Symbol('sankey-chart')

export function provideSankey(model: SankeyModel) { provide(SANKEY, model) }

/** The state of the enclosing `SankeyChart`; its parts must be rendered inside it. */
export function useSankeyChart() {
  const model = inject(SANKEY, null)
  if (!model) throw new Error('Sankey chart parts must be rendered inside SankeyChart.')
  return model
}
