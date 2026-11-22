<script lang="ts">
// Several viewers can be open at once (a gallery opened from inside a dialog),
// so sibling inertness and the body scroll lock are reference-counted across
// instances, exactly like the React `useModalScope`. Module scope keeps the
// counts shared between every mounted lightbox.
const inertOwners = new Map<HTMLElement, { count: number; previous: boolean }>()
let scrollOwners = 0
let previousOverflow = ''

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  "input:not(:disabled):not([type='hidden'])",
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  "[tabindex]:not([tabindex='-1'])",
].join(',')
</script>

<script setup lang="ts">
import { AnimatePresence, animate, motion, useMotionValue } from 'motion-v'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { easeOut, layoutSpring } from '../core/motion'
import ImageViewerCaption from './ImageViewerCaption.vue'
import ImageViewerClose from './ImageViewerClose.vue'
import ImageViewerCounter from './ImageViewerCounter.vue'
import ImageViewerNext from './ImageViewerNext.vue'
import ImageViewerPrevious from './ImageViewerPrevious.vue'
import { useImageViewerContext } from './image-viewer-context'

/** The viewer overlay: portal, focus scope, swipe and zoom frame, and exit interaction gate. Put `ImageViewerCounter`, `ImageViewerClose`, `ImageViewerPrevious`, `ImageViewerCaption` and `ImageViewerNext` in its slots, or omit them for the default header and footer. */
defineOptions({ inheritAttrs: false })
defineSlots<{
  /** Custom header; defaults to the counter and close control. */
  header?: () => unknown
  /** Custom footer; defaults to navigation and the image caption. */
  default?: () => unknown
}>()
const context = useImageViewerContext('ImageViewerContent')
const { images, t, index, image, label, close, move, select, groupKey, reduce } = context

// Mirrors EASE_DRAWER in the upstream `lib/ease.ts`; the shared tokens carry
// only EASE_OUT and EASE_IN_OUT.
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const
// Paging needs a definite arrival; an overdamped panel spring creeps through
// the last few pixels before snapping to its rest threshold.
const IMAGE_SLIDE_TRANSITION = { type: 'tween', duration: 0.28, ease: EASE_DRAWER } as const

type ImageSwap = { direction: -1 | 1; reduce: boolean }
// Use Motion's x channel so the final slide position is painted in the same
// frame as its animation. A native transform animation can briefly expose its
// initial inline transform when it releases ownership at completion.
const imageSwapVariants = {
  enter: ({ direction, reduce }: ImageSwap) => ({
    opacity: reduce ? 0 : 1,
    x: `${reduce ? 0 : direction * 100}%`,
  }),
  visible: ({ reduce }: ImageSwap) => ({
    opacity: 1,
    x: '0%',
    transition: reduce ? { duration: 0.1, ease: easeOut } : IMAGE_SLIDE_TRANSITION,
  }),
  exit: ({ direction, reduce }: ImageSwap) => ({
    opacity: reduce ? 0 : 1,
    x: `${reduce ? 0 : direction * -100}%`,
    transition: reduce ? { duration: 0.1, ease: easeOut } : IMAGE_SLIDE_TRANSITION,
  }),
}

const panHelpId = `${groupKey}-pan-help`

const open = computed(() => Boolean(image.value))
const session = computed(() => (image.value ? `${image.value.id}-${image.value.src}` : ''))
// While the opening morph is still in flight the frame keeps the shared-layout
// identity of the image it opened from. Re-pointing a projecting frame at another
// thumbnail mid-morph leaves motion-v's projection exit handoff pending forever,
// so a close during that window would never unmount the overlay.
const MORPH_SETTLE_MS = 700
const openedFrom = shallowRef<string | null>(null)
let settleTimer: ReturnType<typeof setTimeout> | undefined
const layoutId = computed(() => (reduce.value || !image.value ? undefined : `${groupKey}-${openedFrom.value ?? image.value.id}`))
const imageWidth = computed(() => (image.value
  ? `min(100%, calc((100dvh - 160px) * ${image.value.width / image.value.height}))`
  : undefined))

// --- Portal ---------------------------------------------------------------
const mounted = shallowRef(false)
const portal = useTemplateRef<HTMLDivElement>('portal')
onMounted(() => { mounted.value = true })

// --- Presence gate --------------------------------------------------------
// `AnimatePresence` keeps a leaving subtree's last vnode as it was: the overlay
// still sits on top of the page through its exit but is never re-rendered, so
// the gate it rendered with is stale. Release pointer events and accessibility
// exposure on the retained layers in the commit that starts the exit, exactly
// as the React `PresenceGate` would, and put them back if the overlay re-enters
// mid-exit (the same nodes are reused).
function applyGate(present: boolean) {
  const root = portal.value
  if (!root) return
  for (const element of Array.from(root.querySelectorAll<HTMLElement>('[data-lightbox-gate]'))) {
    element.inert = !present
    if (present) element.style.removeProperty('pointer-events')
    else element.style.pointerEvents = 'none'
  }
}

// --- Modal scope ----------------------------------------------------------
// A portal root owns sibling inertness, the scroll lock, the focus trap and
// focus restore until its open state ends. Mirrors `useModalScope`.
let scopeCleanup: (() => void) | undefined

function panelElement() {
  return portal.value?.querySelector<HTMLElement>('[role="dialog"]') ?? null
}

function startScope() {
  if (scopeCleanup) return
  const root = portal.value
  const panel = panelElement()
  if (!root || !panel) return
  const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const siblings = Array.from(document.body.children).filter(
    (element): element is HTMLElement => element instanceof HTMLElement && element !== root,
  )
  for (const element of siblings) {
    const owner = inertOwners.get(element) ?? { count: 0, previous: element.inert }
    owner.count += 1
    inertOwners.set(element, owner)
    element.inert = true
  }
  if (scrollOwners++ === 0) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(element => element.tabIndex >= 0 && !element.closest('[inert]'))
  const focusFirst = () => (focusables()[0] ?? panel).focus({ preventScroll: true })
  focusFirst()
  const onFocus = (event: FocusEvent) => {
    if (event.target instanceof Node && !root.contains(event.target)) focusFirst()
  }
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
    if (event.key !== 'Tab') return
    const elements = focusables()
    const first = elements[0]
    const last = elements[elements.length - 1]
    if (!first || !last) {
      event.preventDefault()
      panel.focus()
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  document.addEventListener('focusin', onFocus)
  document.addEventListener('keydown', onKey)
  scopeCleanup = () => {
    document.removeEventListener('focusin', onFocus)
    document.removeEventListener('keydown', onKey)
    for (const element of siblings) {
      const owner = inertOwners.get(element)
      if (owner && --owner.count === 0) {
        element.inert = owner.previous
        inertOwners.delete(element)
      }
    }
    if (--scrollOwners === 0) document.body.style.overflow = previousOverflow
    if (returnFocus?.isConnected && !returnFocus.closest('[inert]')) returnFocus.focus({ preventScroll: true })
  }
}

function stopScope() {
  scopeCleanup?.()
  scopeCleanup = undefined
}

watch(open, isOpen => {
  if (isOpen) {
    applyGate(true)
    startScope()
    return
  }
  applyGate(false)
  stopScope()
}, { flush: 'post' })
watch(mounted, isMounted => {
  if (isMounted && open.value) {
    applyGate(true)
    startScope()
  }
}, { flush: 'post' })
onBeforeUnmount(() => {
  clearTimeout(settleTimer)
  stopScope()
})

// --- Frame presentation ---------------------------------------------------
// The frame keeps its shared-layout identity and stays mounted; only the image
// layer changes identity. `presentation` holds the session the frame last
// settled on, so the slide direction is known during the render that changes
// session — the same render in which React diffs its `selection` state.
const presentation = shallowRef({ session: '', index: -1, direction: 1 as -1 | 1 })

const zoom = shallowRef(false)
const failed = shallowRef(false)
const x = useMotionValue(0)
const y = useMotionValue(0)
const scale = useMotionValue(1)
const pan = shallowRef({ x: 0, y: 0 })
const swipe = shallowRef<{ x: number; y: number } | null>(null)

const changed = computed(() => presentation.value.session !== session.value)
const direction = computed<-1 | 1>(() => {
  const previous = presentation.value
  return changed.value ? (index.value < previous.index ? -1 : 1) : previous.direction
})

watch(session, (next, previous) => {
  zoom.value = false
  swipe.value = null
  if (!previous && next) {
    openedFrom.value = image.value?.id ?? null
    clearTimeout(settleTimer)
    settleTimer = setTimeout(() => { openedFrom.value = null }, MORPH_SETTLE_MS)
  }
  if (!next) {
    clearTimeout(settleTimer)
    openedFrom.value = null
    // Closing: the image returns to rest while the frame morphs back home.
    if (reduce.value) {
      scale.set(1)
      x.set(0)
      y.set(0)
    } else {
      animate(scale, 1, layoutSpring)
      animate(x, 0, layoutSpring)
      animate(y, 0, layoutSpring)
    }
    return
  }
  failed.value = false
  // A new session starts at rest, like the original's `positionSession` reset.
  scale.set(1)
  x.set(0)
  y.set(0)
}, { flush: 'sync' })

// Record the settled session after its commit, so the next change reads a pair
// that is not half-updated.
watch(session, () => {
  if (!changed.value) return
  presentation.value = { session: session.value, index: index.value, direction: direction.value }
}, { flush: 'post' })

// Paging keeps the frame mounted; a leaving slide is frozen by AnimatePresence,
// so release its pointer events and accessibility exposure as it starts to go.
// The element the current session owns stays interactive — a rapid
// next-then-previous can re-enter a slide that is still leaving, reusing its
// node, and the gate has to follow the re-entry.
watch(session, () => {
  const slides = portal.value?.querySelectorAll<HTMLElement>('[data-lightbox-slide]') ?? []
  for (const element of Array.from(slides)) {
    const present = element.dataset.session === session.value
    element.inert = !present
    if (present) element.style.removeProperty('pointer-events')
    else element.style.pointerEvents = 'none'
  }
}, { flush: 'post' })

// Paging can strand focus on a button that just became disabled (the last image
// has no next control), so hand it back to the panel's first control.
watch(() => image.value?.id, (id, previous) => {
  if (!mounted.value || !id || !previous) return
  const panel = panelElement()
  if (!panel) return
  const focused = document.activeElement
  if (!panel.contains(focused) || (focused instanceof HTMLButtonElement && focused.disabled)) {
    (panel.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? panel).focus({ preventScroll: true })
  }
}, { flush: 'post' })

// --- Pan bounds -----------------------------------------------------------
const bounds = useTemplateRef<HTMLDivElement>('bounds')
const imageBox = useTemplateRef<{ $el?: HTMLElement }>('imageBox')

function imageBoxElement() {
  const reference = imageBox.value
  if (reference instanceof HTMLElement) return reference
  return reference?.$el instanceof HTMLElement ? reference.$el : null
}

function measurePan() {
  const area = bounds.value
  const box = imageBoxElement()
  if (!area || !box) return
  const next = {
    x: Math.max(0, (box.clientWidth * 2 - area.clientWidth) / 2),
    y: Math.max(0, (box.clientHeight * 2 - area.clientHeight) / 2),
  }
  pan.value = next
  x.set(Math.max(-next.x, Math.min(next.x, x.get())))
  y.set(Math.max(-next.y, Math.min(next.y, y.get())))
}

watch([bounds, imageBox], (_, __, onCleanup) => {
  const area = bounds.value
  const box = imageBoxElement()
  if (!area || !box) return
  measurePan()
  const observer = new ResizeObserver(measurePan)
  observer.observe(area)
  observer.observe(box)
  onCleanup(() => observer.disconnect())
}, { flush: 'post' })

// --- Frame interaction ----------------------------------------------------
function onPanelPointerDown(event: PointerEvent) {
  const target = event.target
  if (target instanceof Element && !target.closest('button, a, input, select, textarea, [data-lightbox-content]')) {
    event.preventDefault()
    close()
  }
}

function onPanelKeyDown(event: KeyboardEvent) {
  if (
    (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]'))
    || event.defaultPrevented
    || event.altKey
    || event.ctrlKey
    || event.metaKey
    || event.shiftKey
  ) return
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    move(event.key === 'ArrowLeft' ? -1 : 1)
  }
}

function onImagePointerDown(event: PointerEvent) {
  // Swiping the image keeps keyboard focus on the controls.
  event.preventDefault()
  if (!zoom.value && event.isPrimary) swipe.value = { x: event.clientX, y: event.clientY }
}

function onImagePointerUp(event: PointerEvent) {
  const start = swipe.value
  swipe.value = null
  if (!start || zoom.value) return
  const dx = event.clientX - start.x
  const dy = event.clientY - start.y
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1)
}

function onImagePointerCancel() {
  swipe.value = null
}

function onImageError(event: Event) {
  const element = event.currentTarget
  if (!(element instanceof HTMLImageElement) || !open.value || !image.value) return
  if (element.getAttribute('src') !== image.value.src) return
  failed.value = true
}

function onZoomKeyDown(event: KeyboardEvent) {
  if (!zoom.value) return
  const dx = event.key === 'ArrowLeft' ? -40 : event.key === 'ArrowRight' ? 40 : 0
  const dy = event.key === 'ArrowUp' ? -40 : event.key === 'ArrowDown' ? 40 : 0
  if (!dx && !dy) return
  event.preventDefault()
  event.stopPropagation()
  x.set(Math.max(-pan.value.x, Math.min(pan.value.x, x.get() + dx)))
  y.set(Math.max(-pan.value.y, Math.min(pan.value.y, y.get() + dy)))
}

function toggleZoom() {
  x.set(0)
  y.set(0)
  zoom.value = !zoom.value
  if (reduce.value) scale.set(zoom.value ? 2 : 1)
  else animate(scale, zoom.value ? 2 : 1, layoutSpring)
}

// The first session opens while the panel is still hidden from focus order in
// the same commit; make sure the trap is installed once it is laid out.
watch(mounted, () => { void nextTick(() => { if (open.value && !scopeCleanup) startScope() }) })
</script>

<template>
    <Teleport v-if="mounted" to="body">
      <div ref="portal" class="be-lightbox-portal">
        <AnimatePresence>
          <div v-if="image" key="viewer" class="be-lightbox-viewer">
            <motion.button
              data-lightbox-gate
              type="button"
              tabindex="-1"
              aria-hidden="true"
              :initial="{ opacity: 0 }"
              :animate="{ opacity: 1 }"
              :exit="{ opacity: 0 }"
              :transition="{ duration: reduce ? 0.1 : 0.18, ease: easeOut }"
              class="be-lightbox-backdrop"
              @click="close" />

            <div data-lightbox-gate class="be-lightbox-stage">
              <div
                role="dialog"
                aria-modal="true"
                :aria-label="label"
                tabindex="-1"
                data-lightbox-gate
                class="be-lightbox-panel" v-bind="$attrs"
                @pointerdown.capture="onPanelPointerDown"
                @keydown="onPanelKeyDown">
                <div data-lightbox-content class="be-lightbox-header">
                  <slot name="header">
                    <ImageViewerCounter />
                    <ImageViewerClose />
                  </slot>
                </div>

                <div class="be-lightbox-frame">
                  <div ref="bounds" class="be-lightbox-bounds">
                    <motion.div
                      ref="imageBox"
                      data-lightbox-content
                      :layout-id="layoutId"
                      :transition="layoutSpring"
                      class="be-lightbox-image-box"
                      :style="{ aspectRatio: `${image.width} / ${image.height}`, width: imageWidth }">
                      <div class="be-lightbox-image-clip" :data-zoom="zoom || undefined">
                        <AnimatePresence :initial="false" :custom="{ direction, reduce }">
                          <motion.div
                            :key="session"
                            data-lightbox-slide
                            :data-session="session"
                            :custom="{ direction, reduce }"
                            :variants="imageSwapVariants"
                            initial="enter"
                            animate="visible"
                            exit="exit"
                            class="be-lightbox-slide">
                            <motion.img
                              :src="image.src"
                              :alt="image.alt"
                              :width="image.width"
                              :height="image.height"
                              :draggable="false"
                              drag
                              :drag-listener="zoom"
                              :drag-constraints="{ left: -pan.x, right: pan.x, top: -pan.y, bottom: pan.y }"
                              :drag-elastic="0.08"
                              :drag-momentum="false"
                              class="be-lightbox-image"
                              :style="{ x, y, scale, touchAction: zoom ? 'none' : 'pan-y', cursor: zoom ? 'grab' : undefined }"
                              @error="onImageError"
                              @pointerdown="onImagePointerDown"
                              @pointerup="onImagePointerUp"
                              @pointercancel="onImagePointerCancel" />
                          </motion.div>
                        </AnimatePresence>
                      </div>
                      <p v-if="failed" role="status" class="be-lightbox-error">{{ t.loadError }}</p>
                    </motion.div>
                  </div>

                  <button
                    type="button"
                    class="be-lightbox-control be-lightbox-zoom"
                    :aria-label="zoom ? t.zoomOut : t.zoomIn"
                    :aria-pressed="zoom"
                    :aria-describedby="panHelpId"
                    @keydown="onZoomKeyDown"
                    @click="toggleZoom">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path v-if="!zoom" d="M12 5v14" />
                    </svg>
                  </button>
                  <span :id="panHelpId" class="be-lightbox-sr">{{ t.panHelp }}</span>
                </div>

                <div data-lightbox-content class="be-lightbox-footer">
                  <slot>
                    <ImageViewerPrevious />
                    <ImageViewerCaption />
                    <ImageViewerNext />
                  </slot>
                </div>
              </div>
            </div>
          </div>
        </AnimatePresence>
      </div>
    </Teleport>
</template>

<style>
.be-lightbox-backdrop { position: fixed; inset: 0; z-index: 100; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; background: rgb(0 0 0 / .9); cursor: default; }
.be-lightbox-stage { pointer-events: none; position: fixed; inset: .75rem; z-index: 101; }
@media (min-width: 640px) { .be-lightbox-stage { inset: 1.5rem; } }
.be-lightbox-panel { box-sizing: border-box; display: flex; height: 100%; flex-direction: column; outline: none; pointer-events: auto; color: #fff; }
.be-lightbox-header { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding-bottom: .75rem; }
.be-lightbox-footer { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding-top: .75rem; }
.be-lightbox-frame { position: relative; display: flex; min-height: 0; flex: 1 1 0%; align-items: center; justify-content: center; }
.be-lightbox-bounds { display: flex; height: 100%; width: 100%; align-items: center; justify-content: center; overflow: hidden; border-radius: .5rem; }
.be-lightbox-image-box { position: relative; display: flex; max-height: 100%; max-width: 100%; align-items: center; justify-content: center; }
.be-lightbox-image-clip { position: absolute; inset: 0; }
.be-lightbox-image-clip:not([data-zoom]) { overflow: hidden; }
.be-lightbox-slide { position: absolute; inset: 0; }
.be-lightbox-image { display: block; height: 100%; width: 100%; user-select: none; -webkit-user-select: none; object-fit: contain; }
.be-lightbox-error { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; margin: 0; padding: 1rem; background: #171717; color: #fff; text-align: center; font-size: .875rem; line-height: 1.25rem; }
.be-lightbox-control.be-lightbox-zoom { position: absolute; right: .75rem; bottom: .75rem; background: rgb(0 0 0 / .6); }
.be-lightbox-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
</style>
