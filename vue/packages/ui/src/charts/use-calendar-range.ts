import { computed, shallowRef, watchEffect, type ComputedRef, type Ref } from 'vue'

export interface CalendarRange<Cell> { start: Cell; end?: Cell }

export function useCalendarRange<Cell>(options: {
  selection: () => CalendarRange<Cell> | null | undefined
  initial?: CalendarRange<Cell> | null
  index: (cell: Cell) => number
  track?: (cell: Cell) => boolean
  valid: (cell: Cell) => boolean
  emit: (range: CalendarRange<Cell> | null) => void
}): {
  selection: ComputedRef<CalendarRange<Cell> | null>
  hover: Ref<Cell | null>
  tip: ComputedRef<Cell | undefined | null>
  range: ComputedRef<{ low: number; high: number; track: boolean } | null>
  select: (cell: Cell) => void
  clear: () => void
} {
  const local = shallowRef<CalendarRange<Cell> | null>(options.initial ?? null)
  const hover = shallowRef<Cell | null>(null)
  const raw = computed(() => options.selection() === undefined ? local.value : options.selection())
  const track = options.track ?? (() => false)
  const selection = computed(() => {
    const value = raw.value
    if (!value || !options.valid(value.start)) return null
    if (value.end && (!options.valid(value.end) || track(value.start) !== track(value.end))) return null
    return value
  })
  watchEffect(() => { if (!selection.value && options.selection() === undefined) local.value = null })
  const tip = computed(() => selection.value?.end ?? (hover.value && options.valid(hover.value) ? hover.value : selection.value?.start))
  const range = computed(() => {
    const current = selection.value
    if (!current) return null
    const start = options.index(current.start)
    const end = tip.value && track(tip.value) === track(current.start) ? options.index(tip.value) : start
    return { low: Math.min(start, end), high: Math.max(start, end), track: track(current.start) }
  })
  function set(next: CalendarRange<Cell> | null) {
    if (options.selection() === undefined) local.value = next
    options.emit(next)
  }
  function select(cell: Cell) {
    const current = selection.value
    if (!current || track(current.start) !== track(cell)) set({ start: cell })
    else if (current.end || options.index(current.start) === options.index(cell)) set(null)
    else set({ start: current.start, end: cell })
  }
  return { selection, hover, tip, range, select, clear: () => set(null) }
}
