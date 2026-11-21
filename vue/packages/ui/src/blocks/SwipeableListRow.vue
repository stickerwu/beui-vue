<script setup lang="ts">
import { animate, motion, useMotionValue, type PanInfo } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, useId, useTemplateRef, watch } from 'vue'
import { formatMessage } from './messages'
import type {
  SwipeAction,
  SwipeableListActionPayload,
  SwipeableListClassNames,
  SwipeableListItem,
  SwipeableListValue,
  SwipeSide,
} from './SwipeableList.vue'

/**
 * One row of `SwipeableList`. Kept in its own component so the row owns its
 * drag motion value and pointer session, like the React `SwipeableListRow`.
 */

const props = defineProps<{
  item: SwipeableListItem
  index: number
  actionWidth: number
  revealThreshold: number
  openValue: SwipeableListValue | null
  closeOnAction: boolean
  classNames: SwipeableListClassNames
  labels: { actionsFor: string; showActions: string }
}>()

const emit = defineEmits<{
  action: [value: SwipeableListValue | null]
  run: [payload: SwipeableListActionPayload]
}>()

defineSlots<{
  default?(props: { item: SwipeableListItem; index: number }): unknown
  leading?(props: { item: SwipeableListItem; index: number }): unknown
  icon?(props: { action: SwipeAction; side: SwipeSide }): unknown
}>()

// Distance-based release spring keeps short rebounds and full reveals feeling
// equally direct, closer to native mobile list interactions.
const ROW_SETTLE = { type: 'spring', stiffness: 560, damping: 48, mass: 0.82, restDelta: 0.5, restSpeed: 8 } as const
const OPEN_DISTANCE_RATIO = 0.46
const CLOSE_DISTANCE_RATIO = 0.72
const OPEN_VELOCITY = 720
const CLOSE_VELOCITY = 320
const FLING_DISTANCE = 14
const RELEASE_VELOCITY_LIMIT = 1500

const reduce = useReducedMotion()
const rail = useTemplateRef<HTMLElement>('rail')
const toggle = useTemplateRef<HTMLButtonElement>('toggle')
// Set when the keyboard opens a side, so focus follows into its actions once
// the rail stops being inert.
let focusActions = false
let animation: { stop: () => void } | undefined
let commanded = 0
const x = useMotionValue(0)
const railId = useId()

const leftActions = computed(() => props.item.leftActions ?? [])
const rightActions = computed(() => props.item.rightActions ?? [])
const leftWidth = computed(() => leftActions.value.length * props.actionWidth)
const rightWidth = computed(() => rightActions.value.length * props.actionWidth)
const openSide = computed<SwipeSide | null>(() => (props.openValue?.id === props.item.id ? props.openValue.side : null))
const targetX = computed(() => (openSide.value === 'left' ? leftWidth.value : openSide.value === 'right' ? -rightWidth.value : 0))
const hasActions = computed(() => leftWidth.value > 0 || rightWidth.value > 0)

function setOpen(side: SwipeSide | null) {
  emit('action', side ? { id: props.item.id, side } : null)
}

function clampReleaseVelocity(velocity: number) {
  return Math.max(-RELEASE_VELOCITY_LIMIT, Math.min(RELEASE_VELOCITY_LIMIT, velocity))
}

function settleX(nextX: number, velocity = 0) {
  commanded = nextX
  animation?.stop()
  if (reduce.value) {
    x.set(nextX)
    return
  }
  animation = animate(x, nextX, { ...ROW_SETTLE, velocity: clampReleaseVelocity(velocity), onComplete: () => x.set(nextX) })
}

function getTargetX(side: SwipeSide | null) {
  return side === 'left' ? leftWidth.value : side === 'right' ? -rightWidth.value : 0
}

function snapTo(side: SwipeSide | null, velocity = 0) {
  setOpen(side)
  settleX(getTargetX(side), velocity)
}

// Follow a value that changed elsewhere — opening another row, or a controlled
// parent clearing the reveal — without echoing back the move we just started.
watch(targetX, next => {
  if (commanded === next) return
  settleX(next)
})
// After the commit, since the rail only becomes focusable once `inert` is gone.
watch(openSide, side => {
  if (!side || !focusActions) return
  focusActions = false
  rail.value?.querySelector<HTMLButtonElement>(`[data-side="${side}"] button:not(:disabled)`)?.focus()
}, { flush: 'post' })

function onDragStart() {
  animation?.stop()
  if (props.openValue && props.openValue.id !== props.item.id) setOpen(null)
}

function onDragEnd(_event: PointerEvent, info: PanInfo) {
  const velocity = info.velocity.x
  const latest = x.get()
  const leftOpenThreshold = Math.max(props.revealThreshold, leftWidth.value * OPEN_DISTANCE_RATIO)
  const rightOpenThreshold = Math.max(props.revealThreshold, rightWidth.value * OPEN_DISTANCE_RATIO)

  if (openSide.value === 'left') {
    if (latest < leftWidth.value * CLOSE_DISTANCE_RATIO || velocity < -CLOSE_VELOCITY) {
      snapTo(null, velocity)
      return
    }
    snapTo('left', velocity)
    return
  }
  if (openSide.value === 'right') {
    if (Math.abs(latest) < rightWidth.value * CLOSE_DISTANCE_RATIO || velocity > CLOSE_VELOCITY) {
      snapTo(null, velocity)
      return
    }
    snapTo('right', velocity)
    return
  }
  if (leftWidth.value > 0 && latest > 0 && (latest > leftOpenThreshold || (velocity > OPEN_VELOCITY && latest > FLING_DISTANCE))) {
    snapTo('left', velocity)
    return
  }
  if (rightWidth.value > 0 && latest < 0 && (latest < -rightOpenThreshold || (velocity < -OPEN_VELOCITY && latest < -FLING_DISTANCE))) {
    snapTo('right', velocity)
    return
  }
  snapTo(null, velocity)
}

function openFromKeyboard(side: SwipeSide) {
  if ((side === 'left' ? leftWidth.value : rightWidth.value) === 0) return
  focusActions = true
  snapTo(side)
}

// Keyboard stand-in for the swipe: the arrow keys move the row the way a swipe
// would, and Escape closes.
function onToggleKeyDown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    if (openSide.value === 'left') snapTo(null)
    else openFromKeyboard('right')
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    if (openSide.value === 'right') snapTo(null)
    else openFromKeyboard('left')
  } else if (event.key === 'Escape' && openSide.value) {
    event.preventDefault()
    snapTo(null)
  }
}

function onRailKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  event.preventDefault()
  toggle.value?.focus()
  snapTo(null)
}

function runAction(action: SwipeAction, side: SwipeSide) {
  action.onClick?.(props.item)
  emit('run', { item: props.item, action, side })
  if (!props.closeOnAction) return
  // The rail turns inert as the row closes; keep focus on the row.
  if (rail.value?.contains(document.activeElement)) toggle.value?.focus()
  snapTo(null)
}

function toggleClick() {
  if (openSide.value) snapTo(null)
  else openFromKeyboard(rightWidth.value > 0 ? 'right' : 'left')
}

const actionsFor = computed(() => (props.item.title
  ? formatMessage(props.labels.actionsFor, { title: props.item.title })
  : props.labels.showActions))

onBeforeUnmount(() => {
  animation?.stop()
})
</script>

<template>
  <div class="swipe-item" :class="[classNames.item, { 'is-disabled': item.disabled }]">
    <div ref="rail" :id="railId" class="swipe-rail" :class="classNames.rail"
      :aria-hidden="openSide ? undefined : 'true'" :inert="openSide ? undefined : true" @keydown="onRailKeyDown">
      <div data-side="left" class="swipe-side is-left">
        <button v-for="action in leftActions" :key="action.id" type="button" class="swipe-action" :class="classNames.action"
          :disabled="action.disabled" :tabindex="openSide === 'left' ? 0 : -1" :aria-label="action.label"
          :data-tone="action.tone ?? 'neutral'" :style="{ width: `${actionWidth}px` }" @click="runAction(action, 'left')">
          <span class="swipe-action-bubble"><slot name="icon" :action="action" :side="'left'">{{ action.icon ?? action.label.slice(0, 1) }}</slot></span>
          <span class="swipe-sr">{{ action.label }}</span>
        </button>
      </div>
      <div data-side="right" class="swipe-side is-right">
        <button v-for="action in rightActions" :key="action.id" type="button" class="swipe-action" :class="classNames.action"
          :disabled="action.disabled" :tabindex="openSide === 'right' ? 0 : -1" :aria-label="action.label"
          :data-tone="action.tone ?? 'neutral'" :style="{ width: `${actionWidth}px` }" @click="runAction(action, 'right')">
          <span class="swipe-action-bubble"><slot name="icon" :action="action" :side="'right'">{{ action.icon ?? action.label.slice(0, 1) }}</slot></span>
          <span class="swipe-sr">{{ action.label }}</span>
        </button>
      </div>
    </div>

    <motion.div class="swipe-surface" :class="classNames.surface" :drag="item.disabled ? false : 'x'"
      :drag-constraints="{ left: -rightWidth, right: leftWidth }" :drag-elastic="0.04" :drag-momentum="false"
      :style="{ x }" @drag-start="onDragStart" @drag-end="onDragEnd">
      <slot :item="item" :index="index">
        <span v-if="item.content" class="swipe-raw">{{ item.content }}</span>
        <div v-else class="swipe-row-content">
          <div v-if="item.leading || $slots.leading" class="swipe-leading" :class="classNames.leading"><slot name="leading" :item="item" :index="index">{{ item.leading }}</slot></div>
          <div class="swipe-body" :class="classNames.content">
            <div v-if="item.title" class="swipe-title" :class="classNames.title">{{ item.title }}</div>
            <div v-if="item.description" class="swipe-description" :class="classNames.description">{{ item.description }}</div>
          </div>
          <div v-if="item.meta" class="swipe-meta" :class="classNames.meta">{{ item.meta }}</div>
        </div>
      </slot>
      <button v-if="hasActions && !item.disabled" ref="toggle" type="button" class="swipe-toggle" :aria-label="actionsFor"
        :aria-expanded="openSide !== null" :aria-controls="railId" @click="toggleClick" @keydown="onToggleKeyDown">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
      </button>
    </motion.div>
  </div>
</template>

<style scoped>
.swipe-item {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: 1rem;
  background: var(--beui-muted);
}
.swipe-item.is-disabled { opacity: .6; }

.swipe-rail {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  overflow: hidden;
  border-radius: 1rem;
}
.swipe-side { display: flex; height: 100%; overflow: hidden; }
.swipe-side.is-left { border-start-start-radius: 1rem; border-end-start-radius: 1rem; }
.swipe-side.is-right { margin-inline-start: auto; border-start-end-radius: 1rem; border-end-end-radius: 1rem; }

.swipe-action {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--beui-muted-foreground);
  font: inherit;
  outline: none;
  cursor: pointer;
}
.swipe-action:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: -2px; }
.swipe-action:disabled { pointer-events: none; opacity: .5; }
.swipe-action-bubble {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  color: inherit;
  font-size: .875rem;
  transition: background-color .15s, color .15s, transform .15s;
}
.swipe-action:hover .swipe-action-bubble { background: var(--beui-background); }
.swipe-action:active .swipe-action-bubble { transform: scale(.95); }
.swipe-action[data-tone='neutral'] { color: var(--beui-muted-foreground); }
.swipe-action[data-tone='neutral']:hover { color: var(--beui-foreground); }
.swipe-action[data-tone='primary'] { color: var(--beui-foreground); }
.swipe-action[data-tone='danger'] { color: var(--beui-destructive); }
/* The theme has no success/warning tokens yet; both fall back to the emerald/amber
   hues of the original, which the host can override without patching the component. */
.swipe-action[data-tone='success'] { color: var(--beui-success, #059669); }
.swipe-action[data-tone='warning'] { color: var(--beui-warning, #d97706); }
:global(:is(.dark, [data-beui-theme='dark']) .swipe-action[data-tone='success']) { color: var(--beui-success, #34d399); }
:global(:is(.dark, [data-beui-theme='dark']) .swipe-action[data-tone='warning']) { color: var(--beui-warning, #fbbf24); }

.swipe-surface {
  position: relative;
  z-index: 10;
  min-height: 72px;
  padding: .75rem 1rem;
  border: 1px solid var(--beui-border);
  border-radius: 1rem;
  background: var(--beui-card);
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1);
  cursor: grab;
  /* `pan-y`, not `none`: the row owns the horizontal swipe, the page keeps the
     vertical scroll through it. */
  touch-action: pan-y;
  -webkit-touch-callout: none;
}
.swipe-surface:active { cursor: grabbing; }
/* Selection is only suppressed where the platform runs its own press
   gestures, so a mouse can still select and copy the row's text. */
@media (pointer: coarse) { .swipe-surface { user-select: none; } }

.swipe-raw { display: block; }
.swipe-row-content { display: flex; min-width: 0; align-items: center; gap: .75rem; }
.swipe-leading { flex: none; }
.swipe-body { min-width: 0; flex: 1; }
.swipe-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.swipe-description { margin-top: .125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.swipe-meta { flex: none; font-size: .75rem; line-height: 1rem; font-weight: 500; color: var(--beui-muted-foreground); }

/* Only visible while focused from the keyboard; pointers swipe. */
.swipe-toggle {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  border: 0;
  background: transparent;
}
.swipe-toggle svg { width: 1rem; height: 1rem; fill: currentColor; }
.swipe-toggle:focus-visible {
  top: 50%;
  right: .75rem;
  width: 2rem;
  height: 2rem;
  overflow: visible;
  clip-path: none;
  display: grid;
  place-items: center;
  translate: 0 -50%;
  border-radius: 50%;
  background: var(--beui-muted);
  color: var(--beui-muted-foreground);
  outline: 2px solid var(--beui-ring);
  outline-offset: 2px;
}

.swipe-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
