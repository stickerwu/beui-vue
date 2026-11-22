<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const pullToRefreshMessages = {
  pulling: 'Pull to refresh',
  release: 'Release to refresh',
  refreshing: 'Refreshing',
  label: 'Refreshable content',
}
export type PullToRefreshMessages = typeof pullToRefreshMessages
export type PullToRefreshStatus = 'idle' | 'pulling' | 'ready' | 'refreshing'
</script>

<script setup lang="ts">
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watchEffect } from 'vue'
import { easeInOut, easeOut, panelSpring, swapSpring } from '../core/motion'

const props = withDefaults(defineProps<{
  /** Runs after the user pulls beyond the threshold and releases. A prop rather than an event, because the pull waits for the returned promise. */
  onRefresh: () => void | Promise<void>
  /** Keeps the indicator active while an externally managed refresh runs. */
  refreshing?: boolean
  disabled?: boolean
  /** Resisted pull distance in pixels required to refresh. */
  threshold?: number
  /** Maximum resisted pull distance in pixels. */
  maxPull?: number
  /** Content offset in pixels while refreshing. */
  holdDistance?: number
  /** Text shown while pulling. The `pullingLabel` slot takes over for rich content. */
  pullingLabel?: string
  /** Text shown once the pull passes the threshold. The `releaseLabel` slot takes over for rich content. */
  releaseLabel?: string
  /** Text shown while refreshing. The `refreshingLabel` slot takes over for rich content. */
  refreshingLabel?: string
  ariaLabel?: string
  /** Accessible name of the keyboard refresh button. */
  label?: string
  labels?: Partial<typeof pullToRefreshMessages>
  /** Same as `class`. */
  className?: string
  contentClassName?: string
  indicatorClassName?: string
}>(), { refreshing: false, disabled: false, threshold: 76, maxPull: 132, holdDistance: 68 })

const emit = defineEmits<{ error: [reason: unknown] }>()

defineSlots<{
  default?(props: { refresh: () => Promise<void>; state: PullToRefreshStatus }): unknown
  /** Label while pulling; replaces `pullingLabel`. */
  pullingLabel?(): unknown
  /** Label once the pull passes the threshold; replaces `releaseLabel`. */
  releaseLabel?(): unknown
  /** Label while refreshing; replaces `refreshingLabel`. */
  refreshingLabel?(): unknown
}>()

const text = computed(() => ({ ...pullToRefreshMessages, ...props.labels }))

type Gesture = { active: boolean; startX: number; startY: number; pointerId: number | null }
const EMPTY_GESTURE: Gesture = { active: false, startX: 0, startY: 0, pointerId: null }

// This character needs a compact repeating rhythm rather than a settling
// spring: a small orbit and blink that read as activity without feeling busy.
const CHARACTER_LOOP = { duration: 0.9, ease: easeInOut, repeat: Number.POSITIVE_INFINITY } as const
const CALM_PULSE = { duration: 1.2, ease: easeInOut, repeat: Number.POSITIVE_INFINITY } as const
const LABEL_SWAP = { duration: 0.16, ease: easeOut } as const

const dragThreshold = computed(() => Math.max(24, props.threshold))
const pullLimit = computed(() => Math.max(props.maxPull, dragThreshold.value + 24))
const restingDistance = computed(() => Math.min(Math.max(0, props.holdDistance), dragThreshold.value))

// The pull resists as it grows, so a long drag never tears the page apart.
const resistedDistance = (distance: number, maxPull: number) => maxPull * (1 - Math.exp(-Math.max(0, distance) / maxPull))

const reduce = useReducedMotion()
const root = useTemplateRef<HTMLElement>('root')

const status = shallowRef<PullToRefreshStatus>('idle')
const internalRefreshing = shallowRef(false)
const isRefreshing = computed(() => props.refreshing || internalRefreshing.value)

const y = useMotionValue(0)
const progress = useTransform(y, [0, dragThreshold.value], [0, 1])
const indicatorOpacity = useTransform(y, [0, 10, dragThreshold.value], [0, 0.45, 1])
const indicatorScale = useTransform(y, [0, dragThreshold.value], [0.86, 1])

const lift = useTransform(progress, [0, 1], [-7, 0])
const tilt = useTransform(progress, [0, 1], [-10, 0])
const stretch = useTransform(progress, [0, 0.55, 1], [0.68, 1.1, 0.92])

// Live props are read by the native listeners installed once on mount.
let disabledNow = props.disabled
let refreshingNow = isRefreshing.value
let liveThreshold = dragThreshold.value
let liveRest = restingDistance.value

let gesture: Gesture = { ...EMPTY_GESTURE }
let animation: { stop: () => void } | undefined

function settle(target: number) {
  animation?.stop()
  if (reduce.value) {
    y.set(target)
    return
  }
  animation = animate(y, target, panelSpring)
}

function updatePull(distance: number) {
  if (disabledNow || refreshingNow) return
  animation?.stop()
  const next = resistedDistance(distance, pullLimit.value)
  y.set(next)
  status.value = next >= liveThreshold ? 'ready' : 'pulling'
}

async function runRefresh() {
  if (disabledNow || refreshingNow) return
  internalRefreshing.value = true
  status.value = 'refreshing'
  settle(liveRest)
  try {
    await props.onRefresh()
  } catch (reason) {
    emit('error', reason)
  } finally {
    internalRefreshing.value = false
    // A synchronous refresh can resolve before the prop watcher runs, so release
    // here instead of relying only on it.
    if (!props.refreshing) {
      status.value = 'idle'
      settle(0)
    }
  }
}

function finishPull() {
  const shouldRefresh = y.get() >= liveThreshold && !disabledNow && !refreshingNow
  gesture = { ...EMPTY_GESTURE }
  if (shouldRefresh) {
    void runRefresh()
    return
  }
  status.value = 'idle'
  settle(0)
}

/* ---- native touch: the only path that can stop the page scroll ----------- */

function onTouchStart(event: TouchEvent) {
  const rootNode = root.value
  if (!rootNode || event.touches.length !== 1 || rootNode.scrollTop > 0 || disabledNow || refreshingNow) return
  const touch = event.touches[0]!
  gesture = { active: true, startX: touch.clientX, startY: touch.clientY, pointerId: null }
}

function onTouchMove(event: TouchEvent) {
  const rootNode = root.value
  const touch = event.touches[0]
  if (!gesture.active || !touch || !rootNode) return
  const deltaX = touch.clientX - gesture.startX
  const deltaY = touch.clientY - gesture.startY
  if (rootNode.scrollTop > 0 || deltaY < 0) {
    gesture = { ...EMPTY_GESTURE }
    return
  }
  if (Math.abs(deltaX) > deltaY) return
  if (event.cancelable) event.preventDefault()
  updatePull(deltaY)
}

function onTouchEnd() {
  if (gesture.active) finishPull()
}

onMounted(() => {
  const rootNode = root.value
  if (!rootNode) return
  rootNode.addEventListener('touchstart', onTouchStart, { passive: true })
  rootNode.addEventListener('touchmove', onTouchMove, { passive: false })
  rootNode.addEventListener('touchend', onTouchEnd)
  rootNode.addEventListener('touchcancel', onTouchEnd)
})

/* ---- pointer path for mouse and pen ------------------------------------- */

function capturePointer(element: Element, pointerId: number) {
  // WebKit throws when the pointer is already gone; touch pointers carry
  // implicit capture, so losing it is never fatal.
  try { (element as HTMLElement).setPointerCapture(pointerId) } catch {}
}

function startPointerPull(event: PointerEvent) {
  // Everything but touch: a finger is driven by the native listeners above,
  // which can preventDefault the page scroll. A pen fires no touch events at
  // all, so this is its only route.
  const target = event.currentTarget as HTMLElement
  if (event.pointerType === 'touch' || event.button !== 0 || target.scrollTop > 0 || disabledNow || refreshingNow) return
  capturePointer(target, event.pointerId)
  gesture = { active: true, startX: event.clientX, startY: event.clientY, pointerId: event.pointerId }
}

function movePointerPull(event: PointerEvent) {
  if (!gesture.active || gesture.pointerId !== event.pointerId) return
  const deltaX = event.clientX - gesture.startX
  const deltaY = event.clientY - gesture.startY
  if (deltaY < 0 || Math.abs(deltaX) > deltaY) return
  event.preventDefault()
  updatePull(deltaY)
}

function endPointerPull(event: PointerEvent) {
  if (gesture.pointerId !== event.pointerId) return
  finishPull()
}

/* ---- prop mirroring ----------------------------------------------------- */

// Mirrors live props into the plain fields the native touch listeners read, and
// drives the indicator while an externally managed refresh runs.
watchEffect(() => {
  disabledNow = props.disabled
  refreshingNow = isRefreshing.value
  liveThreshold = dragThreshold.value
  liveRest = restingDistance.value
  if (isRefreshing.value) {
    status.value = 'refreshing'
    settle(liveRest)
    return
  }
  if (status.value === 'refreshing') {
    status.value = 'idle'
    settle(0)
  }
})

const accessibleLabel = computed(() => props.label ?? props.ariaLabel ?? text.value.label)
const canRefresh = computed(() => !props.disabled && !isRefreshing.value)

function onKeyRefresh() {
  if (!canRefresh.value) return
  void runRefresh()
}

onBeforeUnmount(() => {
  animation?.stop()
  const rootNode = root.value
  if (!rootNode) return
  rootNode.removeEventListener('touchstart', onTouchStart)
  rootNode.removeEventListener('touchmove', onTouchMove)
  rootNode.removeEventListener('touchend', onTouchEnd)
  rootNode.removeEventListener('touchcancel', onTouchEnd)
})
</script>

<template>
  <section
    ref="root"
    class="pull-refresh"
    :class="[className, { 'is-dragging': status === 'pulling' || status === 'ready', 'is-off': !canRefresh }]"
    :aria-label="props.ariaLabel ?? text.label"
    :aria-busy="isRefreshing"
    :data-state="status"
    :data-disabled="disabled || undefined"
    @pointerdown="startPointerPull"
    @pointermove="movePointerPull"
    @pointerup="endPointerPull"
    @pointercancel="endPointerPull">
    <motion.div
      class="pull-indicator"
      :class="indicatorClassName"
      aria-live="polite"
      aria-atomic="true"
      :style="reduce ? { opacity: indicatorOpacity } : { opacity: indicatorOpacity, scale: indicatorScale }">
      <!-- The mascot lifts, tilts and stretches with the pull, then orbits while
           a refresh runs. -->
      <motion.span class="buddy" :style="reduce ? undefined : { y: lift, rotate: tilt, scaleY: stretch }">
        <motion.svg
          aria-hidden="true"
          viewBox="0 0 36 36"
          class="buddy-svg"
          :animate="status === 'refreshing'
            ? (reduce ? { opacity: [0.55, 1, 0.55] } : { y: [0, -2, 0], rotate: [-3, 3, -3] })
            : (reduce ? { opacity: 1 } : { y: 0, rotate: 0, scale: status === 'ready' ? 1.08 : 1 })"
          :transition="status === 'refreshing' ? (reduce ? CALM_PULSE : CHARACTER_LOOP) : swapSpring">
          <motion.g
            class="buddy-orbit"
            :class="{ 'is-on': status === 'ready' || status === 'refreshing' }"
            :style="{ transformOrigin: '18px 18px' }"
            :animate="status === 'refreshing' && !reduce ? { rotate: [0, 360] } : (reduce ? undefined : { rotate: status === 'ready' ? 0 : -35 })"
            :transition="status === 'refreshing' ? (reduce ? CALM_PULSE : CHARACTER_LOOP) : swapSpring">
            <path d="M18 2.5a15.5 15.5 0 0 1 12.7 6.6" class="buddy-arc" />
            <circle cx="31.3" cy="10.2" r="2.2" class="buddy-ink" />
          </motion.g>

          <rect x="7" y="7" width="22" height="22" rx="9" class="buddy-ink" />

          <motion.g
            :style="{ opacity: 1, transformOrigin: '18px 16px' }"
            :animate="status === 'refreshing' && !reduce
              ? { scaleY: [1, 1, 0.15, 1, 1] }
              : (reduce ? { opacity: 1 } : { scaleY: status === 'ready' ? 1.18 : 1 })"
            :transition="status === 'refreshing' && !reduce ? CHARACTER_LOOP : swapSpring">
            <circle cx="14.2" cy="16" r="1.45" class="buddy-eye" />
            <circle cx="21.8" cy="16" r="1.45" class="buddy-eye" />
          </motion.g>

          <path d="M14.5 21h7" class="buddy-mouth is-idle" :class="{ 'is-hidden': status === 'ready' || status === 'refreshing' }" />
          <path d="M14 20.5c1 2.4 7 2.4 8 0" class="buddy-mouth" :class="{ 'is-hidden': status !== 'ready' }" />
          <circle cx="18" cy="21" r="1.6" class="buddy-eye buddy-nose" :class="{ 'is-hidden': status !== 'refreshing' }" />
        </motion.svg>
      </motion.span>
      <span class="buddy-label">
        <AnimatePresence :initial="false" mode="wait">
          <motion.span
            :key="status"
            class="buddy-label-text"
            :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 3 }"
            :animate="reduce ? { opacity: 1 } : { opacity: 1, y: 0 }"
            :exit="reduce ? { opacity: 0 } : { opacity: 0, y: -3 }"
            :transition="LABEL_SWAP">
            <slot v-if="status === 'refreshing'" name="refreshingLabel">{{ refreshingLabel ?? text.refreshing }}</slot>
            <slot v-else-if="status === 'ready'" name="releaseLabel">{{ releaseLabel ?? text.release }}</slot>
            <slot v-else name="pullingLabel">{{ pullingLabel ?? text.pulling }}</slot>
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.div>

    <motion.div class="pull-content" :class="contentClassName" :style="reduce ? undefined : { y }">
      <slot :refresh="runRefresh" :state="status" />
    </motion.div>

    <!-- The pull is a pointer gesture; this is its keyboard path. -->
    <button type="button" class="pull-keyboard" :aria-label="accessibleLabel" :disabled="!canRefresh" @click="onKeyRefresh">
      {{ accessibleLabel }}
    </button>
  </section>
</template>

<style scoped>
.pull-refresh {
  position: relative;
  width: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--beui-background);
  /* `touch-action` stays default: this element is the scroller, and the pull
     only takes over once the content is already at the top. */
  -webkit-touch-callout: none;
  cursor: grab;
}
@media (pointer: coarse) { .pull-refresh { user-select: none; } }
.pull-refresh.is-dragging { cursor: grabbing; }
.pull-refresh.is-off { cursor: default; }

.pull-indicator {
  pointer-events: none;
  position: absolute;
  inset-inline: 0;
  top: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .125rem;
  height: 4.25rem;
  font-size: 11px;
  font-weight: 500;
  color: var(--beui-muted-foreground);
  background: linear-gradient(to bottom, var(--beui-background), color-mix(in srgb, var(--beui-background) 95%, transparent), transparent);
}

.buddy { display: block; width: 2.25rem; height: 2.25rem; transform-origin: bottom; }
.buddy-svg { display: block; width: 100%; height: 100%; overflow: visible; }
.buddy-orbit { opacity: 0; transition: opacity .15s cubic-bezier(.4, 0, .2, 1); }
.buddy-orbit.is-on { opacity: 1; }
.buddy-arc { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; color: var(--beui-muted-foreground); }
.buddy-ink { fill: var(--beui-foreground); }
.buddy-eye { fill: var(--beui-background); }
.buddy-mouth { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; color: var(--beui-background); }
.buddy-mouth, .buddy-nose { transition: opacity .15s cubic-bezier(.4, 0, .2, 1); }
.is-hidden { opacity: 0; }

.buddy-label { position: relative; display: block; height: 1rem; min-width: 6rem; text-align: center; }
.buddy-label-text { position: absolute; inset-inline: 0; white-space: nowrap; }

.pull-content { position: relative; z-index: 10; min-height: 100%; background: inherit; will-change: transform; }

.pull-keyboard {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
  padding: 0;
  background: transparent;
}
.pull-keyboard:focus-visible {
  top: .5rem;
  left: .5rem;
  width: auto;
  height: auto;
  overflow: visible;
  clip-path: none;
  padding: .375rem .75rem;
  border: 1px solid var(--beui-border);
  border-radius: .5rem;
  background: var(--beui-card);
  color: var(--beui-foreground);
  font: inherit;
  font-size: .75rem;
}
</style>
