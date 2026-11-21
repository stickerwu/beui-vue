import { inject, onBeforeUnmount, onMounted, shallowRef, watch, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue'

// Shared machinery for DropdownMenu and ContextMenu: placement math, the
// root/level/sub contexts and the dismissal listeners. Ports of the helpers in
// `components/motion/dropdown-menu.tsx` and `popover-position.ts`.

export const VIEWPORT_PADDING = 8
/** The panel's border and padding, so a submenu's first row lines up with the row that opened it. */
export const SUB_ALIGN_OFFSET = 5
/** How far a submenu stacked under its row sits in, so it reads as nested. */
export const SUB_STACK_INDENT = 16
/** Long enough to skip the submenus a pointer crosses on its way somewhere else. */
export const SUB_OPEN_DELAY = 100
/** How long a pointer heading for an open submenu may cross sibling rows. */
export const SUB_GRACE = 300
export const TYPEAHEAD_RESET = 500

export type Side = 'top' | 'bottom' | 'left' | 'right'
export type Align = 'start' | 'center' | 'end'
export type FocusTarget = 'first' | 'last' | 'panel' | 'none'
export type Point = { x: number; y: number }
export type Rect = { left: number; top: number; width: number; height: number }

export interface Placement {
  left: number
  top: number
  side: Side
  origin: string
  /** The room on the chosen side; a taller menu scrolls inside it. */
  maxHeight: number
}

export interface RootContext {
  open: Readonly<Ref<boolean>>
  setOpen: (open: boolean, focus?: FocusTarget) => void
  focusTarget: Readonly<Ref<FocusTarget>>
  menuId: string
  triggerId: string
  triggerEl: ShallowRef<HTMLElement | null>
  reduce: ComputedRef<boolean>
  mounted: Readonly<Ref<boolean>>
}
export const rootKey: InjectionKey<RootContext> = Symbol('beui-menu-root')

/** One open panel: the root menu or a submenu. */
export interface LevelContext {
  levelId: string
  present: Readonly<Ref<boolean>>
  panelEl: ShallowRef<HTMLElement | null>
  activeId: Readonly<Ref<string | null>>
  setActiveId: (id: string | null) => void
  openSub: Readonly<Ref<string | null>>
  setOpenSub: (id: string | null, focus?: FocusTarget) => void
  subFocus: Readonly<Ref<FocusTarget>>
  /** A pointer on its way from a submenu trigger to the submenu it opened. */
  grace: { current: { polygon: Point[]; until: number } | null }
}
export const levelKey: InjectionKey<LevelContext> = Symbol('beui-menu-level')

export interface SubContext {
  id: string
  contentId: string
  open: ComputedRef<boolean>
  focus: Readonly<Ref<FocusTarget>>
  triggerEl: ShallowRef<HTMLElement | null>
  panelEl: ShallowRef<HTMLElement | null>
  setOpen: (open: boolean, focus?: FocusTarget) => void
}
export const subKey: InjectionKey<SubContext> = Symbol('beui-menu-sub')

export interface RadioContext { value: Readonly<Ref<string>>; select: (value: string) => void }
export const radioKey: InjectionKey<RadioContext> = Symbol('beui-menu-radio')

export function useRoot(component: string) {
  const context = inject(rootKey, null)
  if (!context) throw new Error(`${component} must be used within <DropdownMenu>`)
  return context
}
export function useLevel(component: string) {
  const context = inject(levelKey, null)
  if (!context) throw new Error(`${component} must be used within <DropdownMenuContent>`)
  return context
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

export function enabledItems(panel: HTMLElement | null) {
  if (!panel) return []
  return Array.from(panel.querySelectorAll<HTMLElement>(`[data-menu-item][data-level="${panel.dataset.level}"]:not([data-disabled])`))
}

export function insidePolygon(point: Point, polygon: Point[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!
    const b = polygon[j]!
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

function placeVertical(trigger: Rect, size: { width: number; height: number }, side: 'top' | 'bottom', align: Align, offset: number): Placement {
  const viewWidth = document.documentElement.clientWidth
  const viewHeight = window.innerHeight
  const below = trigger.top + trigger.height + offset
  const roomBelow = viewHeight - VIEWPORT_PADDING - below
  const roomAbove = trigger.top - offset - VIEWPORT_PADDING
  // The preferred side when the menu fits there, otherwise the roomier one.
  const used = side === 'bottom'
    ? (size.height <= roomBelow || roomBelow >= roomAbove ? 'bottom' : 'top')
    : (size.height <= roomAbove || roomAbove >= roomBelow ? 'top' : 'bottom')
  const maxHeight = Math.max(used === 'bottom' ? roomBelow : roomAbove, 0)
  const height = Math.min(size.height, maxHeight)
  const start = align === 'start' ? trigger.left : align === 'end' ? trigger.left + trigger.width - size.width : trigger.left + trigger.width / 2 - size.width / 2
  const x = clamp(start, VIEWPORT_PADDING, viewWidth - size.width - VIEWPORT_PADDING)
  const y = used === 'bottom' ? below : trigger.top - offset - height
  // Grow from the aligned edge, so that edge holds still while the panel scales in.
  const anchorX = align === 'start' ? trigger.left : align === 'end' ? trigger.left + trigger.width : trigger.left + trigger.width / 2
  const originX = clamp(anchorX - x, 0, size.width)
  return { left: x, top: y, side: used, origin: `${originX}px ${used === 'bottom' ? 0 : height}px`, maxHeight }
}

export function place(trigger: Rect, size: { width: number; height: number }, side: Side, align: Align, offset: number): Placement {
  if (side === 'top' || side === 'bottom') return placeVertical(trigger, size, side, align, offset)
  const viewWidth = document.documentElement.clientWidth
  const viewHeight = window.innerHeight
  const right = trigger.left + trigger.width + offset
  const left = trigger.left - size.width - offset
  const fitsRight = right + size.width <= viewWidth - VIEWPORT_PADDING
  const fitsLeft = left >= VIEWPORT_PADDING
  // A narrow screen has room on neither side: drop below the row instead of covering it.
  if (!fitsRight && !fitsLeft) {
    return placeVertical({ ...trigger, left: trigger.left + SUB_STACK_INDENT, width: trigger.width - SUB_STACK_INDENT }, size, 'bottom', 'start', 2)
  }
  const used: Side = side === 'right' ? (fitsRight ? 'right' : 'left') : fitsLeft ? 'left' : 'right'
  const maxHeight = viewHeight - VIEWPORT_PADDING * 2
  const height = Math.min(size.height, maxHeight)
  const x = used === 'right' ? right : left
  const y = clamp(trigger.top - SUB_ALIGN_OFFSET, VIEWPORT_PADDING, viewHeight - height - VIEWPORT_PADDING)
  const originY = clamp(trigger.top + trigger.height / 2 - y, 0, height)
  return { left: x, top: y, side: used, origin: `${used === 'right' ? 0 : size.width}px ${originY}px`, maxHeight }
}

export interface PortalLayout { trigger: Rect; content: { width: number; height: number } }

/** Measures a trigger and a portalled panel in viewport coordinates (`usePopoverPortalPosition`). */
export function useMenuLayout(anchor: () => HTMLElement | null, panelEl: ShallowRef<HTMLElement | null>) {
  const layout = shallowRef<PortalLayout | null>(null)
  function update() {
    const trigger = anchor()
    const content = panelEl.value
    if (!trigger || !content) return
    const rect = trigger.getBoundingClientRect()
    const next: PortalLayout = {
      trigger: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      content: { width: content.offsetWidth, height: content.offsetHeight },
    }
    const a = layout.value
    if (a && a.trigger.left === next.trigger.left && a.trigger.top === next.trigger.top && a.trigger.width === next.trigger.width && a.trigger.height === next.trigger.height
      && a.content.width === next.content.width && a.content.height === next.content.height) return
    layout.value = next
  }
  let observer: ResizeObserver | undefined
  onMounted(() => {
    update()
    observer = new ResizeObserver(update)
    const trigger = anchor()
    if (trigger) observer.observe(trigger)
    if (panelEl.value) observer.observe(panelEl.value)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
  })
  onBeforeUnmount(() => {
    observer?.disconnect()
    window.removeEventListener('scroll', update, true)
    window.removeEventListener('resize', update)
  })
  return { layout, update }
}

/** Escape or a pointerdown outside closes the menu (`useDismiss`, pass-through). `ignore` returns true for targets that count as inside. */
export function useMenuDismiss(open: Readonly<Ref<boolean>>, onDismiss: () => void, ignore: (target: Element) => boolean) {
  watch(open, (isOpen, _prev, cleanup) => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onDismiss() }
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (!target || ignore(target)) return
      onDismiss()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer, true)
    cleanup(() => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer, true)
    })
  }, { immediate: true })
}

