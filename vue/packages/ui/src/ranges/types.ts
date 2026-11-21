export type RangeStyle = 'standard' | 'inline' | 'fluid' | 'wave' | 'bubble' | 'ruler'

export interface RangeProps {
  variant?: RangeStyle
  modelValue?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  label?: string
  /** Accessible name. Falls back to `label`, then "Value". */
  ariaLabel?: string
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

/** Props every slider design shares. Each design also takes its own extras. */
export interface SliderBaseProps {
  modelValue?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  /** Accessible name. Falls back to `label`, then "Value". */
  ariaLabel?: string
  /** Visible text on designs that draw one; also the accessible name fallback. */
  label?: string
  /** Announced instead of the raw number (a unit, a suffix). */
  formatValueText?: (value: number) => string
}

/** `SPRING_GLIDE`: dragged handles and fills follow the pointer without rebounding off an end. */
export const glideSpringConfig = { stiffness: 700, damping: 50, mass: 0.5 } as const
