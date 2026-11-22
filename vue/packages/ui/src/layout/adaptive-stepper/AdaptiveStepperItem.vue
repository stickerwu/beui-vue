<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, useId, watch } from 'vue'
import { useReducedMotion } from '../../core/reduced-motion'
import { cubicBezier, type LiquidBox, type LiquidTransition } from '../liquid'
import { useAdaptiveStepperContext } from './context'

// One box of the liquid track (the port of the original `LiquidItem`): the
// wrapper it draws and its silhouette in the goo glide to their next box
// together, along the same curve, so neither outruns the other.
const props = defineProps<{
  x: number
  y: number
  width: number
  height: number
  radius: number
  transition: LiquidTransition
}>()
defineSlots<{ default?: () => unknown }>()

const context = useAdaptiveStepperContext('AdaptiveStepper parts')
const reduce = useReducedMotion()
const id = `item-${useId()}`
const target = computed<LiquidBox>(() => ({ x: props.x, y: props.y, width: props.width, height: props.height, radius: props.radius }))
const box = shallowRef<LiquidBox>(target.value)
context.blobs[id] = target.value

let frame = 0
function write(next: LiquidBox) {
  box.value = next
  context.blobs[id] = next
}
watch(target, next => {
  cancelAnimationFrame(frame)
  const duration = reduce.value ? 0 : props.transition.duration ?? 280
  if (!duration) {
    write(next)
    return
  }
  const from = { ...box.value }
  const ease = cubicBezier(props.transition.ease ?? [0.16, 1, 0.3, 1])
  const started = performance.now()
  const tick = (now: number) => {
    const progress = Math.min(1, (now - started) / duration)
    const eased = ease(progress)
    write({
      x: from.x + (next.x - from.x) * eased,
      y: from.y + (next.y - from.y) * eased,
      width: from.width + (next.width - from.width) * eased,
      height: from.height + (next.height - from.height) * eased,
      radius: from.radius + (next.radius - from.radius) * eased,
    })
    if (progress < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}, { flush: 'sync' })
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  delete context.blobs[id]
})
</script>

<template>
  <div class="be-stepper-item" :style="{ transform: `translate(${box.x}px, ${box.y}px)`, width: `${box.width}px`, height: `${box.height}px` }">
    <slot />
  </div>
</template>

<style scoped>
.be-stepper-item { position: absolute; left: 0; top: 0; z-index: 10; will-change: transform, width, height; }
</style>
