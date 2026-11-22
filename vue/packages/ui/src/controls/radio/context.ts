import { inject, type ComputedRef, type InjectionKey, type ShallowRef } from 'vue'

export interface RadioContext {
  value: ComputedRef<string>
  setValue: (value: string) => void
  /** Shared by every selected dot so the dot glides between options. */
  layoutId: string
  /** Disables every option; a Vue-only convenience on the group. */
  disabled: ComputedRef<boolean>
  /**
   * The one option Tab reaches: the selected option, or the first enabled one
   * when nothing enabled is selected. `null` until the options have
   * registered, when every enabled option stays reachable.
   */
  tabStop: ComputedRef<string | null>
  /** Registered options and whether each is disabled, in registration order. */
  options: ShallowRef<ReadonlyMap<string, boolean>>
  register: (value: string, disabled: boolean) => void
  unregister: (value: string) => void
}

export const radioKey: InjectionKey<RadioContext> = Symbol('RadioGroup')

export function useRadioGroup() {
  const context = inject(radioKey, null)
  if (!context) throw new Error('RadioGroupItem must be used inside <RadioGroup>')
  return context
}
