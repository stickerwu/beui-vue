<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, Text, useSlots, type VNode } from 'vue'
import { easeOut } from '../core/motion'
import AdaptiveStepperItem from './adaptive-stepper/AdaptiveStepperItem.vue'
import { STEPPER_LIQUID_TRANSITION, useAdaptiveStepperContext } from './adaptive-stepper/context'

// The number between the buttons. It stretches into the room a hidden button leaves.
defineOptions({ inheritAttrs: false })
defineSlots<{
  /** Custom display for the value. Plain text rolls with the step; markup swaps in place. */
  default?: (props: { value: number }) => VNode[]
}>()
const slots = useSlots()

const context = useAdaptiveStepperContext('AdaptiveStepperValue')
const geometry = computed(() => {
  const { atMin, atMax } = context
  return atMin.value && atMax.value ? { x: 0, width: 216 }
    : atMin.value ? { x: 0, width: 152 }
      : atMax.value ? { x: 64, width: 152 }
        : { x: 64, width: 88 }
})
// Only text rolls: a node the caller supplied has no direction to travel in.
const canRoll = computed(() => {
  const nodes = slots.default?.({ value: context.value.value })
  return !nodes || nodes.every(node => node.type === Text)
})
const distance = computed(() => (context.reduce.value || !canRoll.value ? 0 : context.direction.value * 32))
</script>

<template>
  <AdaptiveStepperItem :x="geometry.x" :y="0" :width="geometry.width" :height="48" :radius="24" :transition="STEPPER_LIQUID_TRANSITION">
    <motion.output v-bind="$attrs" aria-live="polite" aria-atomic="true" class="be-stepper-value">
      <span class="be-stepper-sr">{{ context.valueText.value }}</span>
      <span aria-hidden="true" class="be-stepper-roll">
        <AnimatePresence :initial="false" mode="popLayout">
          <motion.span
            :key="context.value.value"
            class="be-stepper-digit"
            :initial="{ opacity: context.reduce.value ? 1 : 0.35, filter: context.reduce.value ? 'blur(0px)' : 'blur(2px)', transform: `translateY(${distance}%)` }"
            :animate="{ opacity: 1, filter: 'blur(0px)', transform: 'translateY(0%)' }"
            :exit="{ opacity: context.reduce.value ? 1 : 0, filter: context.reduce.value ? 'blur(0px)' : 'blur(2px)', transform: `translateY(${-distance}%)`, transition: { duration: context.reduce.value ? 0 : 0.12, ease: easeOut } }"
            :transition="{ duration: context.reduce.value ? 0 : 0.18, ease: easeOut }"
          >
            <slot :value="context.value.value">{{ context.value.value }}</slot>
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.output>
  </AdaptiveStepperItem>
</template>

<style scoped>
.be-stepper-value { display: flex; box-sizing: border-box; width: 100%; height: 100%; min-width: 0; align-items: center; justify-content: center; overflow: hidden; padding: 0 1rem; border: 1px solid transparent; border-radius: 9999px; background: transparent; background-clip: padding-box; color: var(--beui-foreground); font-weight: 600; font-size: 1.125rem; line-height: 1.75rem; font-variant-numeric: tabular-nums; }
.be-stepper-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border-width: 0; }
.be-stepper-roll { position: relative; display: grid; min-height: 1.1em; min-width: 1ch; place-items: center; overflow: hidden; line-height: 1; }
.be-stepper-digit { grid-row: 1; grid-column: 1; will-change: transform, filter, opacity; }
</style>
