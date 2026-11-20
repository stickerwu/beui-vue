export type RangeStyle = 'standard' | 'inline' | 'fluid' | 'wave' | 'bubble' | 'ruler'

export interface RangeProps {
  variant?: RangeStyle
  modelValue?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  label?: string
  format?: (value: number) => string
  formatValueText?: (value: number) => string
  disabled?: boolean
  bars?: number
  showTicks?: boolean
  majorEvery?: number
  gap?: number
  unit?: string
}

export function snapRange(value: number, min: number, max: number, step: number) {
  if (max <= min) return min
  const steps = Math.floor(Number(((max - min) / step).toFixed(6)))
  const grid = min + step * Math.max(0, Math.min(steps, Math.round((value - min) / step)))
  return Math.abs(max - value) <= Math.abs(grid - value) ? max : Number(grid.toFixed(6))
}
