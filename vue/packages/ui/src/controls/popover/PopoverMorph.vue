<script setup lang="ts">
import { animate, useMotionValue } from 'motion-v'
import { useReducedMotion } from '../../core/reduced-motion'
import { computed, nextTick, onBeforeUnmount, onMounted, onUpdated, shallowRef, useId, useTemplateRef, watch, watchEffect, type StyleValue } from 'vue'
import { easeOut } from '../../core/motion'
import { elementOf, firstElement, FOCUSABLE_SELECTOR, useDismiss, usePortalPosition } from './pop-helpers'

/**
 * A popover whose full-size panel reveals from the corner nearest the trigger
 * on one spring, then retraces the same clip on close. Content and surface
 * edges keep their size throughout. Closes on outside pointer or Escape.
 * Ported from `components/motion/popover-morph.tsx`.
 */
const props = withDefaults(defineProps<{
  side?: 'top' | 'bottom'
  align?: 'start' | 'end'
  /** Gap between trigger and panel, in px. */
  sideOffset?: number
  /** Panel corner radius, in px. */
  radius?: number
  /** Draw the surface shadow. */
  shadow?: boolean
  /** Built-in trigger text and fallback panel name. */
  label?: string
  /** Use the `#trigger` slot's own element as the trigger instead of a built-in button. */
  asChild?: boolean
  contentClass?: string
  contentStyle?: StyleValue
  defaultOpen?: boolean
  /** Runs after the portalled surface is positioned and visible. Passing it hands focus to the caller. */
  onOpenAutoFocus?: (content: HTMLElement) => void
  /** Element to focus when a keyboard open shows the panel. Defaults to the first focusable element. */
  initialFocus?: HTMLElement | null | (() => HTMLElement | null)
}>(), { side: 'bottom', align: 'start', sideOffset: 8, radius: 16, shadow: true, defaultOpen: false })

const open = defineModel<boolean | undefined>('open')
defineSlots<{ trigger?(): unknown; default?(props: { close: () => void }): unknown }>()

const isOpen = computed(() => open.value ?? props.defaultOpen)
function setOpen(next: boolean) { open.value = next }

// Full-distance clip travel needs a shorter curve than the slow overdamped
// panel spring: a non-bouncing spring reaches its rest within 260 ms.
const MORPH_ENTER = { type: 'spring', duration: 0.26, bounce: 0 } as const
const MORPH_EXIT = { duration: 0.2, ease: easeOut } as const
const GUTTER = 12

const reducedMotion = useReducedMotion()
const reduce = computed(() => Boolean(reducedMotion.value))
const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
const triggerId = `be-morph-trigger-${uid}`
const contentId = `be-morph-content-${uid}`

const root = useTemplateRef<HTMLElement>('root')
const host = useTemplateRef<HTMLElement>('host')
const button = useTemplateRef<unknown>('button')
const wrapper = useTemplateRef<HTMLElement>('wrapper')
const contentEl = useTemplateRef<HTMLElement>('contentEl')
const triggerEl = shallowRef<HTMLElement | null>(null)
const rootEl = shallowRef<HTMLElement | null>(null)
const mounted = shallowRef(false)
const rendered = shallowRef(isOpen.value)

function resolveTrigger() {
  const next = props.asChild ? firstElement(host.value) : elementOf(button.value)
  if (next !== triggerEl.value) triggerEl.value = next
  rootEl.value = root.value
}
onMounted(() => { mounted.value = true; resolveTrigger() })
onUpdated(resolveTrigger)

// The panel measures against the trigger; the root boxes it exactly and stands
// in until a real trigger registers.
const anchor = computed(() => triggerEl.value ?? rootEl.value)
const { layout } = usePortalPosition(anchor, contentEl, isOpen)

const progress = useMotionValue(0)
const fade = useMotionValue(reduce.value ? 0 : 1)
let focusedOnOpen = false

// A new session starts in the render that opens: measure fresh, never start an
// entrance at the previous session's coordinates.
watch(isOpen, value => {
  if (!value || rendered.value) return
  layout.value = null
  progress.jump(0)
  fade.jump(reduce.value ? 0 : 1)
  focusedOnOpen = false
  rendered.value = true
}, { flush: 'sync' })

// Focus -------------------------------------------------------------------------
// A keyboard open arms focus for the panel to take as it appears. Any later key
// or pointer press disarms it.
let focusOnOpen = false
let disarm: AbortController | null = null
function armFocusOnOpen(armed: boolean) {
  disarm?.abort()
  disarm = null
  focusOnOpen = armed
  if (!armed) return
  const controller = new AbortController()
  const clear = () => { focusOnOpen = false; controller.abort() }
  document.addEventListener('keydown', clear, { capture: true, signal: controller.signal })
  document.addEventListener('pointerdown', clear, { capture: true, signal: controller.signal })
  disarm = controller
}
function takeFocusOnOpen() { const armed = focusOnOpen; armFocusOnOpen(false); return armed }

function close() {
  setOpen(false)
  const focused = document.activeElement
  if (!(focused instanceof HTMLElement) || !contentEl.value?.contains(focused)) return
  const restore = triggerEl.value ?? (rootEl.value && rootEl.value.tabIndex >= 0 ? rootEl.value : null)
  restore?.focus()
}
useDismiss(isOpen, close, target => Boolean(root.value?.contains(target) || contentEl.value?.contains(target)))

// Trigger wiring ----------------------------------------------------------------
let keyboardPress = false
watch(triggerEl, (el, _, cleanup) => {
  if (!el) return
  const keydown = (event: KeyboardEvent) => { keyboardPress = event.key === 'Enter' || event.key === ' ' }
  const pointerdown = () => { keyboardPress = false }
  const click = (event: MouseEvent) => {
    // Enter and Space reach here as a click with `detail` 0 after their keydown
    // on this element. Only a keyboard open moves focus into the panel.
    const keyboard = keyboardPress && event.detail === 0
    keyboardPress = false
    armFocusOnOpen(!isOpen.value && keyboard)
    setOpen(!isOpen.value)
  }
  el.addEventListener('keydown', keydown)
  el.addEventListener('pointerdown', pointerdown)
  el.addEventListener('click', click)
  cleanup(() => {
    el.removeEventListener('keydown', keydown)
    el.removeEventListener('pointerdown', pointerdown)
    el.removeEventListener('click', click)
  })
}, { immediate: true, flush: 'post' })
watchEffect(() => {
  const el = triggerEl.value
  if (!el) return
  if (!el.id) el.id = triggerId
  el.setAttribute('aria-haspopup', 'dialog')
  el.setAttribute('aria-expanded', String(isOpen.value))
  if (isOpen.value) el.setAttribute('aria-controls', contentId)
  else el.removeAttribute('aria-controls')
})

// Geometry ----------------------------------------------------------------------
const ready = computed(() => layout.value !== null)
const preferredLeft = computed(() => {
  const l = layout.value
  if (!l) return 0
  return props.align === 'end' ? l.trigger.left + l.trigger.width - l.content.width : l.trigger.left
})
// Keep larger compositions, such as calendars, inside the viewport. Prefer the
// requested side, then use the roomier side when it cannot fit there.
const space = computed(() => {
  const l = layout.value
  if (!l || typeof window === 'undefined') return { below: 0, above: 0 }
  return {
    below: Math.max(0, window.innerHeight - l.trigger.top - l.trigger.height - props.sideOffset - GUTTER),
    above: Math.max(0, l.trigger.top - props.sideOffset - GUTTER),
  }
})
const resolvedSide = computed<'top' | 'bottom'>(() => {
  const l = layout.value
  if (!l) return props.side
  const requested = props.side === 'bottom' ? space.value.below : space.value.above
  const other = props.side === 'bottom' ? space.value.above : space.value.below
  return l.content.height > requested && other > requested ? (props.side === 'bottom' ? 'top' : 'bottom') : props.side
})
const availableHeight = computed(() => (resolvedSide.value === 'bottom' ? space.value.below : space.value.above))
const left = computed(() => {
  const l = layout.value
  if (!l) return 0
  return Math.max(GUTTER, Math.min(preferredLeft.value, window.innerWidth - l.content.width - GUTTER))
})
const top = computed(() => {
  const l = layout.value
  if (!l) return 0
  return resolvedSide.value === 'bottom' ? l.trigger.top + l.trigger.height + props.sideOffset : Math.max(GUTTER, l.trigger.top - l.content.height - props.sideOffset)
})

// An inset clip reveals the nearest corner without scaling borders, shadows or
// keyboard-focus geometry; one progress value keeps clip and opacity in step.
function clipAt(inset: number) {
  const side = resolvedSide.value
  return `inset(${side === 'top' ? inset : 0}% ${props.align === 'start' ? inset : 0}% ${side === 'bottom' ? inset : 0}% ${props.align === 'end' ? inset : 0}% round ${props.radius}px)`
}
function paint() {
  const p = progress.get()
  if (wrapper.value) wrapper.value.style.opacity = String(reduce.value ? fade.get() : Math.min(1, Math.max(0, p / 0.15)))
  if (contentEl.value) contentEl.value.style.clipPath = reduce.value ? '' : clipAt(92 * (1 - p))
}
watch([wrapper, contentEl, resolvedSide, reduce, () => props.align, () => props.radius], paint, { flush: 'post' })
const stops = [progress.on('change', paint), fade.on('change', paint)]

// Presence ------------------------------------------------------------------------
function gone() { rendered.value = false; armFocusOnOpen(false) }
let animation: { stop: () => void } | undefined
watch([ready, isOpen, reduce, rendered], () => {
  animation?.stop()
  animation = undefined
  if (!rendered.value) return
  if (!ready.value) { if (!isOpen.value) gone(); return }
  const settle = () => { if (!isOpen.value) gone() }
  if (reduce.value) {
    progress.jump(1)
    animation = animate(fade, isOpen.value ? 1 : 0, { duration: 0.12, onComplete: settle })
    return
  }
  animation = animate(progress, isOpen.value ? 1 : 0, { ...(isOpen.value ? MORPH_ENTER : MORPH_EXIT), onComplete: settle })
}, { flush: 'post' })

// Runs after the portalled surface is positioned and visible.
watch([ready, isOpen], async () => {
  if (!ready.value || !isOpen.value || focusedOnOpen || !contentEl.value) return
  focusedOnOpen = true
  // The wrapper turns visible in the render this measurement schedules, and
  // focus() inside a hidden subtree is silently ignored.
  await nextTick()
  if (!isOpen.value || !contentEl.value) return
  props.onOpenAutoFocus?.(contentEl.value)
  if (props.onOpenAutoFocus || !takeFocusOnOpen()) return
  const panel = contentEl.value
  const shell = wrapper.value
  if (!shell) return
  const from = document.activeElement
  const unmoved = () => document.activeElement === from || document.activeElement === panel
  // The selector also matches elements focus() refuses; keep the first
  // candidate that takes focus, else hold it on the panel.
  const focusFirst = () => {
    const wanted = typeof props.initialFocus === 'function' ? props.initialFocus() : props.initialFocus
    for (const candidate of [wanted, ...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]) {
      if (!candidate) continue
      candidate.focus({ preventScroll: true })
      if (unmoved()) continue
      candidate.scrollIntoView?.({ block: 'nearest' })
      return true
    }
    panel.focus({ preventScroll: true })
    return false
  }
  if (focusFirst()) return
  const retry = (event: TransitionEvent) => {
    if (event.propertyName !== 'visibility') return
    if (!unmoved() || focusFirst()) stop()
  }
  const stop = () => {
    shell.removeEventListener('transitionend', retry)
    document.removeEventListener('keydown', stop, true)
    document.removeEventListener('pointerdown', stop, true)
  }
  shell.addEventListener('transitionend', retry)
  document.addEventListener('keydown', stop, true)
  document.addEventListener('pointerdown', stop, true)
}, { flush: 'post' })

onBeforeUnmount(() => { animation?.stop(); for (const stop of stops) stop(); disarm?.abort() })
defineExpose({ close, open: () => setOpen(true) })
</script>

<template>
  <span ref="root" class="be-morph-popover">
    <span v-if="asChild" ref="host" class="be-morph-host"><slot name="trigger" /></span>
    <button v-else ref="button" type="button" class="be-morph-trigger"><slot name="trigger">{{ label }}</slot></button>
    <Teleport v-if="mounted && rendered" to="body">
      <div ref="wrapper" data-morph-popover-portal="" class="be-morph-portal" :class="{ shadow }" :inert="!isOpen"
        :style="{ left: `${left}px`, top: `${top}px`, pointerEvents: isOpen ? 'auto' : 'none', visibility: layout ? 'visible' : 'hidden' }">
        <div ref="contentEl" :id="contentId" role="dialog" :aria-labelledby="triggerEl?.id || triggerId" tabindex="-1" class="be-morph-dialog" :class="contentClass"
          :style="[{ borderRadius: `${radius}px`, maxHeight: layout ? `${availableHeight}px` : undefined }, contentStyle]">
          <slot :close="close" />
        </div>
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.be-morph-popover { position: relative; display: inline-flex; }
.be-morph-host { display: contents; }
.be-morph-trigger { display: inline-flex; height: 2.5rem; align-items: center; gap: .5rem; border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-background); padding: 0 1rem; font: inherit; font-size: .875rem; font-weight: 500; line-height: 1.25rem; color: var(--beui-foreground); outline: none; cursor: pointer; transition: border-color .15s; }
.be-morph-trigger:hover { border-color: var(--beui-border-strong); }
.be-morph-trigger:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-morph-portal { position: fixed; z-index: 9999; }
/* A drop-shadow follows the clipped surface; box-shadow would be cut off by its own clip. */
.be-morph-portal.shadow { filter: drop-shadow(0 10px 18px rgba(0, 0, 0, .14)); }
.be-morph-dialog { box-sizing: border-box; overflow-x: hidden; overflow-y: auto; border: 1px solid var(--beui-border); background: var(--beui-background); color: var(--beui-foreground); outline: none; }
/* An inset ring stays inside the clip that would cut off an outline. */
.be-morph-dialog:focus-visible { box-shadow: inset 0 0 0 2px var(--beui-ring); }
</style>
