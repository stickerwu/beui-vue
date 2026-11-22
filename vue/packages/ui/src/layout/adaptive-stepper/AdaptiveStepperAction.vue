<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, type VNode } from 'vue'
import { easeOut, pressSpring } from '../../core/motion'
import AdaptiveStepperItem from './AdaptiveStepperItem.vue'
import { STEPPER_LIQUID_TRANSITION, useAdaptiveStepperContext } from './context'

// Shared body of `AdaptiveStepperDecrement` and `AdaptiveStepperIncrement`.
defineOptions({ inheritAttrs: false })
const props = defineProps<{ direction: -1 | 1 }>()
defineSlots<{ default?: () => VNode[] }>()

const context = useAdaptiveStepperContext('AdaptiveStepper action')
const hidden = computed(() => (props.direction === -1 ? context.atMin.value : context.atMax.value))
const label = computed(() => context.t.value[props.direction === -1 ? 'decrease' : 'increase'])
const x = computed(() => (props.direction === -1 ? (hidden.value ? 32 : 0) : hidden.value ? 136 : 168))
const buttonRef = props.direction === -1 ? context.decrementButton : context.incrementButton

// A ref on a motion component is the component instance, not its node.
function setButton(element: unknown) {
  const node = element && typeof element === 'object' && '$el' in element ? (element as { $el: unknown }).$el : element
  buttonRef.value = node instanceof HTMLButtonElement ? node : null
}

// A caller's own `click` listener reaches the button through `$attrs`, ahead of
// this handler, so it can `preventDefault()` to veto the step like the original.
function step(event: MouseEvent) {
  if (event.defaultPrevented) return
  const act = props.direction === -1 ? context.decrement : context.increment
  act(event.detail === 0)
}
</script>

<template>
  <AdaptiveStepperItem :x="x" :y="0" :width="48" :height="48" :radius="24" :transition="STEPPER_LIQUID_TRANSITION">
    <motion.button
      :ref="setButton"
      v-bind="$attrs"
      type="button"
      :aria-label="($attrs['aria-label'] as string | undefined) ?? label"
      :aria-hidden="hidden || undefined"
      :tabindex="hidden ? -1 : ($attrs.tabindex as number | undefined)"
      :disabled="context.disabled.value || hidden"
      :while-press="context.reduce.value || context.disabled.value || hidden ? undefined : { scale: 0.94 }"
      :transition="context.reduce.value ? { duration: 0 } : pressSpring"
      class="be-stepper-action"
      :class="{ 'is-hidden': hidden, 'is-disabled': context.disabled.value }"
      @click="step"
    >
      <motion.span
        aria-hidden="true"
        :initial="{ opacity: hidden ? 0 : 1, filter: hidden ? 'blur(2px)' : 'blur(0px)' }"
        :animate="{ opacity: hidden ? 0 : 1, filter: hidden ? 'blur(2px)' : 'blur(0px)' }"
        :transition="{ duration: context.reduce.value ? 0 : 0.15, ease: easeOut }"
      >
        <slot>
          <svg v-if="direction === -1" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /><path d="M12 5v14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </slot>
      </motion.span>
    </motion.button>
  </AdaptiveStepperItem>
</template>

<style scoped>
.be-stepper-action { box-sizing: border-box; display: grid; width: 100%; height: 100%; place-items: center; padding: 0; border: 1px solid transparent; border-radius: 9999px; background: transparent; background-clip: padding-box; color: var(--beui-foreground); font: inherit; outline: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1), border-color .15s cubic-bezier(.4, 0, .2, 1); }
.be-stepper-action:hover { background: var(--beui-muted); }
.be-stepper-action.is-hidden:hover { background: transparent; }
.be-stepper-action:disabled { pointer-events: none; }
.be-stepper-action.is-disabled { opacity: .5; }
.be-stepper-action:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-stepper-action :deep(svg) { display: block; width: 1.25rem; height: 1.25rem; }
</style>
