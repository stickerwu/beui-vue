<script setup lang="ts">
import ImageViewerControl from './ImageViewerControl.vue'

/** Closes the viewer. */
defineSlots<{
  /** Replaces the icon. */
  default?: () => unknown
}>()
</script>

<template>
  <ImageViewerControl action="close"><slot /></ImageViewerControl>
</template>
