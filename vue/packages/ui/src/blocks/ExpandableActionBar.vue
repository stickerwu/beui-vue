<script lang="ts">
export type ExpandableActionBarSize = 'sm' | 'md'

export type BlockAction = {
  id: string
  label: string
  icon?: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  badge?: string
  shortcut?: string
  ariaLabel?: string
  title?: string
}

export type ExpandableActionBarClassNames = {
  root?: string
  track?: string
  item?: string
  activeItem?: string
  icon?: string
  label?: string
  badge?: string
  shortcut?: string
}
</script>

<script setup lang="ts">
import { LayoutGroup, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, shallowRef, watchEffect } from 'vue'

const props = withDefaults(defineProps<{
  items: readonly BlockAction[]
  expanded?: boolean
  defaultExpanded?: boolean
  activeId?: string
  /**
   * Expand when a hovering pointer rests on the bar. It also governs the touch
   * equivalent: with no hover to reveal the labels, the first tap expands the
   * bar and runs no action, and the second one acts. Set false to make every
   * tap and click act immediately.
   */
  expandOnHover?: boolean
  expandOnFocus?: boolean
  collapseDelay?: number
  /** Default `md`. */
  size?: ExpandableActionBarSize
  className?: string
  classNames?: ExpandableActionBarClassNames
}>(), {
  // `undefined`, not `false`: a boolean prop that is absent is cast to `false`
  // by Vue, which would read as a controlled bar that is always collapsed.
  expanded: undefined,
  defaultExpanded: false,
  expandOnHover: true,
  expandOnFocus: true,
  collapseDelay: 90,
  size: 'md',
})

const emit = defineEmits<{
  'update:expanded': [value: boolean]
  expandedChange: [value: boolean]
  action: [item: BlockAction]
}>()

const reduce = useReducedMotion()

// A pointer session on an action button, recorded where the click cannot report
// it: which input started the gesture, and whether the bar was already open.
type TapRecord = { pointerType: string; state: boolean }
let tapRecord: TapRecord | null = null
const tapStart = (event: PointerEvent, state: boolean) => { tapRecord = { pointerType: event.pointerType, state } }
const tapTake = () => { const spent = tapRecord; tapRecord = null; return spent }
const tapDrop = () => { tapRecord = null }

const localExpanded = shallowRef(props.defaultExpanded)
const isExpanded = computed(() => (props.expanded !== undefined ? props.expanded : localExpanded.value))
function setIsExpanded(next: boolean) {
  if (props.expanded === undefined) localExpanded.value = next
  emit('update:expanded', next)
  emit('expandedChange', next)
}

const hoveredId = shallowRef<string | null>(null)
// Set by the tap that expands the bar, and the reason the outside-tap dismisser
// exists at all — a hovering pointer has its own way out.
const tapExpanded = shallowRef(false)
let collapseTimer: number | null = null

function clearCollapseTimer() {
  if (collapseTimer !== null) window.clearTimeout(collapseTimer)
  collapseTimer = null
}

function open() {
  clearCollapseTimer()
  setIsExpanded(true)
}

function close() {
  clearCollapseTimer()
  collapseTimer = window.setTimeout(() => {
    setIsExpanded(false)
    hoveredId.value = null
    tapExpanded.value = false
  }, props.collapseDelay)
}

// Enter and leave are paired per pointer: a pen that arrives in contact taps
// rather than hovers, and a mouse that pressed and dragged off still leaves.
const hoverContact = new Set<number>()
function hoverEnter(event: PointerEvent) {
  const hovering = event.pointerType !== 'touch' && event.buttons === 0
  if (hovering) hoverContact.delete(event.pointerId)
  else hoverContact.add(event.pointerId)
  return hovering
}
function hoverLeave(event: PointerEvent) {
  const arrivedInContact = hoverContact.delete(event.pointerId)
  return !arrivedInContact && event.pointerType !== 'touch'
}

function onRootPointerEnter(event: PointerEvent) {
  // The gesture is told about every enter, `expandOnHover` or not: it is what
  // the matching leave is read against.
  if (hoverEnter(event) && props.expandOnHover) open()
}

function onRootPointerLeave(event: PointerEvent) {
  if (!hoverLeave(event)) return
  hoveredId.value = null
  if (props.expandOnHover) close()
}

function onRootFocus() {
  if (props.expandOnFocus) open()
}

function onRootBlur(event: FocusEvent) {
  const next = event.relatedTarget
  if (next instanceof Node && (event.currentTarget as HTMLElement | null)?.contains(next)) return
  if (props.expandOnFocus) close()
}

function onItemEnter(item: BlockAction, event: PointerEvent) {
  if (!hoverEnter(event)) return
  clearCollapseTimer()
  hoveredId.value = item.id
}

function onItemDown(event: PointerEvent) {
  tapStart(event, isExpanded.value)
}

function onItemClick(item: BlockAction, event: MouseEvent) {
  ;(event.currentTarget as HTMLElement | null)?.blur()
  const gesture = tapTake()
  // Nothing reveals the labels to a finger, so the first tap expands the bar and
  // the next one runs the action. The bar state is read from the gesture's
  // start: a browser that focuses the button on contact expands it mid-tap, and
  // that first tap would otherwise fire the action it was meant to reveal.
  // `tapExpanded` arms the second tap, so a controlled bar that declines to
  // expand still runs the action rather than swallowing every tap.
  const firstTap = gesture !== null && gesture.pointerType !== 'mouse' && !gesture.state && !tapExpanded.value
  if (firstTap && props.expandOnHover) {
    tapExpanded.value = true
    open()
    hoveredId.value = item.id
    return
  }
  if (item.disabled) return
  item.onClick?.()
  emit('action', item)
}

const activeItemId = computed(() => props.activeId ?? props.items.find(item => item.active)?.id)
const highlightId = computed(() => hoveredId.value ?? activeItemId.value)

/* ---- dismissal for a bar a tap opened ----------------------------------- */

// A finger never hovers and Safari does not focus a button on tap, so a bar a
// tap expanded would have nothing to close it. The tap that lands elsewhere
// stands in for the pointer leaving — and it is consumed rather than passed
// through, because the labelled bar is exactly the kind of surface people
// dismiss by tapping just past it, over whatever control is there.
const dismissOpen = computed(() => tapExpanded.value && isExpanded.value)
let dismissRoot: HTMLElement | null = null

function consumeActivation(source: Event) {
  const swallow = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    release()
  }
  const restart = (event: Event) => { if (event !== source) release() }
  const release = () => {
    window.removeEventListener('click', swallow, true)
    window.removeEventListener('pointerdown', restart, true)
    window.removeEventListener('pointercancel', restart, true)
    window.removeEventListener('keydown', release, true)
  }
  window.addEventListener('click', swallow, true)
  window.addEventListener('pointerdown', restart, true)
  window.addEventListener('pointercancel', restart, true)
  window.addEventListener('keydown', release, true)
}

function outsideDismiss(event: PointerEvent) {
  if (event.target instanceof Node && dismissRoot?.contains(event.target)) return
  // The click that this gesture ends with is the dismissal, so it is swallowed.
  consumeActivation(event)
  close()
}
function escapeDismiss(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

function bindDismiss(element: unknown) {
  const node = element as (HTMLElement & { $el?: HTMLElement }) | null
  dismissRoot = node?.$el ?? node ?? null
  applyDismiss()
}

function applyDismiss() {
  if (typeof window === 'undefined') return
  window.removeEventListener('pointerdown', outsideDismiss, true)
  window.removeEventListener('keydown', escapeDismiss)
  if (!dismissOpen.value) return
  window.addEventListener('pointerdown', outsideDismiss, true)
  window.addEventListener('keydown', escapeDismiss)
}

// Re-evaluated whenever the open flag or the track changes, as the React effect
// keyed to the open flag does.
watchEffect(applyDismiss)

onBeforeUnmount(() => {
  clearCollapseTimer()
  window.removeEventListener('pointerdown', outsideDismiss, true)
  window.removeEventListener('keydown', escapeDismiss)
  tapDrop()
})

/* ---- transitions and sizes ---------------------------------------------- */

const ITEM_TRANSITION = { type: 'spring', stiffness: 460, damping: 34, mass: 0.62 } as const
const LABEL_TRANSITION = { type: 'spring', stiffness: 380, damping: 32, mass: 0.7 } as const

const labelTarget = computed(() => (isExpanded.value
  ? { width: 'auto', opacity: 1, x: 0, marginLeft: 8, filter: 'blur(0px)' }
  : { width: 0, opacity: 0, x: reduce.value ? 0 : -4, marginLeft: 0, filter: reduce.value ? 'blur(0px)' : 'blur(3px)' }))

const shortcutTarget = computed(() => (isExpanded.value
  ? { width: 'auto', opacity: 1, marginLeft: 4 }
  : { width: 0, opacity: 0, marginLeft: 0 }))
</script>

<template>
  <LayoutGroup>
    <!-- Pointer events, not the mouse pair: a tap fires compatibility
         mouseenter/mouseleave that carry no pointerType, and the bar growing
         under a stationary finger fired the leave before the click ever landed. -->
    <motion.div
      layout="size"
      class="action-bar"
      :class="[classNames?.root, className]"
      :transition="ITEM_TRANSITION"
      @pointerenter="onRootPointerEnter"
      @pointerleave="onRootPointerLeave"
      @focusin="onRootFocus"
      @focusout="onRootBlur">
      <motion.div
        :ref="bindDismiss"
        layout="size"
        class="action-track"
        :class="[classNames?.track, `is-${size}`]"
        :transition="ITEM_TRANSITION">
        <motion.button
          v-for="item in items"
          :key="item.id"
          layout="position"
          type="button"
          class="action-item"
          :class="[classNames?.item, `is-${size}`, { 'is-highlighted': highlightId === item.id, 'is-active': item.active || activeId === item.id && classNames?.activeItem }]"
          :disabled="item.disabled"
          :title="item.title ?? (typeof item.label === 'string' ? item.label : undefined)"
          :aria-label="item.ariaLabel ?? item.label"
          :aria-pressed="item.active ?? (activeId === item.id ? true : undefined)"
          :transition="ITEM_TRANSITION"
          :while-press="reduce || item.disabled ? undefined : { scale: 0.96 }"
          @pointerenter="onItemEnter(item, $event)"
          @pointerdown="onItemDown($event)"
          @pointercancel="tapDrop"
          @keydown="tapDrop"
          @click="onItemClick(item, $event)">
          <motion.span v-if="highlightId === item.id" layout-id="action-bar-highlight" class="action-highlight" :transition="ITEM_TRANSITION" />

          <slot name="item" :item="item" :expanded="isExpanded" :active="item.active || activeId === item.id">
            <span class="action-icon" :class="[classNames?.icon, `is-${size}`]">
              <slot name="icon" :item="item">{{ item.icon ?? item.label.slice(0, 1) }}</slot>
            </span>

            <motion.span
              :aria-hidden="!isExpanded"
              :animate="reduce ? { width: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0, marginLeft: isExpanded ? 8 : 0, x: 0, filter: 'blur(0px)' } : labelTarget"
              :transition="reduce ? { duration: 0 } : LABEL_TRANSITION"
              class="action-label"
              :class="classNames?.label">{{ item.label }}</motion.span>

            <motion.span
              v-if="item.shortcut"
              :aria-hidden="!isExpanded"
              :animate="shortcutTarget"
              :transition="LABEL_TRANSITION"
              class="action-shortcut"
              :class="classNames?.shortcut">{{ item.shortcut }}</motion.span>

            <span
              v-if="item.badge"
              class="action-badge"
              :class="[classNames?.badge, { 'is-collapsed': !isExpanded }]">{{ item.badge }}</span>
          </slot>
        </motion.button>
      </motion.div>
    </motion.div>
  </LayoutGroup>
</template>

<style scoped>
.action-bar {
  display: inline-flex;
  max-width: 100%;
  color: var(--beui-foreground);
}

.action-track {
  position: relative;
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  border: 1px solid var(--beui-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--beui-card) 90%, transparent);
  box-shadow: 0 24px 48px -12px rgb(0 0 0 / .25);
  backdrop-filter: blur(24px);
}
.action-track::-webkit-scrollbar { display: none; }
.action-track.is-sm { min-height: 2.25rem; gap: .25rem; padding: .25rem; font-size: .75rem; }
.action-track.is-md { min-height: 2.75rem; gap: .375rem; padding: .375rem; font-size: .875rem; }

.action-item {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--beui-muted-foreground);
  font: inherit;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition: color .15s ease-out, background-color .15s ease-out;
}
.action-item.is-sm { height: 1.75rem; min-width: 1.75rem; padding: 0 .375rem; }
.action-item.is-md { height: 2rem; min-width: 2rem; padding: 0 .5rem; }
.action-item.is-highlighted { color: var(--beui-foreground); }
.action-item:focus-visible { color: var(--beui-foreground); outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.action-item:disabled { pointer-events: none; opacity: .4; }

.action-highlight { position: absolute; inset: 0; z-index: -1; border-radius: 999px; background: color-mix(in srgb, var(--beui-muted) 80%, transparent); }

.action-icon { display: inline-flex; flex: none; align-items: center; justify-content: center; }
.action-icon.is-sm { width: .875rem; height: .875rem; }
.action-icon.is-md { width: 1rem; height: 1rem; }

.action-label { display: inline-block; overflow: hidden; white-space: nowrap; }
.action-shortcut { display: none; overflow: hidden; white-space: nowrap; font-size: 10px; color: var(--beui-muted-foreground); }
@media (min-width: 640px) { .action-shortcut { display: inline-block; } }

.action-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-inline-start: .125rem;
  height: 1rem;
  min-width: 1rem;
  padding: 0 .25rem;
  border-radius: 999px;
  background: var(--beui-destructive);
  color: var(--beui-primary-foreground);
  font-size: 10px;
  line-height: 1;
}
.action-badge.is-collapsed { position: absolute; right: .125rem; top: .125rem; margin: 0; }

@media (prefers-reduced-motion: reduce) {
  .action-item { transition: none; }
}
</style>
