import { onBeforeUnmount, onMounted, shallowRef, watch, type InjectionKey, type Ref } from 'vue'

/** Elements that can usually take keyboard focus (mirrors `lib/focusable.ts`). */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  "input:not(:disabled):not([type='hidden'])",
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  "[tabindex]:not([tabindex='-1'])",
].join(',')

/** A pointer that is resting on the surface rather than pressing it (mirrors `isHoveringPointer`). */
export const isHoveringPointer = (event: { pointerType: string; buttons: number }) => event.pointerType !== 'touch' && event.buttons === 0

interface BoundaryEvent { pointerId: number; pointerType: string; buttons: number }

/**
 * Pairs a surface's enter with its leave, per pointer (mirrors `useHoverGesture`).
 * A pointer that arrived in contact — a pen tap — never took the hover, and a
 * mouse dragged off while pressed still releases the state it took.
 */
export function createHoverGesture() {
  const contact = new Set<number>()
  return {
    enter(event: BoundaryEvent) {
      if (isHoveringPointer(event)) { contact.delete(event.pointerId); return true }
      contact.add(event.pointerId)
      return false
    },
    leave(event: BoundaryEvent) {
      const arrivedInContact = contact.delete(event.pointerId)
      return !arrivedInContact && event.pointerType !== 'touch'
    },
  }
}

/**
 * The pointer gesture behind a click (mirrors `useTapGesture`). A click carries
 * no pointerType, so the pointerdown before it records which input started the
 * gesture and what the surface was showing then.
 */
export function createTapGesture<S>() {
  let record: { pointerType: string; state: S } | null = null
  return {
    start(event: { pointerType: string }, state: S) { record = { pointerType: event.pointerType, state } },
    take() { const spent = record; record = null; return spent },
    drop() { record = null },
  }
}

/**
 * Close an open overlay on Escape or a pointerdown outside (mirrors
 * `useDismiss`, pass-through behaviour). The pointer listener is capture-phase
 * so a handler in between that stops propagation cannot blind it.
 */
export function useDismiss(open: Ref<boolean>, onDismiss: () => void, inside: (target: Element) => boolean) {
  let stop: (() => void) | undefined
  const release = () => { stop?.(); stop = undefined }
  watch(open, value => {
    release()
    if (!value) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onDismiss() }
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target || inside(target)) return
      onDismiss()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer, true)
    stop = () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer, true)
    }
  }, { immediate: true, flush: 'post' })
  onBeforeUnmount(release)
}

export interface PortalLayout {
  trigger: { left: number; top: number; width: number; height: number }
  content: { width: number; height: number }
}

/** Measures a trigger and a portalled panel in viewport coordinates (mirrors `usePopoverPortalPosition`). */
export function usePortalPosition(trigger: Ref<HTMLElement | null>, content: Ref<HTMLElement | null>, active: Ref<boolean>) {
  const layout = shallowRef<PortalLayout | null>(null)
  function update() {
    const t = trigger.value
    const c = content.value
    if (!t || !c) return
    const rect = t.getBoundingClientRect()
    const next: PortalLayout = {
      trigger: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      content: { width: c.offsetWidth, height: c.offsetHeight },
    }
    const a = layout.value
    if (a && a.trigger.left === next.trigger.left && a.trigger.top === next.trigger.top && a.trigger.width === next.trigger.width
      && a.trigger.height === next.trigger.height && a.content.width === next.content.width && a.content.height === next.content.height) return
    layout.value = next
  }
  let stop: (() => void) | undefined
  const release = () => { stop?.(); stop = undefined }
  watch([trigger, content, active], () => {
    release()
    update()
    if (!active.value) return
    const observer = new ResizeObserver(update)
    if (trigger.value) observer.observe(trigger.value)
    if (content.value) observer.observe(content.value)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    stop = () => {
      observer.disconnect()
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, { immediate: true, flush: 'post' })
  onMounted(update)
  onBeforeUnmount(release)
  return { layout, update }
}

/** The element a trigger slot renders: its first element child, found after each render. */
export function firstElement(host: HTMLElement | null | undefined): HTMLElement | null {
  const el = host?.firstElementChild
  return el instanceof HTMLElement ? el : null
}

/** Resolve a component instance or element template ref to its DOM element. */
export function elementOf(ref: unknown): HTMLElement | null {
  if (ref instanceof HTMLElement) return ref
  const $el = (ref as { $el?: unknown } | null)?.$el
  return $el instanceof HTMLElement ? $el : null
}

/** What `PopoverContent` registers with its `Popover` when the popover is composed from parts. */
export interface PopoverPart {
  attrs: Record<string, unknown>
  slots: { default?: (props: { close: () => void }) => unknown }
}
export interface PopoverParts {
  register: (part: PopoverPart) => void
  unregister: (part: PopoverPart) => void
}
export const POPOVER_PARTS_KEY: InjectionKey<PopoverParts> = Symbol('beui-popover-parts')

/** What `MorphPopoverContent` registers with its `PopoverMorph` when the popover is composed from parts. */
export interface MorphPart {
  props: { side?: 'top' | 'bottom'; align?: 'start' | 'end'; sideOffset?: number; radius?: number; shadow?: boolean; initialFocus?: HTMLElement | null | (() => HTMLElement | null); onOpenAutoFocus?: (content: HTMLElement) => void }
  attrs: Record<string, unknown>
  slots: { default?: (props: { close: () => void }) => unknown }
}
export interface MorphParts {
  register: (part: MorphPart) => void
  unregister: (part: MorphPart) => void
}
export const MORPH_PARTS_KEY: InjectionKey<MorphParts> = Symbol('beui-morph-popover-parts')
