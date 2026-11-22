<script setup lang="ts">
import type { VNode } from 'vue'
import AdaptiveStepperAction from './adaptive-stepper/AdaptiveStepperAction.vue'

// Increase button of an `AdaptiveStepper`; it collapses into the track at the maximum.
defineOptions({ inheritAttrs: false })
defineSlots<{
  /** Icon of the button. Defaults to a plus. */
  default?: () => VNode[]
}>()
</script>

<template>
  <AdaptiveStepperAction v-bind="$attrs" :direction="1"><slot /></AdaptiveStepperAction>
</template>
