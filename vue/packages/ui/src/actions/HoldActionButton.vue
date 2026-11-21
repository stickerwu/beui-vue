<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, shallowRef, useSlots, watch } from 'vue'
import { easeOut, pressSpring } from '../core/motion'
import { capturePointer, releasePointer } from '../core/touch'
import { holdActionButtonMessages, type HoldActionButtonMessages } from './hold-action-messages'

const props = withDefaults(defineProps<{
  /** Fill direction: bottom-up, or left-to-right. */
  type?: 'vertical' | 'horizontal'
  /** Alias kept for the existing Vue demos and docs: `horizontal` fills left-to-right. */
  direction?: 'vertical' | 'horizontal'
  holdingLabel?: string
  completeLabel?: string
  /** How long the fill takes to cross the button, in ms. */
  holdDuration?: number
  fillClassName?: string
  labelClassName?: string
  disabled?: boolean
  className?: string
  /** Override any built-in string. */
  labels?: Partial<HoldActionButtonMessages>
}>(), { type: 'vertical', holdDuration: 1600 })

const emit = defineEmits<{ holdComplete: [] }>()
const fillType = computed(() => props.direction ?? props.type)
const slots = useSlots()

const reduce = useReducedMotion()
const text = computed(() => ({ ...holdActionButtonMessages, ...props.labels }))
const holding = shallowRef(false)
const completed = shallowRef(false)
// React keeps this in a ref so the fill's completion callback cannot fire twice
// for one hold. A plain flag is enough here for the same reason.
let completedOnce = false

function startHold() {
  if (props.disabled || holding.value) return
  completedOnce = false
  completed.value = false
  holding.value = true
}
function cancelHold() {
  holding.value = false
  completed.value = false
}

function pointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  // Start first: capture is a convenience, and a browser that refuses it must
  // not take the hold down with it.
  startHold()
  capturePointer(event.currentTarget as Element, event.pointerId)
}
function pointerUp(event: PointerEvent) {
  releasePointer(event.currentTarget as Element, event.pointerId)
  cancelHold()
}
function pointerLeave(event: PointerEvent) {
  // Only reached when the capture was refused: a captured pointer gets no
  // boundary events at all. A finger does not get this reading either way —
  // WebKit fires leave repeatedly for a touch that never moved, which would
  // cancel every hold on the frame it started.
  if (event.pointerType === 'touch') return
  // Chrome fires a boundary `pointerleave` at the capture target as the capture
  // is taken; before that is settled, a leave is only real when the pointer is
  // actually off the button.
  if ((event.currentTarget as Element).hasPointerCapture?.(event.pointerId)) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) cancelHold()
}
function pointerMove(event: PointerEvent) {
  // Leaving the button abandons the hold, and while the pointer is captured
  // nothing announces that: no boundary events, and `touch-action: none` means
  // a finger sliding off cannot scroll and so cannot cancel either. Measure it
  // instead — off the button ends the hold, wherever the pointer then goes.
  if (!holding.value) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) cancelHold()
}
function keyDown(event: KeyboardEvent) {
  if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
    event.preventDefault()
    startHold()
  }
}
function keyUp(event: KeyboardEvent) {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    cancelHold()
  }
}
function blur() {
  // A key held while focus leaves never delivers its keyup here.
  cancelHold()
}
function fillComplete() {
  if (!holding.value || completedOnce) return
  completedOnce = true
  completed.value = true
  emit('holdComplete')
}

watch(() => props.disabled, (value: boolean) => { if (value) cancelHold() })
onBeforeUnmount(cancelHold)

const active = computed(() => holding.value || completed.value)

// The fill is a CSS transition, not a keyframe run: the same linear ramp the
// original gets from a one-shot tween, but interruptible the instant the
// gesture ends, and the browser reports the end for us.
const fillDuration = computed(() => (active.value ? props.holdDuration : (reduce.value ? 150 : 240)))
const fillEase = computed(() => (active.value ? 'linear' : 'cubic-bezier(0.16, 1, 0.3, 1)'))
const fillStyle = computed(() => {
  if (reduce.value) {
    return {
      opacity: active.value ? 1 : 0,
      transform: 'none',
      transition: `opacity ${fillDuration.value}ms ${fillEase.value}`,
    }
  }
  return {
    opacity: 1,
    transform: active.value
      ? 'translate(0%)'
      : (fillType.value === 'horizontal' ? 'translateX(-100%)' : 'translateY(115%)'),
    transition: `transform ${fillDuration.value}ms ${fillEase.value}`,
  }
})
function fillEnd(event: TransitionEvent) {
  if (event.propertyName !== 'transform' && event.propertyName !== 'opacity') return
  if (!active.value) return
  fillComplete()
}

// The label is only a name when the slot is a plain string; a node label has to
// read itself, exactly as the original leaves `aria-label` undefined there.
const accessibleName = computed(() => {
  const nodes = slots.default?.() ?? []
  const [first] = nodes
  return nodes.length === 1 && typeof first?.children === 'string' ? first.children : undefined
})
</script>

<template>
  <motion.button
    type="button"
    :disabled="disabled"
    :aria-label="accessibleName"
    class="be-hold"
    :class="className"
    :while-press="reduce || disabled ? undefined : { scale: .98 }"
    :transition="pressSpring"
    @pointerdown="pointerDown"
    @pointermove="pointerMove"
    @pointerup="pointerUp"
    @pointercancel="cancelHold"
    @pointerleave="pointerLeave"
    @keydown="keyDown"
    @keyup="keyUp"
    @blur="blur"
    @contextmenu.prevent
  >
    <!-- Safari hands the fill its own compositing layer and then stops applying
         the button's rounded overflow clip to it, so the liquid bleeds past the
         corners. clip-path survives compositing. It lives on this static layer
         rather than the button so it never cuts the focus ring. -->
    <span aria-hidden="true" class="be-hold-clip">
      <span aria-hidden="true" class="be-hold-fill" :class="fillClassName" :style="fillStyle" @transitionend="fillEnd">
        <!-- A band of liquid rides the fill's edge while it is held. -->
        <svg
          v-if="holding && !reduce && fillType === 'horizontal'"
          viewBox="0 0 24 240"
          preserveAspectRatio="none"
          aria-hidden="true"
          class="be-hold-wave be-hold-wave-horizontal"
        >
          <path d="M0 0h12C2 20 2 40 12 60s10 40 0 60-10 40 0 60 10 40 0 60H0Z" fill="currentColor" />
        </svg>
        <svg
          v-else-if="holding && !reduce"
          viewBox="0 0 240 24"
          preserveAspectRatio="none"
          aria-hidden="true"
          class="be-hold-wave be-hold-wave-vertical"
        >
          <path d="M0 12C20 2 40 2 60 12s40 10 60 0 40-10 60 0 40 10 60 0v12H0Z" fill="currentColor" />
        </svg>
      </span>
    </span>

    <span class="be-hold-label" :class="labelClassName">
      <motion.span
        class="be-hold-slot"
        :animate="{ opacity: active ? 0 : 1 }"
        :transition="{ duration: reduce ? 0 : .12, ease: easeOut }"
      ><slot /></motion.span>
      <motion.span
        class="be-hold-slot"
        :aria-hidden="!(holding && !completed)"
        :animate="{ opacity: holding && !completed ? 1 : 0 }"
        :transition="{ duration: reduce ? 0 : .12, ease: easeOut }"
      >{{ holdingLabel ?? text.holding }}</motion.span>
      <motion.span
        class="be-hold-slot"
        :aria-hidden="!completed"
        :animate="{ opacity: completed ? 1 : 0 }"
        :transition="{ duration: reduce ? 0 : .12, ease: easeOut }"
      >{{ completeLabel ?? text.complete }}</motion.span>
    </span>
  </motion.button>
</template>

<style scoped>
.be-hold {
  --hold-radius: 22px;
  position: relative; display: inline-grid; box-sizing: border-box; place-items: center;
  width: auto; height: 4rem; min-width: 18rem; overflow: hidden; padding-inline: 2rem;
  border: 0; border-radius: var(--hold-radius); background: var(--beui-primary);
  color: var(--beui-primary-foreground, #fff); font: inherit; cursor: pointer; outline: none;
  touch-action: none; -webkit-touch-callout: none; user-select: none; -webkit-user-select: none;
}
.be-hold:focus-visible { box-shadow: 0 0 0 2px var(--beui-primary), 0 0 0 4px var(--beui-background); }
.be-hold:disabled { pointer-events: none; opacity: .5; }
.be-hold-clip {
  pointer-events: none; position: absolute; inset: 0;
  clip-path: inset(0 round var(--hold-radius));
}
.be-hold-fill {
  position: absolute; inset: 0; background: oklch(74.6% .16 232.661); will-change: opacity, transform;
}
.be-hold-wave { position: absolute; color: oklch(74.6% .16 232.661); will-change: transform; }
.be-hold-wave-vertical { left: 0; top: -1.25rem; width: 200%; height: 1.5rem; animation: be-hold-wave-y 1.1s linear infinite; }
.be-hold-wave-horizontal { top: 0; right: -1.25rem; width: 1.5rem; height: 200%; animation: be-hold-wave-x 1.1s linear infinite; }
@keyframes be-hold-wave-y { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes be-hold-wave-x { from { transform: translateY(0); } to { transform: translateY(-50%); } }
@media (prefers-reduced-motion: reduce) { .be-hold-wave { display: none; } }
.be-hold-label {
  position: relative; z-index: 10; display: grid; place-items: center;
  font-size: 1rem; font-weight: 500; letter-spacing: -.01em;
}
.be-hold-slot { grid-area: 1 / 1; }
</style>
