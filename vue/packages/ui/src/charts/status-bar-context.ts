import { computed, inject, provide, shallowRef, useId, type InjectionKey } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { interpolate, useHoverCapable, readonlyView } from './plot-utils'

/** English defaults. Override per instance with `labels`. */
export const statusBarMessages = {
  label: 'Status history',
  tableCaption: '{label} data',
  period: 'Period',
  status: 'Status',
  details: 'Details',
  legend: 'Status legend',
  inspect: '{label}: inspect period',
  empty: 'No status data',
  operational: 'Operational',
  degraded: 'Degraded',
  outage: 'Outage',
  maintenance: 'Maintenance',
  unknown: 'No data',
}
export type StatusBarMessages = typeof statusBarMessages
export interface StatusBarDatum {
  /** Stable, unique identity. Keep it when updating a period's status. */
  id: string
  /** Consumer-formatted period, date, or event label. */
  label: string
  /** Must match an ID in statuses. */
  status: string
  description?: string
}
export interface StatusBarStatus {
  id: string
  label: string
  /** Any CSS color, including theme variables. */
  color: string
}
export interface StatusBarTooltipData { datum: StatusBarDatum; status: StatusBarStatus; index: number }
export const STATUS_BAR_STATUSES: readonly StatusBarStatus[] = [
  { id: 'operational', label: 'Operational', color: '#059669' },
  { id: 'degraded', label: 'Degraded', color: '#d97706' },
  { id: 'outage', label: 'Outage', color: '#e11d48' },
  { id: 'maintenance', label: 'Maintenance', color: '#2563eb' },
  { id: 'unknown', label: 'No data', color: 'var(--beui-muted-foreground)' },
]

export interface StatusBarProps {
  /** Observations in display order. The chart never generates or aggregates data. */
  data: readonly StatusBarDatum[]
  /** Override the default status labels and colors, or define your own states. */
  statuses?: readonly StatusBarStatus[]
  label?: string
  activeId?: string | null
  defaultActiveId?: string | null
  /** Override any built-in string, including the default status labels. */
  labels?: Partial<StatusBarMessages>
}

export type StatusBarEmit = {
  (event: 'update:activeId', id: string | null): void
  (event: 'activeChange', id: string | null): void
}

export function useStatusBarModel(props: StatusBarProps, emit: StatusBarEmit) {
  const t = (key: keyof StatusBarMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? statusBarMessages[key], values)
  const label = computed(() => props.label ?? t('label'))
  // Only the built-in states translate; consumer-defined statuses keep their own labels.
  const statuses = computed(() => props.statuses ?? STATUS_BAR_STATUSES.map(status => ({ ...status, label: t(status.id as keyof StatusBarMessages) })))
  const rows = computed(() => {
    const states = new Map<string, StatusBarStatus>()
    for (const status of statuses.value) {
      if (states.has(status.id)) throw new Error(`StatusBar: duplicate status ID "${status.id}".`)
      states.set(status.id, status)
    }
    const ids = new Set<string>()
    return props.data.map(datum => {
      if (ids.has(datum.id)) throw new Error(`StatusBar: duplicate period ID "${datum.id}".`)
      ids.add(datum.id)
      const status = states.get(datum.status)
      if (!status) throw new Error(`StatusBar: define the status "${datum.status}" in statuses.`)
      return { datum, status }
    })
  })

  const internal = shallowRef(props.defaultActiveId ?? null)
  // Resolve stale identities during render so returning periods never revive a cursor.
  const requestedId = computed(() => {
    const id = props.activeId === undefined ? internal.value : props.activeId
    return id !== null && rows.value.some(({ datum }) => datum.id === id) ? id : null
  })
  const activeIndex = computed(() => rows.value.findIndex(({ datum }) => datum.id === requestedId.value))
  const active = computed(() => rows.value[activeIndex.value] ?? null)
  function setActive(id: string | null) {
    if (props.activeId === undefined) internal.value = id
    if (requestedId.value !== id) { emit('update:activeId', id); emit('activeChange', id) }
  }
  const reduce = useReducedMotion()
  const canHover = useHoverCapable()
  const tooltipId = useId()
  /** The plot box the tooltip hangs from; registered by `StatusBarPlot`. */
  const plot = shallowRef<HTMLElement | null>(null)
  const tooltipOpen = shallowRef(false)

  const setPlot = (value: typeof plot.value) => { plot.value = value }
  const setTooltipOpen = (value: typeof tooltipOpen.value) => { tooltipOpen.value = value }
  return { t, label, statuses, rows, activeIndex, active, setActive, reduce, canHover, tooltipId, plot: readonlyView(plot), setPlot, tooltipOpen: readonlyView(tooltipOpen), setTooltipOpen }
}

export type StatusBarModel = ReturnType<typeof useStatusBarModel>
const STATUS_BAR: InjectionKey<StatusBarModel> = Symbol('status-bar')

export function provideStatusBar(model: StatusBarModel) { provide(STATUS_BAR, model) }

/** The state of the enclosing `StatusBar`; its parts must be rendered inside it. */
export function useStatusBar() {
  const model = inject(STATUS_BAR, null)
  if (!model) throw new Error('Status bar parts must be rendered inside StatusBar.')
  return model
}
