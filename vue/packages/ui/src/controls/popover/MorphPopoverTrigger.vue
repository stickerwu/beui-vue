<script setup lang="ts">
/**
 * The element a `PopoverMorph` composed from parts opens from. It renders its single child
 * element as it is; the popover wires up the listeners and ARIA attributes.
 */
defineSlots<{
  /** The single element that summons the popover. */
  default?(): unknown
}>()
</script>

<template><slot /></template>
