import { inject, type ComputedRef, type InjectionKey, type ShallowRef, type VNode, Comment, Text } from 'vue'
import type { MotionValue } from 'motion-v'
import type { SelectMessages } from './messages'
import type { ListboxRow } from './use-listbox'

/** Shared state of `Select` (the unfold variant), provided by `<Select>` to its parts. */
export interface SelectContext {
  value: ComputedRef<string | undefined>
  open: ComputedRef<boolean>
  setOpen: (open: boolean) => void
  select: (value: string) => void
  register: (value: string, label: string, disabled: boolean) => void
  unregister: (value: string) => void
  labelFor: (value: string | undefined) => string | undefined
  rows: ComputedRef<ListboxRow[]>
  /** Closes the panel; focus inside it returns to the trigger. */
  close: () => void
  reduce: ComputedRef<boolean>
  progress: MotionValue<number>
  triggerId: string
  listId: string
  disabled: ComputedRef<boolean>
  placement: ShallowRef<'bottom' | 'top'>
  strings: ComputedRef<SelectMessages>
  /** Accessible name for the list; the trigger names it when unset. */
  label: ComputedRef<string | undefined>
}

export const selectKey: InjectionKey<SelectContext> = Symbol('beui-select')
/** The option keyboard focus is on, resolved during render by the content. */
export const selectActiveKey: InjectionKey<ComputedRef<string | undefined>> = Symbol('beui-select-active')

export function useSelectContext(component: string): SelectContext {
  const ctx = inject(selectKey, null)
  if (!ctx) throw new Error(`${component} must be used within <Select>`)
  return ctx
}

/** Shared state of `MorphSelect`, provided by `<MorphSelect>` to its parts. */
export interface MorphSelectContext {
  value: ComputedRef<string | undefined>
  open: ComputedRef<boolean>
  setOpen: (open: boolean) => void
  select: (value: string) => void
  register: (value: string, label: string, disabled: boolean) => void
  unregister: (value: string) => void
  labelFor: (value: string | undefined) => string | undefined
  rows: ComputedRef<ListboxRow[]>
  /** Closes the panel; focus inside it returns to the trigger. */
  close: () => void
  triggerRef: ShallowRef<HTMLElement | null>
  placeholder: ShallowRef<string>
  setPlaceholder: (placeholder: string) => void
  reduce: ComputedRef<boolean>
  layoutId: string
  triggerId: string
  listId: string
  headerId: string
  disabled: ComputedRef<boolean>
  strings: ComputedRef<SelectMessages>
  /** Accessible name for the list; the panel header names it when unset. */
  label: ComputedRef<string | undefined>
}

export const morphSelectKey: InjectionKey<MorphSelectContext> = Symbol('beui-morph-select')
export const morphActiveKey: InjectionKey<ComputedRef<string | undefined>> = Symbol('beui-morph-select-active')
/** True inside the hidden copy that only keeps labels registered while closed. */
export const morphRegistrarKey: InjectionKey<boolean> = Symbol('beui-morph-select-registrar')

export function useMorphSelectContext(component: string): MorphSelectContext {
  const ctx = inject(morphSelectKey, null)
  if (!ctx) throw new Error(`${component} must be used within <MorphSelect>`)
  return ctx
}

/** The item's text when its children are plain text, otherwise `undefined` (the item falls back to its value). */
export function plainText(nodes: VNode[] | undefined): string | undefined {
  if (!nodes) return undefined
  const parts: string[] = []
  for (const node of nodes) {
    if (node.type === Comment) continue
    if (node.type !== Text || typeof node.children !== 'string') return undefined
    parts.push(node.children)
  }
  const text = parts.join('')
  return text === '' ? undefined : text
}
