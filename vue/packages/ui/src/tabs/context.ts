import { inject, type ComputedRef, type InjectionKey, type ShallowRef } from 'vue'
import type { MotionValue } from 'motion-v'

/** English defaults. Override per instance with `labels`. */
export const tabsMessages = {
  scrollLeft: 'Scroll tabs left',
  scrollRight: 'Scroll tabs right',
}
export type TabsMessages = typeof tabsMessages

export type TabsVariant = 'pill' | 'underline' | 'segment'
/** Whether trigger icons show on every tab or only on the selected one. */
export type TabsIconDisplay = 'always' | 'selected'

/** What a trigger tells the list about itself. */
export interface TabRegistration {
  disabled: boolean
  indicatorClassName?: string
}

export type TabsTrack = Record<'x' | 'y' | 'width' | 'height', MotionValue<number>>

export interface TabsContext {
  value: ComputedRef<string>
  /** Shared by the underline indicator of every tab so it glides between them. */
  layoutId: string
  setValue: (value: string) => void
  variant: ComputedRef<TabsVariant>
  icons: ComputedRef<TabsIconDisplay>
  reduce: ComputedRef<boolean>
  /** The pill's box in the list: one spring per edge, shared by every tab. */
  track: TabsTrack
  /** Whether the pill has been measured; until then CSS places it. */
  placed: ShallowRef<boolean>
  /**
   * The one tab Tab reaches: the selected tab, or the first enabled one when
   * nothing enabled is selected. `null` until the triggers have registered,
   * when every enabled tab stays reachable.
   */
  tabStop: ComputedRef<string | null>
  /** Registered triggers, in registration order. */
  tabs: ShallowRef<ReadonlyMap<string, TabRegistration>>
  registerTab: (value: string, registration: TabRegistration) => void
  unregisterTab: (value: string) => void
  /** Values with a mounted panel, so triggers only point at panels that exist. */
  panels: ShallowRef<ReadonlySet<string>>
  registerPanel: (value: string) => void
  unregisterPanel: (value: string) => void
  tabId: (value: string) => string
  panelId: (value: string) => string
  t: ComputedRef<TabsMessages & { list?: string }>
}

export const tabsKey: InjectionKey<TabsContext> = Symbol('Tabs')

export function useTabs(component = 'Tabs.*') {
  const context = inject(tabsKey, null)
  if (!context) throw new Error(`${component} must be used inside <Tabs>`)
  return context
}

/** Space between a selected-only icon and its label, in pixels. */
export const ICON_GAP = 6

// Settle without overshoot: a scrollable tab list would turn even a small
// overshoot into a transient scrollbar and layout shift.
export const TABS_SPRING = { type: 'spring', stiffness: 245, damping: 36, mass: 1.2 } as const
