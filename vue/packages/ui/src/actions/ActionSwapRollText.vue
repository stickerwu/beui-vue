<script setup lang="ts">
import ActionSwapText from './ActionSwapText.vue'

/** `ActionSwapText` with the roll animation fixed. */
defineProps<{
  /** Identity of the current content. Changing it plays the swap. */
  value: string
}>()
defineSlots<{
  /** The label. */
  default?(): unknown
}>()
</script>

<template>
  <ActionSwapText :value="value" animation="roll"><slot /></ActionSwapText>
</template>
