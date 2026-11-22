import { inject, type ComputedRef, type InjectionKey, type ShallowRef } from 'vue'
import type { LiquidBox } from '../liquid'

/** English defaults. Override per instance with `labels`. */
export const adaptiveStepperMessages = {
  label: 'Quantity',
  summary: '{label}. Current value: {value}',
  decrease: 'Decrease value',
  increase: 'Increase value',
}
export type AdaptiveStepperMessages = typeof adaptiveStepperMessages

export type StepDirection = -1 | 0 | 1

/** What `AdaptiveStepper` shares with its decrement, value and increment parts. */
export interface AdaptiveStepperContext {
  value: ComputedRef<number>
  valueText: ComputedRef<string>
  direction: ShallowRef<StepDirection>
  atMin: ComputedRef<boolean>
  atMax: ComputedRef<boolean>
  disabled: ComputedRef<boolean>
  reduce: ComputedRef<boolean>
  t: ComputedRef<AdaptiveStepperMessages>
  decrement: (restoreFocus: boolean) => void
  increment: (restoreFocus: boolean) => void
  decrementButton: ShallowRef<HTMLButtonElement | null>
  incrementButton: ShallowRef<HTMLButtonElement | null>
  /** The goo silhouette: every part reports the box it is currently drawn at. */
  blobs: Record<string, LiquidBox>
}

export const adaptiveStepperKey: InjectionKey<AdaptiveStepperContext> = Symbol('AdaptiveStepper')

export function useAdaptiveStepperContext(component: string) {
  const context = inject(adaptiveStepperKey, null)
  if (!context) throw new Error(`${component} must be used within <AdaptiveStepper>`)
  return context
}

// The deliberately elastic separation curve from the liquid email reference.
export const STEPPER_LIQUID_TRANSITION = { duration: 600, ease: [0.22, 1.3, 0.71, 1] } as const
