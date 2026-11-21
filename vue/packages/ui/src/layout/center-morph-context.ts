import { inject, type InjectionKey, type Ref } from 'vue'

/** English defaults. Override per instance with `labels`. */
export const centerMorphModalMessages = { close: 'Close modal', dismiss: 'Dismiss modal' }
export type CenterMorphModalMessages = typeof centerMorphModalMessages

export interface CenterMorphModalContext {
  open: Readonly<Ref<boolean>>
  setOpen: (open: boolean) => void
  triggerId: string
  contentId: string
  /** Name of the dialog given on the root, used when the content has none. */
  label: Readonly<Ref<string | undefined>>
  labels: Readonly<Ref<CenterMorphModalMessages>>
}

export const centerMorphModalKey: InjectionKey<CenterMorphModalContext> = Symbol('CenterMorphModal')

export function useCenterMorphModal(component: string) {
  const context = inject(centerMorphModalKey)
  if (!context) throw new Error(`${component} must be used within <CenterMorphModal>`)
  return context
}
