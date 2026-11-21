import type { InjectionKey } from 'vue'

/** Calendar dates, independent of a browser's timezone: YYYY-MM-DD. */
export interface DateRange {
  from: string
  to?: string
}
export interface DateRangePreset {
  label: string
  value: DateRange
}

/** English defaults. Override per instance with `labels`. */
export const dateRangePickerMessages = {
  label: 'Choose a date range',
  placeholder: 'Select dates',
  triggerLabel: '{label}: {summary}',
  selectEnd: 'Select end',
  startDate: 'Start date',
  endDate: 'End date',
  selectDate: 'Select date',
  chooseMonth: 'Choose month',
  chooseYear: 'Choose year',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  previousYears: 'Previous years',
  nextYears: 'Next years',
  monthChoices: 'Choose a month in {year}',
  yearChoices: 'Choose a year from {start} to {end}',
  help: 'Use arrow keys to navigate dates, Home and End for the week, Page Up and Page Down for months, Shift with Page Up or Page Down for years. Enter or Space selects a date. Use the month and year buttons to jump directly. In the month or year choices, use arrow keys to move and Escape to return.',
  daySelected: '{count} day selected',
  daysSelected: '{count} days selected',
  chooseStartDate: 'Choose a start date',
  chooseEndDate: 'Choose an end date',
  clear: 'Clear',
  clearLabel: 'Clear date range',
  startSelected: 'Start date {date}. Choose an end date.',
  rangeUnavailable: 'This range includes unavailable dates. Choose another end date.',
  rangeSelected: '{from} to {to} selected.',
  cleared: 'Date range cleared.',
  presetSelected: '{name} selected.',
}
export type DateRangePickerMessages = typeof dateRangePickerMessages

export const DAY = 86_400_000
export function parse(date: string) {
  const time = Date.parse(`${date}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== date)
    throw new Error(`Invalid calendar date: ${date}. Use YYYY-MM-DD.`)
  return time
}
export function iso(time: number) {
  return new Date(time).toISOString().slice(0, 10)
}
export function monthOf(date: string) {
  return `${date.slice(0, 7)}-01`
}
export function shiftMonth(date: string, offset: number) {
  const day = new Date(parse(date))
  const month = new Date(parse(monthOf(date)))
  month.setUTCMonth(month.getUTCMonth() + offset)
  const end = new Date(month)
  end.setUTCMonth(end.getUTCMonth() + 1)
  end.setUTCDate(0)
  month.setUTCDate(Math.min(day.getUTCDate(), end.getUTCDate()))
  return iso(month.getTime())
}
export function ordered(a: string, b: string): Required<DateRange> {
  return a <= b ? { from: a, to: b } : { from: b, to: a }
}
export function fill(template: string, values?: Record<string, string | number>) {
  return values ? template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`)) : template
}

export type DrpController = ReturnType<typeof import('./drp-controller').useDrpController>
export const DRP_KEY: InjectionKey<DrpController> = Symbol('beui-date-range-picker')
