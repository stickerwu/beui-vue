import { computed, getCurrentInstance, inject, provide, shallowRef, type InjectionKey } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { interpolate, useHoverCapable } from './plot-utils'

/** English defaults. Override per instance with `labels`. */
export const donutChartMessages = {
  label: 'Donut chart',
  total: 'Total',
}
export type DonutChartMessages = typeof donutChartMessages

export interface DonutSegment {
  id: string
  name: string
  /** Any CSS color, such as "#2563eb" or "var(--chart-1)". */
  color: string
  /** Nonnegative value. Zero and invalid values are left out of the ring. */
  value: number
}
export type DonutPlacedSegment = DonutSegment & {
  /** Share of the total, from 0 to 1. */
  share: number
  /** Centerline arc path in the 200 × 200 viewBox. */
  path: string
}

export interface DonutChartProps {
  segments: readonly DonutSegment[]
  /** Ring thickness in viewBox units; the chart is 200 wide. */
  thickness?: number
  /** Degrees of empty space between neighbouring segments. */
  gap?: number
  /** Focused segment, shared by the ring, center, and legend. */
  activeId?: string | null
  defaultActiveId?: string | null
  /** Marks a legend item as pressed. */
  selectedId?: string | null
  formatValue?: (value: number) => string
  /** Accessible name for the chart. */
  label?: string
  /** Override any built-in string. */
  labels?: Partial<DonutChartMessages>
}

export type DonutChartEmit = {
  (event: 'update:activeId', id: string | null): void
  (event: 'activeChange', id: string | null): void
  (event: 'select', id: string): void
}

export const DONUT_SIZE = 200
const CENTER = DONUT_SIZE / 2
const defaultFormat = (value: number) => value.toLocaleString('en-US')

const point = (r: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180
  return [CENTER + r * Math.sin(radians), CENTER - r * Math.cos(radians)]
}

export function useDonutModel(props: DonutChartProps, emit: DonutChartEmit) {
  const t = (key: keyof DonutChartMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? donutChartMessages[key], values)
  const reduce = useReducedMotion()
  const canHover = useHoverCapable()
  const formatValue = (value: number) => (props.formatValue ?? defaultFormat)(value)
  const label = computed(() => props.label ?? t('label'))
  const thickness = computed(() => props.thickness ?? 22)
  const gap = computed(() => props.gap ?? 3)
  const radius = computed(() => 100 - thickness.value / 2 - 8)
  /** Clockwise from 12 o'clock as round-capped arcs, each shortened by the gap plus its own cap. */
  const built = computed(() => {
    const valid = props.segments.filter(segment => Number.isFinite(segment.value) && segment.value > 0)
    const total = valid.reduce((sum, segment) => sum + segment.value, 0)
    const r = radius.value
    const capDegrees = ((thickness.value / 2) / r) * (180 / Math.PI)
    const single = valid.length === 1
    let cursor = 0
    const placed: DonutPlacedSegment[] = valid.map(segment => {
      const share = total ? segment.value / total : 0
      const sweep = share * 360
      const inset = single ? 0 : gap.value / 2 + capDegrees
      const start = cursor + inset
      const end = Math.max(start + 0.01, cursor + sweep - inset)
      cursor += sweep
      let path: string
      if (single) {
        const [x1, y1] = point(r, 0)
        const [x2, y2] = point(r, 180)
        path = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2} A ${r} ${r} 0 1 1 ${x1} ${y1}`
      } else {
        const [x1, y1] = point(r, start)
        const [x2, y2] = point(r, end)
        path = `M ${x1} ${y1} A ${r} ${r} 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2}`
      }
      return { ...segment, share, path }
    })
    return { placed, total }
  })
  const placed = computed(() => built.value.placed)
  const total = computed(() => built.value.total)

  const internal = shallowRef(props.defaultActiveId ?? null)
  const raw = computed(() => props.activeId === undefined ? internal.value : props.activeId)
  // Resolve during render by id; a segment that left the data clears focus.
  const active = computed(() => raw.value !== null && placed.value.some(segment => segment.id === raw.value) ? raw.value : null)
  function setActive(id: string | null) {
    if (props.activeId === undefined) internal.value = id
    emit('update:activeId', id)
    emit('activeChange', id)
  }
  // Pressed state is only meaningful when someone listens for `select`, as with upstream's optional `onSelect`.
  const instance = getCurrentInstance()
  const selectable = () => Boolean(instance?.vnode.props?.onSelect)
  const selectedId = computed(() => props.selectedId ?? null)
  const select = (id: string) => emit('select', id)
  return { t, reduce, canHover, formatValue, label, thickness, radius, placed, total, active, setActive, selectable, selectedId, select }
}

export type DonutModel = ReturnType<typeof useDonutModel>
const DONUT: InjectionKey<DonutModel> = Symbol('donut-chart')

export function provideDonutChart(model: DonutModel) { provide(DONUT, model) }

/** The state of the enclosing `DonutChart`; its parts must be rendered inside it. */
export function useDonutChart() {
  const model = inject(DONUT, null)
  if (!model) throw new Error('Donut chart parts must be rendered inside DonutChart.')
  return model
}
