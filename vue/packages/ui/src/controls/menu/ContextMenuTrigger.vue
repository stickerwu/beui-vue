<script setup lang="ts">
import ContextMenuTriggerImpl from './context-trigger'

/**
 * The right-click / long-press / Shift+F10 target. Its single child keeps its own markup; the
 * menu's ARIA attributes and listeners are added to it. Port of `ContextMenuTrigger`.
 */
defineProps<{
  /** Stop the trigger from opening the menu. */
  disabled?: boolean
}>()
defineSlots<{
  /** The single element that opens the menu. */
  default?(): unknown
}>()
</script>

<template>
  <ContextMenuTriggerImpl :disabled="disabled"><slot /></ContextMenuTriggerImpl>
</template>
