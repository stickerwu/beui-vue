import { arc } from 'motion-v'
import { inject, type ComputedRef, type InjectionKey } from 'vue'

// The selection ring hops to the next swatch over a low arc instead of
// sliding. arc() bends with distance (apex at half of strength x distance):
// ~6px to a neighbour, under 40px across a row of eight. Automatic direction
// puts a horizontal bulge below the row; a negative strength mirrors it above
// in both directions of travel.
const layoutSpring = { type: 'spring', stiffness: 360, damping: 32, mass: 0.6 } as const
export const SELECTION_HOP = { ...layoutSpring, layout: { ...layoutSpring, path: arc({ strength: -0.2 }) } } as never

export interface ColorSelectorContext {
  value: ComputedRef<string>
  select: (value: string) => void
  name: ComputedRef<string>
  disabled: ComputedRef<boolean>
  required: ComputedRef<boolean>
  form: ComputedRef<string | undefined>
}

export const colorSelectorKey: InjectionKey<ColorSelectorContext> = Symbol('ColorSelector')

export function useColorSelector() {
  const context = inject(colorSelectorKey)
  if (!context) throw new Error('ColorSelectorItem must be used within ColorSelector')
  return context
}
