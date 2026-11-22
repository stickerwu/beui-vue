import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, nextTick, shallowRef, useId, watch } from 'vue'
import {
  DAY, dateRangePickerMessages, fill, iso, monthOf, ordered, parse, shiftMonth,
  type DateRange, type DateRangePickerMessages, type DateRangePreset,
} from './drp-core'

export interface DrpProps {
  defaultValue?: DateRange | null
  defaultMonth?: string
  min?: string
  max?: string
  isDateDisabled?: (date: string) => boolean
  presets?: readonly DateRangePreset[]
  locale?: string
  label?: string
  disabled?: boolean
  autoFocus?: boolean
  showSummary?: boolean
  closeOnSelect?: boolean
  defaultOpen?: boolean
  labels?: Partial<DateRangePickerMessages>
}

type View = 'days' | 'months' | 'years'

/**
 * Range state for the picker, a port of `useDateRangePickerController`. Everything the React
 * version re-derives each render is a `computed` here; the effects that run after a render are
 * `afterRender` callbacks flushed with `nextTick`.
 */
export function useDrpController(
  props: DrpProps,
  controlledValue: () => DateRange | null | undefined,
  controlledOpen: () => boolean | undefined,
  emitValue: (value: DateRange | null) => void,
  emitOpen: (open: boolean) => void,
) {
  const strings = computed(() => ({ ...dateRangePickerMessages, ...props.labels }))
  const t = (key: keyof DateRangePickerMessages, values?: Record<string, string | number>) => fill(strings.value[key], values)
  const locale = computed(() => props.locale ?? 'en-US')
  const label = computed(() => props.label ?? t('label'))
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const internalValue = shallowRef<DateRange | null>(props.defaultValue ?? null)
  const value = computed(() => {
    const controlled = controlledValue()
    return controlled === undefined ? internalValue.value : controlled
  })
  const internalOpen = shallowRef(props.defaultOpen ?? false)
  const open = computed(() => controlledOpen() ?? internalOpen.value)

  const trigger = shallowRef<HTMLElement | null>(null)
  const content = shallowRef<HTMLElement | null>(null)
  const setOpen = (next: boolean) => {
    if (controlledOpen() === undefined) internalOpen.value = next
    emitOpen(next)
    if (!next && content.value?.contains(document.activeElement)) trigger.value?.focus({ preventScroll: true })
  }
  watch(open, isOpen => {
    if (!isOpen && content.value?.contains(document.activeElement)) trigger.value?.focus({ preventScroll: true })
  }, { flush: 'sync' })

  if (props.min) parse(props.min)
  if (props.max) parse(props.max)
  if (props.min && props.max && props.min > props.max) throw new Error('DateRangePicker min must not exceed max.')
  if (props.defaultMonth) parse(props.defaultMonth)
  const checkRange = (range: DateRange | null | undefined) => {
    if (!range) return
    parse(range.from)
    if (range.to) {
      parse(range.to)
      if (range.to < range.from) throw new Error('DateRangePicker range must be ordered.')
    }
  }
  checkRange(value.value)

  const initial = (() => {
    const { min, max } = props
    return props.defaultMonth ?? value.value?.from ?? (min && today < min ? min : max && today > max ? max : today)
  })()
  const requestedMonth = shallowRef(monthOf(initial))
  const month = computed(() => {
    const { min, max } = props
    const requested = requestedMonth.value
    return min && requested < monthOf(min) ? monthOf(min) : max && requested > monthOf(max) ? monthOf(max) : requested
  })
  const setMonth = (next: string) => { requestedMonth.value = next }
  const cursor = shallowRef<string | null>(value.value?.from ?? initial)
  const preview = shallowRef<string | null>(null)
  const direction = shallowRef(1)
  const announcement = shallowRef('')
  const view = shallowRef<View>('days')
  const requestedYearPage = shallowRef(Math.floor(Number(initial.slice(0, 4)) / 12) * 12)
  const focusChoices = shallowRef(false)
  const monthTrigger = shallowRef<HTMLElement | null>(null)
  const yearTrigger = shallowRef<HTMLElement | null>(null)
  let returnToTrigger: 'months' | 'years' | null = null
  let pendingFocus = Boolean(props.autoFocus)
  const root = shallowRef<HTMLElement | null>(null)
  const heading = useId()
  const help = useId()
  const choicesId = useId()
  const reduceMotion = useReducedMotion()
  const reduce = computed(() => Boolean(reduceMotion.value))

  const canHover = shallowRef(false)
  let hoverQuery: MediaQueryList | undefined
  const updateHover = () => { canHover.value = Boolean(hoverQuery?.matches) }
  onMounted(() => {
    hoverQuery = window.matchMedia?.('(hover: hover) and (pointer: fine)')
    updateHover()
    hoverQuery?.addEventListener?.('change', updateHover)
  })
  onBeforeUnmount(() => hoverQuery?.removeEventListener?.('change', updateHover))

  const formats = computed(() => ({
    month: new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    monthName: new Intl.DateTimeFormat(locale.value, { month: 'long', timeZone: 'UTC' }),
    date: new Intl.DateTimeFormat(locale.value, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
    short: new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
    shortNoYear: new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric', timeZone: 'UTC' }),
  }))
  const unavailable = (date: string) =>
    Boolean(props.disabled) || Boolean(props.min && date < props.min) || Boolean(props.max && date > props.max) || Boolean(props.isDateDisabled?.(date))
  const rangeAvailable = (range: DateRange) => {
    const first = parse(range.from)
    const last = parse(range.to ?? range.from)
    if (last < first || unavailable(range.from) || unavailable(range.to ?? range.from)) return false
    // Only scan interiors when the consumer supplies unavailable dates.
    if (props.isDateDisabled) for (let time = first + DAY; time < last; time += DAY) if (unavailable(iso(time))) return false
    return true
  }

  const dates = computed(() => {
    const last = new Date(parse(month.value))
    last.setUTCMonth(last.getUTCMonth() + 1)
    last.setUTCDate(0)
    return Array.from({ length: last.getUTCDate() }, (_, index) => iso(parse(month.value) + index * DAY))
  })
  const active = computed(() => {
    const current = cursor.value
    return current && dates.value.includes(current) && !unavailable(current) ? current : (dates.value.find(date => !unavailable(date)) ?? null)
  })
  watch(active, next => { if (cursor.value !== null && cursor.value !== next) cursor.value = next }, { flush: 'sync' })
  const shownRange = computed(() => {
    const range = value.value
    return range && !range.to && preview.value && rangeAvailable(ordered(range.from, preview.value)) ? ordered(range.from, preview.value) : range
  })

  const weeks = computed(() => {
    const leading = new Date(parse(month.value)).getUTCDay()
    const cells: (string | null)[] = [...Array<string | null>(leading).fill(null), ...dates.value]
    // Six rows keep the surface stable while changing months or browsing years.
    while (cells.length < 42) cells.push(null)
    return Array.from({ length: cells.length / 7 }, (_, index) => ({
      start: iso(parse(month.value) + (index * 7 - leading) * DAY),
      dates: cells.slice(index * 7, index * 7 + 7),
    }))
  })
  const year = computed(() => Number(month.value.slice(0, 4)))
  const monthIndex = computed(() => Number(month.value.slice(5, 7)) - 1)
  const minYear = computed(() => (props.min ? Number(props.min.slice(0, 4)) : 0))
  const maxYear = computed(() => (props.max ? Number(props.max.slice(0, 4)) : 9999))
  const firstYearPage = computed(() => minYear.value)
  // Backfill the final page so it still has twelve years when the bounds allow it.
  const lastYearPage = computed(() => Math.max(minYear.value, maxYear.value - 11))
  const yearPage = computed(() => Math.min(lastYearPage.value, Math.max(firstYearPage.value, requestedYearPage.value)))
  const yearPageEnd = computed(() => Math.min(yearPage.value + 11, maxYear.value))
  const previousDisabled = computed(() =>
    Boolean(props.disabled) ||
    (view.value === 'years'
      ? yearPage.value <= firstYearPage.value
      : view.value === 'months'
        ? year.value <= minYear.value
        : (year.value === 0 && monthIndex.value === 0) || Boolean(props.min && monthOf(shiftMonth(month.value, -1)) < monthOf(props.min))))
  const nextDisabled = computed(() =>
    Boolean(props.disabled) ||
    (view.value === 'years'
      ? yearPage.value >= lastYearPage.value
      : view.value === 'months'
        ? year.value >= maxYear.value
        : (year.value === 9999 && monthIndex.value === 11) || Boolean(props.max && monthOf(shiftMonth(month.value, 1)) > monthOf(props.max))))
  const dayCount = computed(() => (value.value?.to ? Math.round((parse(value.value.to) - parse(value.value.from)) / DAY) + 1 : null))
  const choices = computed(() =>
    view.value === 'months'
      ? Array.from({ length: 12 }, (_, index) => {
          const date = `${String(year.value).padStart(4, '0')}-${String(index + 1).padStart(2, '0')}-01`
          return {
            id: date,
            label: formats.value.monthName.format(parse(date)),
            disabled: Boolean(props.disabled) || Boolean(props.min && date < monthOf(props.min)) || Boolean(props.max && date > monthOf(props.max)),
          }
        })
      : Array.from({ length: Math.max(0, yearPageEnd.value - yearPage.value + 1) }, (_, index) => {
          const choiceYear = yearPage.value + index
          return { id: String(choiceYear), label: String(choiceYear), disabled: Boolean(props.disabled) || choiceYear < minYear.value || choiceYear > maxYear.value }
        }))

  // The effects the React version runs after every render: hand focus back to a month/year
  // trigger, or onto the active date once the new month is on screen.
  const gridElement = () => {
    const scope = content.value ?? root.value
    const grids = Array.from(scope?.querySelectorAll<HTMLElement>('[role="grid"]') ?? [])
    return grids.find(element => !element.closest('[inert]')) ?? null
  }
  function afterRender() {
    if (returnToTrigger) {
      const target = returnToTrigger
      returnToTrigger = null
      ;(target === 'months' ? monthTrigger : yearTrigger).value?.focus({ preventScroll: true })
    }
    if (!pendingFocus) return
    pendingFocus = false
    const grid = gridElement()
    const button = grid?.querySelector<HTMLButtonElement>('button[tabindex="0"]')
    ;(button ?? grid)?.focus({ preventScroll: true })
  }
  const settle = () => { void nextTick(afterRender) }
  onMounted(() => { if (pendingFocus) settle() })

  const change = (next: DateRange | null) => {
    if (props.disabled || (next && !rangeAvailable(next))) return
    if (controlledValue() === undefined) internalValue.value = next
    emitValue(next)
    preview.value = null
    if (next?.to && open.value && props.closeOnSelect) setOpen(false)
  }
  const select = (date: string) => {
    if (unavailable(date)) return
    cursor.value = date
    const range = value.value
    if (!range || range.to) {
      change({ from: date })
      announcement.value = t('startSelected', { date: formats.value.date.format(parse(date)) })
    } else {
      const next = ordered(range.from, date)
      if (!rangeAvailable(next)) {
        announcement.value = t('rangeUnavailable')
        return
      }
      change(next)
      announcement.value = t('rangeSelected', { from: formats.value.short.format(parse(next.from)), to: formats.value.short.format(parse(next.to)) })
    }
  }
  const navigate = (offset: number, focus = false, target = active.value ?? month.value) => {
    const next = shiftMonth(target, offset)
    if ((props.min && monthOf(next) < monthOf(props.min)) || (props.max && monthOf(next) > monthOf(props.max))) return
    direction.value = offset > 0 ? 1 : -1
    setMonth(monthOf(next))
    cursor.value = next
    preview.value = null
    pendingFocus = focus
    if (focus) settle()
  }
  const onKey = (event: KeyboardEvent, date: string) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      navigate((event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1), true, date)
      return
    }
    const base = active.value ?? date
    const weekday = new Date(parse(base)).getUTCDay()
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday }
    const offset = offsets[event.key]
    if (offset === undefined) return
    event.preventDefault()
    let next = iso(parse(base) + offset * DAY)
    // Arrow navigation skips unavailable dates; Home/End stay within their week.
    if (event.key !== 'Home' && event.key !== 'End') {
      const step = offset < 0 ? -1 : 1
      for (let attempts = 0; unavailable(next) && attempts < 366; attempts++) {
        if ((props.min && next < props.min) || (props.max && next > props.max)) return
        next = iso(parse(next) + step * DAY)
      }
    }
    if (unavailable(next)) return
    const nextMonth = monthOf(next)
    direction.value = nextMonth >= month.value ? 1 : -1
    pendingFocus = true
    setMonth(nextMonth)
    cursor.value = next
    preview.value = value.value && !value.value.to ? next : null
    settle()
  }
  const closeChoices = () => {
    returnToTrigger = view.value === 'years' ? 'years' : 'months'
    view.value = 'days'
    settle()
  }
  const openChoices = (next: 'months' | 'years') => {
    if (props.disabled) return
    if (view.value === next) { closeChoices(); return }
    preview.value = null
    focusChoices.value = true
    if (next === 'years') requestedYearPage.value = Math.min(lastYearPage.value, Math.max(firstYearPage.value, minYear.value + Math.floor((year.value - minYear.value) / 12) * 12))
    view.value = next
  }
  const goToMonth = (next: string) => {
    if (props.disabled) return
    const clamped = props.min && next < monthOf(props.min) ? monthOf(props.min) : props.max && next > monthOf(props.max) ? monthOf(props.max) : next
    direction.value = clamped >= month.value ? 1 : -1
    setMonth(clamped)
    cursor.value = clamped
    preview.value = null
    closeChoices()
  }
  const page = (step: -1 | 1) => {
    focusChoices.value = false
    if (view.value === 'years') {
      direction.value = step
      const next = Math.min(lastYearPage.value, Math.max(firstYearPage.value, yearPage.value + step * 12))
      if (next === firstYearPage.value || next === lastYearPage.value) returnToTrigger = 'years'
      requestedYearPage.value = next
      settle()
    } else if (view.value === 'months') {
      const next = shiftMonth(month.value, step * 12)
      const clamped = props.min && next < monthOf(props.min) ? monthOf(props.min) : props.max && next > monthOf(props.max) ? monthOf(props.max) : monthOf(next)
      direction.value = step
      setMonth(clamped)
      cursor.value = clamped
      if (Number(clamped.slice(0, 4)) === minYear.value || Number(clamped.slice(0, 4)) === maxYear.value) returnToTrigger = 'months'
      settle()
    } else {
      const next = monthOf(shiftMonth(active.value ?? month.value, step))
      if (next === (props.min && monthOf(props.min)) || next === (props.max && monthOf(props.max))) returnToTrigger = 'months'
      navigate(step)
      settle()
    }
  }
  const clear = () => {
    if (props.disabled) return
    if (view.value === 'days') pendingFocus = true
    else returnToTrigger = view.value
    change(null)
    announcement.value = t('cleared')
    settle()
  }
  const selectPreset = (range: DateRange, name: string) => {
    if (!rangeAvailable(range)) return
    if (view.value !== 'days') closeChoices()
    change(range)
    direction.value = range.from >= month.value ? 1 : -1
    setMonth(monthOf(range.from))
    cursor.value = range.from
    announcement.value = t('presetSelected', { name })
  }
  // A reopened popover starts a fresh calendar session, retaining its range.
  watch(open, isOpen => {
    if (!isOpen) return
    setMonth(monthOf(initial))
    cursor.value = value.value?.from ?? initial
    preview.value = null
    view.value = 'days'
    focusChoices.value = false
    announcement.value = ''
  })

  const uid = useId()
  const triggerId = `${uid}-trigger`
  const contentId = `${uid}-content`
  return {
    triggerId, contentId,
    value, change, open, setOpen, trigger, content, root, label, locale, t, today, canHover, reduce,
    disabled: computed(() => Boolean(props.disabled)), showSummary: computed(() => props.showSummary ?? true), presets: computed(() => props.presets ?? []),
    autoFocus: computed(() => Boolean(props.autoFocus)),
    month, view, heading, help, choicesId, monthTrigger, yearTrigger, formats, year, yearPage, yearPageEnd,
    previousDisabled, nextDisabled, openChoices, page, direction, choices, focusChoices, closeChoices, goToMonth,
    active, weeks, shownRange, unavailable, preview, select, cursor, onKey, dayCount, clear, rangeAvailable, selectPreset, announcement,
    gridElement,
  }
}
