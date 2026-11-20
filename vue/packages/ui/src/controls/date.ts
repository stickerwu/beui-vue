export interface DateRange { from: string; to?: string }
export interface DatePreset { label: string; value: DateRange }
export function iso(date: Date) { return date.toISOString().slice(0, 10) }
export function dateValue(value: string) { return new Date(`${value}T00:00:00Z`) }
export function dayOffset(value: string, amount: number) {
  const date = dateValue(value)
  date.setUTCDate(date.getUTCDate() + amount)
  return iso(date)
}
export function monthOffset(value: string, amount: number) {
  const date = dateValue(value)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + amount)
  const end = new Date(date)
  end.setUTCMonth(end.getUTCMonth() + 1, 0)
  date.setUTCDate(Math.min(day, end.getUTCDate()))
  return iso(date)
}
