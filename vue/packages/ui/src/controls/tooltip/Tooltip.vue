<script lang="ts">
// Moving along a toolbar should feel instant after the first label, and only
// one label may show at a time: a keyboard-focused control and a hovered one
// would otherwise both claim the screen.
let lastClosedAt = 0
let current: { close: () => void } | null = null
</script>

<script setup lang="ts">
import { useReducedMotion } from '../../core/reduced-motion'
import { Comment, computed, inject, nextTick, onBeforeUnmount, onMounted, onUpdated, provide, shallowRef, Text, unref, useAttrs, useId, useSlots, useTemplateRef, watch, watchEffect, type VNode } from 'vue'
import { createHoverGesture, createTapGesture, firstElement, useDismiss } from '../popover/pop-helpers'
import {
  computePlacement, focusFromKeyboard, graceArea, inBox, inPolygon, PARTS_KEY, TIMING_KEY, watchModality,
  type TooltipAlign, type TooltipPart, type TooltipPoint, type TooltipSide,
} from './tip-shared'

/**
 * A hover/focus label anchored to the element its default slot renders (or to
 * a built-in button when the slot holds only text). Timing comes from an
 * optional `TooltipProvider`: the first label waits, the next ones open
 * instantly. Ported from `components/motion/tooltip.tsx`.
 *
 * Two ways to write it: the shorthand (`content` or the `#content` slot, the default slot is the
 * trigger), or composed from `TooltipTrigger` and `TooltipContent` inside it.
 */
const props = withDefaults(defineProps<{
  /** Plain-text content; use the `#content` slot for anything richer. */
  content?: string
  side?: TooltipSide
  align?: TooltipAlign
  /** Gap between anchor and tooltip (px). */
  sideOffset?: number
  /** Draw an arrow pointing at the anchor. */
  arrow?: boolean
  /** Point within the anchor, as fractions of its rendered width and height. */
  anchorPoint?: TooltipPoint
  /** Follow real pointer coordinates; keyboard focus still uses the anchor. */
  followCursor?: boolean
  /** Delay before showing on hover (ms). Keyboard focus shows immediately. */
  delay?: number
  /** Delay before hiding once the pointer has left (ms). */
  closeDelay?: number
  /** Never show, e.g. while the label it carries is already visible. */
  disabled?: boolean
  /** Use the tooltip as the trigger's accessible name rather than its description. */
  asLabel?: boolean
  defaultOpen?: boolean
  contentClass?: string
  /** Accessible name for the trigger (legacy; prefer `asLabel`). */
  label?: string
  /** `aria-keyshortcuts` for the trigger. */
  shortcut?: string
  /** `aria-pressed` for the trigger when not null/undefined. */
  pressed?: boolean | null
  /** Accepted for backward compatibility; the trigger element is now yours. */
  toolbar?: boolean
  /** Anchor an element you already have (for example a chart cell) instead of a trigger. The tooltip then does not listen to it: drive `v-model:open` yourself. */
  anchorRef?: HTMLElement | null | { value: HTMLElement | null }
  /** Id of the tooltip surface, for anchors that reference it themselves. */
  id?: string
}>(), { side: 'top', align: 'center', arrow: false, followCursor: false, disabled: false, asLabel: false, defaultOpen: false, pressed: undefined })

const open = defineModel<boolean | undefined>('open')
const emit = defineEmits<{ activate: [event: MouseEvent]; show: []; hide: [] }>()
const slots = useSlots()
// `class` on the shorthand styles the tooltip surface (the root renders no element of its own).
defineOptions({ inheritAttrs: false })
const attrs = useAttrs()
defineSlots<{ default?(): unknown; content?(): unknown }>()

const timing = inject(TIMING_KEY, null)
const delay = computed(() => props.delay ?? timing?.delay.value ?? 120)
const closeDelay = computed(() => props.closeDelay ?? timing?.closeDelay.value ?? 0)
const skipDelay = computed(() => timing?.skipDelay.value ?? 300)

const reducedMotion = useReducedMotion()
const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
const contentId = props.id ?? `be-tip-${uid}-content`
const labelId = `be-tip-${uid}-label`

const host = useTemplateRef<HTMLElement>('host')
const floatingEl = useTemplateRef<HTMLElement>('floating')
const arrowEl = useTemplateRef<SVGSVGElement>('arrowEl')
const anchor = shallowRef<HTMLElement | null>(null)
const mounted = shallowRef(false)
const rendered = shallowRef(false)
const ready = shallowRef(false)
// A composed tooltip hands its side, align, offset, arrow and class over through `TooltipContent`.
const part = shallowRef<TooltipPart | null>(null)
const eff = computed(() => {
  const c = part.value?.props
  return {
    side: c?.side ?? props.side,
    align: c?.align ?? props.align,
    sideOffset: c?.sideOffset ?? props.sideOffset,
    arrow: c?.arrow ?? props.arrow,
    anchorPoint: c?.anchorPoint ?? props.anchorPoint,
    class: [props.contentClass, attrs.class, c?.class],
  }
})
const placedSide = shallowRef<TooltipSide>(eff.value.side)

const isOpen = computed(() => open.value ?? props.defaultOpen)
const hasNodes = (nodes: unknown): boolean => Array.isArray(nodes) && nodes.some((node: VNode) => node.type === Text ? String(node.children ?? '').trim() !== '' : node.type !== Comment && (typeof node.type !== 'symbol' || hasNodes(node.children)))
const empty = computed(() => !props.content && !slots.content && !(part.value && hasNodes(part.value.slots.default?.())))
const present = computed(() => isOpen.value && !empty.value)
provide(PARTS_KEY, {
  open: computed(() => isOpen.value),
  register: next => { part.value = next },
  unregister: next => { if (part.value === next) part.value = null },
})
// What the surface shows: composed content first, then the `#content` slot, then the `content` prop.
const ContentRender = () => part.value?.slots.default?.() ?? (slots.content ? slots.content() : props.content)

// Whether the default slot supplies an element to anchor to. Text-only content
// gets a built-in button, so there is always something focusable.
function hasElementTrigger() {
  const walk = (nodes: VNode[]): boolean => nodes.some(node => {
    if (Array.isArray(node.children) && typeof node.type === 'symbol' && node.type !== Comment) return walk(node.children as VNode[])
    return typeof node.type === 'string' || typeof node.type === 'object' || typeof node.type === 'function'
  })
  return walk(slots.default?.() ?? [])
}

const external = computed(() => props.anchorRef !== undefined)
function resolveAnchor() {
  const next = external.value ? (unref(props.anchorRef as never) as HTMLElement | null) ?? null : firstElement(host.value)
  if (next !== anchor.value) anchor.value = next
}
onMounted(() => { mounted.value = true; watchModality(); resolveAnchor() })
onUpdated(resolveAnchor)

/* ---- open / close ---------------------------------------------------------- */
let openTimer: number | undefined
let closeTimer: number | undefined
let stopGraceListener: (() => void) | undefined
const self = { close: () => close() }

function clearTimers() {
  if (openTimer !== undefined) window.clearTimeout(openTimer)
  if (closeTimer !== undefined) window.clearTimeout(closeTimer)
  openTimer = undefined
  closeTimer = undefined
}
function stopGrace() { stopGraceListener?.(); stopGraceListener = undefined }

// Only a real change reaches the consumer: a pointer leaving a closed tooltip is not news.
function commit(next: boolean) {
  if (isOpen.value === next) return
  open.value = next
  if (next) emit('show')
  else emit('hide')
}
function openNow() {
  clearTimers()
  stopGrace()
  if (props.disabled || empty.value) return
  if (current && current !== self) current.close()
  current = self
  commit(true)
}
function close() {
  clearTimers()
  stopGrace()
  if (isOpen.value) lastClosedAt = Date.now()
  if (current === self) current = null
  commit(false)
}
function requestOpen() {
  clearTimers()
  if (isOpen.value || props.disabled || empty.value) return
  const warm = Date.now() - lastClosedAt < skipDelay.value
  if (warm || delay.value <= 0) openNow()
  else openTimer = window.setTimeout(openNow, delay.value)
}
function requestClose() {
  clearTimers()
  if (closeDelay.value > 0) closeTimer = window.setTimeout(close, closeDelay.value)
  else close()
}
// Hold the label open while the pointer crosses from one box toward the other.
function startGrace(exit: TooltipPoint, from: Element, to: Element | null) {
  stopGrace()
  if (!to) return requestClose()
  const target = to.getBoundingClientRect()
  const origin = from.getBoundingClientRect()
  const corridor = graceArea(exit, target)
  const onMove = (event: PointerEvent) => {
    const point = { x: event.clientX, y: event.clientY }
    if (inBox(point, target) || inBox(point, origin)) return
    if (!inPolygon(point, corridor)) requestClose()
  }
  document.addEventListener('pointermove', onMove)
  stopGraceListener = () => document.removeEventListener('pointermove', onMove)
}

/* ---- trigger wiring ---------------------------------------------------------- */
const hover = createHoverGesture()
const tap = createTapGesture<boolean>()
let cursor: TooltipPoint | null = null
let schedule: () => void = () => {}

// Listeners go on the trigger itself rather than on cloned props, so a
// component that owns its own handlers keeps them.
watch(anchor, (el, _, cleanup) => {
  if (!el || external.value) return
  // A mouse press dismisses the label and keeps it away until the pointer
  // leaves; hovering a control you just clicked should not bring it back.
  let suppressed = false
  // Focus that came from the keyboard holds the label open on its own.
  let keyboardFocus = false

  const onEnter = (event: PointerEvent) => {
    if (!hover.enter(event)) return
    stopGrace()
    if (closeTimer !== undefined) window.clearTimeout(closeTimer)
    if (!suppressed) requestOpen()
  }
  const onLeave = (event: PointerEvent) => {
    if (!hover.leave(event)) return
    suppressed = false
    if (keyboardFocus) return
    if (openTimer !== undefined) { clearTimers(); return }
    if (isOpen.value && !props.followCursor) startGrace({ x: event.clientX, y: event.clientY }, el, floatingEl.value)
    else requestClose()
  }
  const onDown = (event: PointerEvent) => {
    tap.start(event, isOpen.value)
    if (event.pointerType === 'mouse') { suppressed = true; close() }
  }
  // A finger never hovers, and Safari does not focus a button on tap either, so
  // the label is only reachable if the tap itself toggles it. The click carries
  // no pointerType; the pointerdown before it says whether it was a tap.
  const onClick = (event: MouseEvent) => {
    emit('activate', event)
    const gesture = tap.take()
    if (!gesture || gesture.pointerType === 'mouse') return
    if (gesture.state) close()
    else openNow()
  }
  const onKey = () => tap.drop()
  const onFocusIn = () => {
    if (!focusFromKeyboard()) return
    keyboardFocus = true
    openNow()
  }
  const onFocusOut = (event: FocusEvent) => {
    if (el.contains(event.relatedTarget as Node | null)) return
    keyboardFocus = false
    close()
  }
  const onCancel = () => tap.drop()
  el.addEventListener('pointerenter', onEnter)
  el.addEventListener('pointerleave', onLeave)
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointercancel', onCancel)
  el.addEventListener('click', onClick)
  el.addEventListener('keydown', onKey)
  el.addEventListener('focusin', onFocusIn)
  el.addEventListener('focusout', onFocusOut)
  cleanup(() => {
    el.removeEventListener('pointerenter', onEnter)
    el.removeEventListener('pointerleave', onLeave)
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('pointercancel', onCancel)
    el.removeEventListener('click', onClick)
    el.removeEventListener('keydown', onKey)
    el.removeEventListener('focusin', onFocusIn)
    el.removeEventListener('focusout', onFocusOut)
  })
}, { immediate: true, flush: 'post' })

// ARIA: the tooltip is either the trigger's name or its description.
watch(anchor, (el, _, cleanup) => {
  if (!el || external.value) return
  const originalLabelledby = el.getAttribute('aria-labelledby')
  const originalDescribedby = el.getAttribute('aria-describedby')
  const originalLabel = el.getAttribute('aria-label')
  const originalShortcut = el.getAttribute('aria-keyshortcuts')
  const originalPressed = el.getAttribute('aria-pressed')
  const stop = watchEffect(() => {
    if (props.asLabel) {
      const value = empty.value ? originalLabelledby : labelId
      if (value) el.setAttribute('aria-labelledby', value); else el.removeAttribute('aria-labelledby')
    } else {
      const value = [originalDescribedby, isOpen.value && !empty.value ? contentId : ''].filter(Boolean).join(' ')
      if (value) el.setAttribute('aria-describedby', value); else el.removeAttribute('aria-describedby')
    }
    if (props.label) el.setAttribute('aria-label', props.label)
    if (props.shortcut) el.setAttribute('aria-keyshortcuts', props.shortcut)
    if (props.pressed != null) el.setAttribute('aria-pressed', String(props.pressed))
  })
  cleanup(() => {
    stop()
    for (const [name, value] of [['aria-labelledby', originalLabelledby], ['aria-describedby', originalDescribedby], ['aria-label', originalLabel], ['aria-keyshortcuts', originalShortcut], ['aria-pressed', originalPressed]] as const) {
      if (value === null) el.removeAttribute(name); else el.setAttribute(name, value)
    }
  })
}, { immediate: true, flush: 'post' })

// Pointer lifetime belongs to the anchor, including the opening delay.
watch([anchor, () => props.followCursor], ([el, follow], _, cleanup) => {
  if (!el || !follow) return
  let pointerFocus = false
  const point = (event: PointerEvent) => {
    if (event.type === 'pointermove' && event.pointerType === 'touch' && !event.buttons) return
    cursor = { x: event.clientX, y: event.clientY }
    if (event.type === 'pointerdown') pointerFocus = true
    schedule()
  }
  const keyboard = () => { cursor = null; pointerFocus = false; schedule() }
  const focus = () => { if (!pointerFocus) cursor = null; pointerFocus = false; schedule() }
  const leave = () => { cursor = null }
  el.addEventListener('pointerenter', point as EventListener, { passive: true })
  el.addEventListener('pointermove', point as EventListener, { passive: true })
  el.addEventListener('pointerdown', point as EventListener, { passive: true })
  el.addEventListener('pointerleave', leave)
  el.addEventListener('pointercancel', leave)
  el.addEventListener('keydown', keyboard)
  el.addEventListener('focusin', focus)
  cleanup(() => {
    cursor = null
    el.removeEventListener('pointerenter', point as EventListener)
    el.removeEventListener('pointermove', point as EventListener)
    el.removeEventListener('pointerdown', point as EventListener)
    el.removeEventListener('pointerleave', leave)
    el.removeEventListener('pointercancel', leave)
    el.removeEventListener('keydown', keyboard)
    el.removeEventListener('focusin', focus)
  })
}, { immediate: true, flush: 'post' })

// While open, a trigger that turns disabled loses focus without a blur event,
// and a window that loses focus never reports the pointer leaving.
watch([isOpen, anchor], ([value, el], _, cleanup) => {
  if (!value || !el) return
  const observer = new MutationObserver(() => { if (el.matches(':disabled, [aria-disabled="true"]')) close() })
  observer.observe(el, { attributes: true, attributeFilter: ['disabled', 'aria-disabled'] })
  window.addEventListener('blur', close)
  cleanup(() => { observer.disconnect(); window.removeEventListener('blur', close) })
}, { immediate: true })

// A chart drives its own open state and swaps content as it goes; only a trigger-owned label closes itself for having nothing to say.
watch([() => props.disabled, empty], () => { if (props.disabled || (empty.value && !external.value)) close() })

// ...and closed by the next tap that lands somewhere else, or Escape. The label
// covers nothing interactive, so that tap passes through to what it hit.
useDismiss(isOpen, close, target => Boolean(floatingEl.value?.contains(target) || anchor.value?.contains(target)))

function onContentEnter() { stopGrace(); clearTimers() }
function onContentLeave(event: PointerEvent) {
  const floating = floatingEl.value
  if (!floating) return
  startGrace({ x: event.clientX, y: event.clientY }, floating, anchor.value)
}

/* ---- presence: the surface stays mounted through its exit ------------------- */
const EXIT_MS = 130
let exitTimer: number | undefined
watch(present, value => {
  if (exitTimer !== undefined) window.clearTimeout(exitTimer)
  exitTimer = undefined
  if (value) {
    if (!rendered.value) ready.value = false
    rendered.value = true
  } else if (rendered.value) {
    exitTimer = window.setTimeout(() => { rendered.value = false; ready.value = false }, EXIT_MS)
  }
}, { immediate: true, flush: 'sync' })

/* ---- positioning: geometry, not animation ------------------------------------ */
let frame: number | undefined
let cursorSide: TooltipSide | null = null
function place() {
  const floating = floatingEl.value
  const a = anchor.value
  if (!present.value || !a || !floating) return
  const currentCursor = props.followCursor ? cursor : null
  const anchorRect = a.getBoundingClientRect()
  const virtual = Boolean(currentCursor) || eff.value.anchorPoint !== undefined
  const px = currentCursor?.x ?? anchorRect.left + anchorRect.width * (eff.value.anchorPoint?.x ?? 0.5)
  const py = currentCursor?.y ?? anchorRect.top + anchorRect.height * (eff.value.anchorPoint?.y ?? 0.5)
  const reference = virtual ? { left: px, top: py, width: 0, height: 0 } : anchorRect
  const box = floating.getBoundingClientRect()
  const result = computePlacement({
    reference,
    floating: { width: box.width, height: box.height },
    side: currentCursor ? (cursorSide ?? eff.value.side) : eff.value.side,
    align: eff.value.align,
    offset: eff.value.sideOffset ?? (currentCursor ? 12 : 8),
    viewport: { width: document.documentElement.clientWidth, height: window.innerHeight },
    padding: 8,
    arrow: arrowEl.value ? 12 : undefined,
  })
  // Hold the chosen side for this hover session. Crossing a flip threshold
  // repeatedly must not bounce the surface above and below the pointer.
  cursorSide = currentCursor ? result.side : null
  const dpr = window.devicePixelRatio || 1
  floating.style.transform = `translate3d(${Math.round(result.x * dpr) / dpr}px, ${Math.round(result.y * dpr) / dpr}px, 0)`
  floating.style.setProperty('--tooltip-origin', { top: 'center bottom', bottom: 'center top', left: 'right center', right: 'left center' }[result.side])
  // A label left floating over whatever scrolled into its trigger's place
  // describes nothing there. Points inside a chart move with the chart.
  const clipped = !virtual && (anchorRect.width > 0 || anchorRect.height > 0)
    && (anchorRect.bottom < 0 || anchorRect.top > window.innerHeight || anchorRect.right < 0 || anchorRect.left > window.innerWidth)
  floating.style.visibility = clipped ? 'hidden' : 'visible'
  floating.dataset.placement = result.side
  const surface = arrowEl.value?.parentElement
  if (arrowEl.value && surface) {
    // Measured against the positioner, drawn inside the surface's border.
    if (result.arrowX != null) arrowEl.value.style.left = `${result.arrowX - surface.clientLeft}px`
    if (result.arrowY != null) arrowEl.value.style.top = `${result.arrowY - surface.clientTop}px`
    // Paint with whatever the surface resolved to, so a restyled tooltip keeps a matching arrow.
    const style = getComputedStyle(surface)
    arrowEl.value.style.setProperty('--tooltip-arrow-fill', style.backgroundColor)
    arrowEl.value.style.setProperty('--tooltip-arrow-stroke', style.borderTopColor)
  }
  placedSide.value = result.side
  ready.value = true
}
schedule = () => {
  if (frame !== undefined) return
  frame = requestAnimationFrame(() => { frame = undefined; place() })
}
watch([floatingEl, anchor, present, () => eff.value.side, () => eff.value.align, () => eff.value.sideOffset, () => props.followCursor, () => eff.value.arrow, () => eff.value.anchorPoint, () => props.content], (_, __, cleanup) => {
  const floating = floatingEl.value
  const a = anchor.value
  if (!present.value || !a || !floating) return
  cursorSide = null
  place()
  const observer = new ResizeObserver(schedule)
  observer.observe(a)
  observer.observe(floating)
  const onScroll = () => {
    schedule()
    // A stationary pointer no longer describes the same chart point after scrolling.
    if (props.followCursor && cursor) close()
  }
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', schedule)
  cleanup(() => {
    observer.disconnect()
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', schedule)
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
  })
}, { flush: 'post', immediate: true })
// Content that arrives after the first paint needs one more measurement.
watch(() => slots.content, () => nextTick(schedule))

onBeforeUnmount(() => {
  clearTimers()
  stopGrace()
  if (current === self) current = null
  if (exitTimer !== undefined) window.clearTimeout(exitTimer)
  if (frame !== undefined) cancelAnimationFrame(frame)
})
defineExpose({ close, open: openNow })
</script>

<template>
  <span v-if="!external" ref="host" class="be-tip-host">
    <slot v-if="hasElementTrigger()" />
    <button v-else type="button" class="be-tip-fallback"><slot /></button>
  </span>
  <Teleport v-if="mounted" to="body">
    <!-- The name has to exist while the label is closed, so it lives apart from the surface. -->
    <span v-if="asLabel && !empty" :id="labelId" hidden><ContentRender /></span>
    <span v-if="rendered && !empty" ref="floating" class="be-tip-positioner" style="visibility: hidden" :inert="!present" :aria-hidden="!present || undefined">
      <span :id="asLabel ? undefined : contentId" role="tooltip" class="be-tip-surface" :class="[{ relative: eff.arrow, reduced: reducedMotion }, eff.class]"
        :aria-hidden="asLabel || undefined" :data-open="ready && present ? '' : undefined" :data-side="placedSide"
        :style="{ pointerEvents: present && !followCursor ? 'auto' : 'none' }"
        @pointerenter="onContentEnter" @pointerleave="onContentLeave">
        <ContentRender />
        <!-- Each arrow is a 12px box whose base sits on the surface's inner border edge, so its fill covers the border beneath it and only the two outer edges stroke. -->
        <svg v-if="eff.arrow" ref="arrowEl" aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" class="be-tip-arrow" :data-side="placedSide">
          <path :d="{ top: 'M0 6L6 12L12 6Z', bottom: 'M0 6L6 0L12 6Z', left: 'M6 0L12 6L6 12Z', right: 'M6 0L0 6L6 12Z' }[placedSide]" class="fill" />
          <path :d="{ top: 'M0 6L6 12L12 6', bottom: 'M0 6L6 0L12 6', left: 'M6 0L12 6L6 12', right: 'M6 0L0 6L6 12' }[placedSide]" fill="none" stroke-width="1" class="stroke" />
        </svg>
      </span>
    </span>
  </Teleport>
</template>

<style scoped>
.be-tip-host { display: contents; }
.be-tip-fallback { border: 1px solid var(--beui-border); background: var(--beui-card); color: var(--beui-foreground); border-radius: .55rem; padding: .5rem .85rem; font: inherit; font-size: .8rem; cursor: pointer; }
.be-tip-positioner { pointer-events: none; position: fixed; left: 0; top: 0; z-index: 9999; width: max-content; max-width: calc(100vw - 16px); }
.be-tip-surface { display: block; box-sizing: border-box; max-width: min(20rem, calc(100vw - 16px)); white-space: normal; overflow-wrap: break-word; border: 1px solid var(--beui-border); border-radius: .5rem; background: var(--beui-background); padding: .25rem .625rem; font-size: .75rem; line-height: 1rem; font-weight: 500; color: var(--beui-foreground); box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1);
  transform-origin: var(--tooltip-origin, center); opacity: 0; transform: scale(.94); transition: opacity .12s cubic-bezier(.16, 1, .3, 1), transform .12s cubic-bezier(.16, 1, .3, 1); }
.be-tip-surface.reduced { transform: none; }
.be-tip-surface[data-open] { opacity: 1; transform: none; transition-duration: .18s; }
.be-tip-surface.relative { position: relative; }
.be-tip-arrow { position: absolute; overflow: visible; pointer-events: none; }
.be-tip-arrow[data-side=top] { top: calc(100% - 6px); }
.be-tip-arrow[data-side=bottom] { bottom: calc(100% - 6px); }
.be-tip-arrow[data-side=left] { left: calc(100% - 6px); }
.be-tip-arrow[data-side=right] { right: calc(100% - 6px); }
.be-tip-arrow .fill { fill: var(--tooltip-arrow-fill, transparent); }
.be-tip-arrow .stroke { stroke: var(--tooltip-arrow-stroke, transparent); }
</style>
