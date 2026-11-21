import { type MotionValue } from 'motion-v'
import { useReducedMotion } from '../../core/reduced-motion'
import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  useId,
  type ComputedRef,
  type InjectionKey,
  type Ref,
  type ShallowRef,
} from 'vue'
import { easeOut } from '../../core/motion'

/**
 * Types, strings, motion tokens and the injection context of the Animated
 * Sidebar. The React original keeps all of this at module scope in one file;
 * the Vue port splits the sheet, the panel and the parts into siblings, so the
 * common half lives here.
 */

export type SidebarState = 'expanded' | 'collapsed'
export type SidebarSide = 'left' | 'right'
export type SidebarVariant = 'sidebar' | 'floating' | 'inset'
export type SidebarCollapsible = 'offcanvas' | 'icon' | 'none'
export type SidebarLinkTarget = '_blank' | '_self' | '_parent' | '_top'

/** A child row of a destination — one level deep, like the original submenu. */
export interface SidebarDestinationChild {
  id: string
  label: string
  href?: string
  target?: SidebarLinkTarget
  rel?: string
  disabled?: boolean
}

/** A row of the built-in menu the zero-config shell renders. */
export interface SidebarDestination {
  id: string
  label: string
  icon?: string
  badge?: string
  href?: string
  target?: SidebarLinkTarget
  rel?: string
  disabled?: boolean
  children?: readonly SidebarDestinationChild[]
}

export const MOBILE_QUERY = '(max-width: 767px)'
export const SIDEBAR_KEYBOARD_SHORTCUT = 'b'

/** English defaults. Override per instance with `labels`. */
export const animatedSidebarMessages = {
  label: 'Sidebar',
  toggle: 'Toggle sidebar',
  close: 'Close sidebar',
}
export type AnimatedSidebarMessages = typeof animatedSidebarMessages

export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  "[tabindex]:not([tabindex='-1'])",
].join(',')

/**
 * `EASE_DRAWER` from the upstream `lib/ease.ts`. The shared token list in
 * `core/motion.ts` carries only `easeOut` and `easeInOut`, so the exact drawer
 * bezier of the pinned original is kept here.
 */
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const

/** Slide shared by the mobile sheet and the offcanvas panel. */
export const PANEL_TRANSITION = { duration: 0.36, ease: EASE_DRAWER } as const

// The desktop rail settles at a hard zero-width boundary. Keep the spring
// critically damped so it cannot overshoot, pause against that boundary, and
// then snap back during the final frame.
export const SIDEBAR_MORPH_TRANSITION = { type: 'spring', stiffness: 380, damping: 35, mass: 0.75 } as const

export const LABEL_ENTER_TRANSITION = { duration: 0.2, delay: 0.08, ease: easeOut } as const
export const LABEL_EXIT_TRANSITION = { duration: 0.12, ease: easeOut } as const
export const SUBMENU_TRANSITION = { duration: 0.18, ease: easeOut } as const

export const SUBMENU_VARIANTS = {
  closed: {
    opacity: 0,
    clipPath: 'inset(0 0 100% 0 round 8px)',
    transition: { duration: 0.14, ease: easeOut, staggerChildren: 0.025, staggerDirection: -1 },
  },
  open: {
    opacity: 1,
    clipPath: 'inset(0 0 0% 0 round 8px)',
    transition: { duration: 0.2, delayChildren: 0.035, ease: easeOut, staggerChildren: 0.045 },
  },
}

export const SUBMENU_ITEM_VARIANTS = {
  closed: { opacity: 0, y: -6, filter: 'blur(3px)' },
  open: { opacity: 1, y: 0, filter: 'blur(0px)', transition: SUBMENU_TRANSITION },
}

/** Reduced-motion stand-in for the drawer slides: opacity only, shorter. */
export const REDUCED_TRANSITION = { duration: 0.16, ease: easeOut } as const

/**
 * Hover pill of the menu (upstream `SharedLayoutBg` at inset 0, one row tall).
 * The track keeps the row height so the pill holds its shape while a submenu
 * expands below it.
 */
export const MENU_PILL_VARIANTS = {
  initial: { opacity: 0, filter: 'blur(6px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: (isActive: boolean) => (!isActive ? { opacity: 0, filter: 'blur(6px)' } : {}),
}
export const MENU_PILL_REDUCED_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: (isActive: boolean) => (!isActive ? { opacity: 0 } : {}),
}

/** Shell variables, so a caller's own inline overrides still win. */
export const SIDEBAR_VARS = {
  '--sidebar-width': '16rem',
  '--sidebar-width-icon': '4.25rem',
  '--sidebar-width-mobile': '18rem',
} as const

/** Joins static class names the way the upstream `cn()` did for literals. */
export function cx(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(' ')
}

export type AnimatedSidebarContext = {
  isMobile: ComputedRef<boolean>
  layoutId: string
  open: ComputedRef<boolean>
  openMobile: ComputedRef<boolean>
  state: ComputedRef<SidebarState>
  reduce: Ref<boolean>
  setOpen: (value: boolean) => void
  setOpenMobile: (value: boolean) => void
  toggleSidebar: () => void
  triggerRef: ShallowRef<HTMLButtonElement | null>
  t: ComputedRef<AnimatedSidebarMessages>
}

export type AnimatedSidebarPanelContext = {
  /** Folded down to the icon rail. The mobile sheet always shows labels. */
  collapsed: ComputedRef<boolean>
  collapsible: ComputedRef<SidebarCollapsible>
  side: ComputedRef<SidebarSide>
}

export type SidebarMenuContext = {
  /** Identity of the row under the pointer or holding focus. */
  activeKey: ShallowRef<string | null>
  hovering: ShallowRef<boolean>
  uid: string
  reduce: Ref<boolean>
  enter: (key: string) => void
  focusKey: (key: string) => void
  /** Rows glide to their new place when the list reflows (a submenu opening above them). */
  register: (entry: { element: () => HTMLElement | null; y: MotionValue<number> }) => () => void
}

export const animatedSidebarKey: InjectionKey<AnimatedSidebarContext> = Symbol('AnimatedSidebar')
export const animatedSidebarPanelKey: InjectionKey<AnimatedSidebarPanelContext> = Symbol('AnimatedSidebarPanel')
export const sidebarMenuKey: InjectionKey<SidebarMenuContext> = Symbol('AnimatedSidebarMenu')

export function useAnimatedSidebar() {
  const context = inject(animatedSidebarKey, null)
  if (!context) throw new Error('Animated Sidebar parts must be used inside AnimatedSidebar.')
  return context
}

export function useAnimatedSidebarPanel() {
  const context = inject(animatedSidebarPanelKey, null)
  if (!context) throw new Error('Animated Sidebar parts must be used inside AnimatedSidebar.')
  return context
}

/** Optional: a menu button also works outside a menu list. */
export function useSidebarMenu() {
  return inject(sidebarMenuKey, null)
}

export type SidebarSessionOptions = {
  open: () => boolean | undefined
  defaultOpen: () => boolean
  openMobile: () => boolean | undefined
  defaultOpenMobile: () => boolean
  onOpenChange: (value: boolean) => void
  onOpenMobileChange: (value: boolean) => void
  /** Ctrl/Cmd+B can be turned off per instance. */
  shortcut: () => boolean
  labels: () => Partial<AnimatedSidebarMessages> | undefined
}

/**
 * Desktop / mobile open state and the Ctrl/Cmd+B shortcut — the state the React
 * provider owns. The breakpoint is resolved by `useMountedMedia` in the caller,
 * because the sheet only mounts below it.
 */
export function useSidebarSession(options: SidebarSessionOptions, isMobile: ComputedRef<boolean>) {
  const reduce = useReducedMotion()
  const internalOpen = shallowRef(options.defaultOpen())
  const internalOpenMobile = shallowRef(options.defaultOpenMobile())
  const open = computed(() => options.open() ?? internalOpen.value)
  const openMobile = computed(() => options.openMobile() ?? internalOpenMobile.value)
  const t = computed<AnimatedSidebarMessages>(() => ({ ...animatedSidebarMessages, ...options.labels() }))
  const triggerRef = shallowRef<HTMLButtonElement | null>(null)
  const layoutId = `${useId()}-active`

  function setOpen(value: boolean) {
    if (options.open() === undefined) internalOpen.value = value
    options.onOpenChange(value)
  }

  function setOpenMobile(value: boolean) {
    if (options.openMobile() === undefined) internalOpenMobile.value = value
    options.onOpenMobileChange(value)
  }

  function toggleSidebar() {
    if (isMobile.value) setOpenMobile(!openMobile.value)
    else setOpen(!open.value)
  }

  function handleShortcut(event: KeyboardEvent) {
    if (!options.shortcut()) return
    if (event.key.toLowerCase() !== SIDEBAR_KEYBOARD_SHORTCUT || !(event.metaKey || event.ctrlKey)) return
    event.preventDefault()
    toggleSidebar()
  }

  onMounted(() => window.addEventListener('keydown', handleShortcut))
  onBeforeUnmount(() => window.removeEventListener('keydown', handleShortcut))

  const context: AnimatedSidebarContext & { openMobileState: ComputedRef<boolean> } = {
    isMobile,
    layoutId,
    open,
    openMobile,
    state: computed<SidebarState>(() => (open.value ? 'expanded' : 'collapsed')),
    reduce,
    setOpen,
    setOpenMobile,
    toggleSidebar,
    triggerRef,
    t,
    openMobileState: openMobile,
  }
  return context
}
