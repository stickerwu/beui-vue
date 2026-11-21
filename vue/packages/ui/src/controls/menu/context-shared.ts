import { inject, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue'
import type { Point } from './menu-shared'

export type OpenModality = 'pointer' | 'keyboard' | 'touch'

export interface ContextMessages { label: string }
/** English defaults. Override per instance with `labels`. */
export const contextMenuMessages: ContextMessages = { label: 'Context menu' }
export type ContextMenuMessages = typeof contextMenuMessages

export interface ContextRoot {
  open: Readonly<Ref<boolean>>
  setOpen: (open: boolean) => void
  openAt: (point: Point, modality: OpenModality) => void
  point: Readonly<Ref<Point>>
  modality: Readonly<Ref<OpenModality>>
  invocation: Readonly<Ref<number>>
  menuId: string
  triggerEl: ShallowRef<HTMLElement | null>
  contentEl: ShallowRef<HTMLElement | null>
  activeId: Readonly<Ref<string | null>>
  setActiveId: (id: string | null) => void
  reduce: ComputedRef<boolean>
  label: ComputedRef<string>
}
export const contextKey: InjectionKey<ContextRoot> = Symbol('beui-context-menu')

export function useContextRoot(component: string) {
  const context = inject(contextKey, null)
  if (!context) throw new Error(`${component} must be used within <ContextMenu>`)
  return context
}

export const contextRadioKey: InjectionKey<{ value: Readonly<Ref<string>>; select: (value: string) => void }> = Symbol('beui-context-radio')
