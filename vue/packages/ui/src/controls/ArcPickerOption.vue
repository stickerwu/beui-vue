<script setup lang="ts">
import { motion, useTransform, type MotionValue } from 'motion-v'
import { computed, type ComponentPublicInstance } from 'vue'
import { useMotionSource } from '../core/motion-source'
import type { ChoiceOption } from './types'

const props = defineProps<{
  option: ChoiceOption
  index: number
  position: MotionValue<number>
  verticalAnchor: string
  radius: number
  itemHeight: number
  visibleCount: number
  side: 'top' | 'bottom' | 'left' | 'right'
  selected: boolean
  disabled: boolean
  /** Registers the button element with the parent so it can be measured and focused. */
  setRef: (element: HTMLButtonElement | null) => void
}>()

const emit = defineEmits<{ select: [] }>()

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const horizontal = computed(() => props.side === 'top' || props.side === 'bottom')

// The transforms below re-run only when a motion value they read changes, so
// the props they depend on are mirrored into one.
const layout = useMotionSource(() => ({
  index: props.index,
  radius: props.radius,
  itemHeight: props.itemHeight,
  visibleCount: props.visibleCount,
  side: props.side,
  dimmed: props.disabled || !!props.option.disabled,
}))

// Each option is a motion value driven by the shared floating `position`: the
// label rides a circle of `radius`, with its angle capped at ±1.5 rad so rows
// far from the centre fold in behind the ends instead of spiralling away.
const transform = useTransform(() => {
  const { index, radius, itemHeight, side } = layout.get()
  const horizontal = side === 'top' || side === 'bottom'
  const angle = clamp(((index - props.position.get()) * itemHeight) / radius, -1.5, 1.5)
  const bend = radius * (1 - Math.cos(angle))
  const along = radius * Math.sin(angle)
  const x = horizontal ? along : side === 'left' ? bend : -bend
  const y = horizontal ? (side === 'top' ? bend : -bend) : along
  const rotation = ((side === 'left' || side === 'bottom' ? -angle : angle) * 180) / Math.PI
  const anchor = horizontal ? '-50%' : side === 'left' ? '-100%' : '0%'
  return `translate3d(${x}px, ${y}px, 0) translate(${anchor}, -50%) rotate(${rotation}deg)`
})

const opacity = useTransform(() => {
  const { index, visibleCount, dimmed } = layout.get()
  const distance = Math.abs(index - props.position.get())
  return clamp((visibleCount / 2 + 0.5 - distance) / 1.5, 0, 1) * (dimmed ? 0.35 : 1)
})

// Rows outside the visible window must not swallow a drag that starts on the
// track behind them.
const pointerEvents = useTransform(() => {
  const { index, visibleCount } = layout.get()
  return Math.abs(index - props.position.get()) < visibleCount / 2 ? 'auto' : 'none'
})

// Stable per instance, so Vue never treats it as a different ref on re-render.
function register(ref: Element | ComponentPublicInstance | null) {
  if (!ref) return props.setRef(null)
  props.setRef(ref instanceof Element ? (ref as HTMLButtonElement) : ((ref.$el as HTMLButtonElement | null) ?? null))
}

function onClick(event: MouseEvent) {
  if (!event.defaultPrevented) emit('select')
}
</script>

<template>
  <motion.button
    :ref="register"
    type="button"
    role="radio"
    :aria-checked="selected"
    :disabled="disabled || option.disabled"
    :tabindex="selected && !disabled && !option.disabled ? 0 : -1"
    data-slot="arc-picker-option"
    :data-value="option.value"
    :data-selected="selected || undefined"
    class="be-arc-option"
    :class="{
      'is-center': horizontal,
      'is-start': !horizontal && side === 'right',
      'is-end': !horizontal && side === 'left',
      'is-selected': selected,
    }"
    :style="{
      top: horizontal ? (side === 'top' ? '36px' : 'calc(100% - 36px)') : '50%',
      left: horizontal ? '50%' : verticalAnchor,
      transformOrigin: horizontal ? 'center' : side === 'left' ? 'right center' : 'left center',
      maxWidth: horizontal ? 'calc(100% - 4rem)' : 'calc(100% - 3rem)',
      transform,
      opacity,
      pointerEvents,
    }"
    @click="onClick"
  >
    <span data-slot="arc-picker-label" class="be-arc-option-label">{{ option.label }}</span>
  </motion.button>
</template>

<style scoped>
.be-arc-option {
  position: absolute;
  padding: 0.25rem 0.5rem;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--beui-muted-foreground);
  font: inherit;
  font-size: 1.5rem;
  line-height: 2rem;
  font-weight: 300;
  white-space: nowrap;
  outline: none;
}
.be-arc-option.is-center { text-align: center; }
.be-arc-option.is-start { text-align: left; }
.be-arc-option.is-end { text-align: right; }
.be-arc-option.is-selected { color: var(--beui-primary); }
.be-arc-option:focus-visible {
  box-shadow:
    0 0 0 2px var(--beui-background),
    0 0 0 4px var(--beui-ring);
}
.be-arc-option:disabled { cursor: not-allowed; }
.be-arc-option-label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
