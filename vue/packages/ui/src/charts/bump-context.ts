import { computed, inject, onBeforeUnmount, provide, shallowRef, watch, type InjectionKey } from 'vue'
import { animate } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { layoutSpring } from '../core/motion'
import { interpolate, useHoverCapable, readonlyView } from './plot-utils'

/** English defaults. Override per instance with `labels`. */
export const bumpChartMessages = {
  label: 'Rankings over time', empty: 'No rankings yet', plot: '{label} plot, scroll horizontally for more periods',
  description: 'Ranks run from best at the top to lowest at the bottom. Use the legend to highlight or pin a series. Exact values follow in a table.',
  caption: '{label}: exact ranks', series: 'Series', noData: 'No data', highlight: 'Highlight {name}',
  changeUnavailable: 'Change unavailable', unchanged: 'Unchanged', noPrevious: 'No previous rank', noChange: 'No change',
  upOne: 'Up 1 place', up: 'Up {count} places', downOne: 'Down 1 place', down: 'Down {count} places',
  previously: 'Previously #{rank} in {period}', point: '{name}, {period}: rank {rank}',
}
export type BumpChartMessages = typeof bumpChartMessages
export interface BumpChartSeries { id: string; name: string; ranks: readonly (number | null)[]; color?: string }

export interface BumpChartProps {
  series: readonly BumpChartSeries[]
  /** Unique period labels in display order. */
  periods: readonly string[]
  /** Pinned series id. */
  active?: string | null
  defaultActive?: string | null
  label?: string
  /** Override any built-in string. */
  labels?: Partial<BumpChartMessages>
}

export type BumpChartEmit = {
  (event: 'update:active', value: string | null): void
  (event: 'activeChange', value: string | null): void
}

export const BUMP_PLOT = { width: 560, left: 32, right: 100, top: 28, bottom: 36, rowHeight: 44 }
const COLORS = ['#8b5cf6', '#0d9488', '#f59e0b', '#3b82f6', '#f43f5e', '#a3a33a']

export function useBumpChartModel(props: BumpChartProps, emit: BumpChartEmit) {
  const t = (key: keyof BumpChartMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? bumpChartMessages[key], values)
  const label = computed(() => props.label ?? t('label'))
  const reduce = useReducedMotion()
  const canHover = useHoverCapable()

  const internal = shallowRef(props.defaultActive ?? null)
  const hovered = shallowRef<string | null>(null)
  const focused = shallowRef<string | null>(null)

  const rows = computed(() => {
    const seen = new Set<string>()
    return props.series.filter(row => !seen.has(row.id) && !!seen.add(row.id)).map((row, index) => ({
      ...row, color: row.color ?? COLORS[index % COLORS.length],
      ranks: Array.from({ length: props.periods.length }, (_, i) => {
        const rank = row.ranks[i]
        return rank != null && Number.isSafeInteger(rank) && rank > 0 ? rank : null
      }),
    }))
  })
  const rankList = computed(() => [...new Set(rows.value.flatMap(row => row.ranks.filter((rank): rank is number => rank != null)))].sort((a, b) => a - b))
  const maxRank = computed(() => rankList.value.at(-1) ?? 1)
  // Preserve numeric rank distances, including skipped ranks, without unbounded chart height.
  const plotHeight = computed(() => Math.max(1, Math.min(maxRank.value - 1, 8)) * BUMP_PLOT.rowHeight)
  const height = computed(() => BUMP_PLOT.top + plotHeight.value + BUMP_PLOT.bottom)
  const x = (index: number) => props.periods.length <= 1 ? (BUMP_PLOT.left + BUMP_PLOT.width - BUMP_PLOT.right) / 2 : BUMP_PLOT.left + index / (props.periods.length - 1) * (BUMP_PLOT.width - BUMP_PLOT.left - BUMP_PLOT.right)
  const y = (rank: number) => maxRank.value === 1 ? BUMP_PLOT.top + plotHeight.value / 2 : BUMP_PLOT.top + (rank - 1) / (maxRank.value - 1) * plotHeight.value
  const width = computed(() => Math.max(BUMP_PLOT.width, props.periods.length * 64))

  const valid = (id: string | null) => id != null && rows.value.some(row => row.id === id)
  const pinned = computed(() => { const selected = props.active === undefined ? internal.value : props.active; return valid(selected ?? null) ? selected ?? null : null })
  const highlighted = computed(() => valid(hovered.value) ? hovered.value : valid(focused.value) ? focused.value : pinned.value)
  watch(rows, () => {
    if (internal.value !== null && !valid(internal.value)) internal.value = null
    if (hovered.value !== null && !valid(hovered.value)) hovered.value = null
    if (focused.value !== null && !valid(focused.value)) focused.value = null
  })
  function select(id: string | null) {
    if (props.active === undefined) internal.value = id
    emit('update:active', id); emit('activeChange', id)
  }
  function escape() { select(null); focused.value = null; hovered.value = null }

  // The curves, dots and end labels all read the same animated coordinates.
  const pointKey = (series: string, index: number) => JSON.stringify([series, props.periods[index]])
  const targets = computed(() => {
    const map = new Map<string, { x: number; y: number }>()
    for (const row of rows.value) row.ranks.forEach((rank, index) => { if (rank != null) map.set(pointKey(row.id, index), { x: x(index), y: y(rank) }) })
    return map
  })
  const positions = shallowRef(new Map(targets.value))
  let controls: { stop: () => void } | undefined
  watch(targets, next => {
    controls?.stop()
    const from = positions.value
    const start = new Map([...next].map(([key, target]) => [key, from.get(key) ?? target]))
    const settle = () => { positions.value = new Map(next) }
    if (reduce.value) return settle()
    controls = animate(0, 1, {
      ...layoutSpring,
      onUpdate: progress => {
        positions.value = new Map([...next].map(([key, target]) => {
          const origin = start.get(key)!
          return [key, { x: origin.x + (target.x - origin.x) * progress, y: origin.y + (target.y - origin.y) * progress }]
        }))
      },
      onComplete: settle,
    })
  })
  onBeforeUnmount(() => controls?.stop())
  const periods = computed(() => props.periods)

  const setHovered = (value: typeof hovered.value) => { hovered.value = value }
  const setFocused = (value: typeof focused.value) => { focused.value = value }
  return { t, label, periods, reduce, canHover, hovered: readonlyView(hovered), setHovered, focused: readonlyView(focused), setFocused, rows, rankList, maxRank, height, x, y, width, pinned, highlighted, select, escape, pointKey, positions }
}

export type BumpChartModel = ReturnType<typeof useBumpChartModel>
const BUMP: InjectionKey<BumpChartModel> = Symbol('bump-chart')

export function provideBumpChart(model: BumpChartModel) { provide(BUMP, model) }

/** The state of the enclosing `BumpChart`; its parts must be rendered inside it. */
export function useBumpChart() {
  const model = inject(BUMP, null)
  if (!model) throw new Error('Bump chart parts must be rendered inside BumpChart.')
  return model
}
