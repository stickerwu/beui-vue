import { computed, inject, shallowRef, type ComputedRef, type InjectionKey, type ShallowRef } from 'vue'

export const layoutSpring = { type: 'spring', stiffness: 360, damping: 32, mass: 0.6 } as const
export type AlertVariant = 'default' | 'info' | 'success' | 'warning' | 'destructive'
export type AlertMessages = { dismiss: string }
export const alertMessages = { dismiss: 'Dismiss alert' } satisfies AlertMessages
export type CardVariant = 'outlined' | 'muted'
export type CardSize = 'default' | 'compact'

export function useOpenState(controlled: () => boolean | undefined, initial: boolean, changed: (value: boolean) => void, disabled = () => false) {
  const local = shallowRef(initial)
  const open = computed(() => controlled() ?? local.value)
  function setOpen(next: boolean) {
    if (disabled() || next === open.value) return
    if (controlled() === undefined) local.value = next
    changed(next)
  }
  return { open, setOpen }
}

export const aspectKey: InjectionKey<{ ratio: ComputedRef<number>, animated: ComputedRef<boolean> }> = Symbol('AspectRatio')
export const alertKey: InjectionKey<{
  open: ComputedRef<boolean>, variant: ComputedRef<AlertVariant>, dismissLabel: ComputedRef<string>,
  /** False from the commit that starts the exit; gates interaction and a11y. */
  isPresent: ShallowRef<boolean>,
  /** Static id on the animated surface, so the exit can find the retained node. */
  surfaceId: string,
  setOpen: (next: boolean) => void, dismiss: () => void
}> = Symbol('Alert')
export const collapsibleKey: InjectionKey<{
  open: ComputedRef<boolean>, disabled: ComputedRef<boolean>, triggerId: string, contentId: string,
  setOpen: (next: boolean) => void, toggle: () => void
}> = Symbol('Collapsible')

function inside<Value>(key: InjectionKey<Value>, parent: string) {
  const context = inject(key)
  if (!context) throw new Error(`This component must be used inside <${parent}>`)
  return context
}

export const useAspectRatio = () => inside(aspectKey, 'AspectRatio')
export const useAlert = () => inside(alertKey, 'Alert')
export const useCollapsible = () => inside(collapsibleKey, 'Collapsible')
