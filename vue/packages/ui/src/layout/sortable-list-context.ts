import { inject, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue'

/** English defaults. Override per instance with `labels`. */
export const sortableListMessages = {
  label: 'Sortable items',
  instructions:
    'Drag a handle to reorder. With a handle focused, use Up and Down to move, Home and End to move to the edges. Space lifts a row and drops it again, and Escape cancels the lift.',
  moved: '{item} moved to position {position} of {total}.',
  restored: 'Previous order restored.',
  reorder: 'Reorder {item}',
  undo: 'Undo reorder',
}
export type SortableListMessages = typeof sortableListMessages

export type SortableMoveDirection = -1 | 1 | 'first' | 'last'

export interface SortableListContext {
  ids: ComputedRef<string[]>
  labels: ComputedRef<Map<string, string>>
  label: ComputedRef<string>
  disabled: ComputedRef<boolean>
  instructionsId: string
  itemClassName: ComputedRef<string | undefined>
  t: ComputedRef<SortableListMessages>
  fill: (template: string, values: Record<string, string | number>) => string
  canUndo: ComputedRef<boolean>
  /** Row lifted from the keyboard, or null. */
  lifted: ShallowRef<string | null>
  reorder: (ids: string[]) => void
  move: (id: string, direction: SortableMoveDirection) => void
  undo: () => void
  lift: (id: string) => void
  cancelLift: () => void
  beginDrag: () => void
  finishDrag: (id: string) => void
  focusHandle: (id: string) => void
}

export interface SortableItemContext {
  id: string
  label: ComputedRef<string>
  controls: { start: (event: PointerEvent) => void }
  dragging: Ref<boolean>
}

export const sortableListKey: InjectionKey<SortableListContext> = Symbol('beui-sortable-list')
export const sortableItemKey: InjectionKey<SortableItemContext> = Symbol('beui-sortable-item')

export function useSortableListContext(part: string) {
  const context = inject(sortableListKey, null)
  if (!context) throw new Error(`${part} must be used within SortableList.`)
  return context
}

/** Shared ordering and undo actions for custom list controls. */
export function useSortableList() {
  const context = useSortableListContext('useSortableList')
  return {
    ids: context.ids,
    disabled: context.disabled,
    canUndo: context.canUndo,
    moveItem: context.move,
    undo: context.undo,
  }
}
