<script setup lang="ts">
import ActionSwapIcon from './ActionSwapIcon.vue'

/** `ActionSwapIcon` with the cascade animation fixed. */
defineProps<{
  /** Identity of the current content. Changing it plays the swap. */
  value: string
}>()
defineSlots<{
  /** The icon. */
  default?(): unknown
}>()
</script>

<template>
  <ActionSwapIcon :value="value" animation="cascade"><slot /></ActionSwapIcon>
</template>
