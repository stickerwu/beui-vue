<script setup lang="ts">
import { computed, inject, provide } from 'vue'
import { TIMING_KEY } from './tip-shared'

/** Shared timing for every tooltip inside it. Optional: tooltips work without one. */
const props = defineProps<{
  /** Delay before a hover opens a tooltip (ms). */
  delay?: number
  /** Delay before a tooltip closes once the pointer has left it (ms). */
  closeDelay?: number
  /** After one tooltip closes, others open instantly for this long (ms). */
  skipDelay?: number
}>()
defineSlots<{ default?(): unknown }>()

const parent = inject(TIMING_KEY, null)
provide(TIMING_KEY, {
  delay: computed(() => props.delay ?? parent?.delay.value ?? 120),
  closeDelay: computed(() => props.closeDelay ?? parent?.closeDelay.value ?? 0),
  skipDelay: computed(() => props.skipDelay ?? parent?.skipDelay.value ?? 300),
})
</script>

<template><slot /></template>
