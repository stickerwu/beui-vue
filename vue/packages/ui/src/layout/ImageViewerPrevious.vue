<script setup lang="ts">
import ImageViewerControl from './ImageViewerControl.vue'

/** Shows the previous image; disabled on the first. */
defineSlots<{
  /** Replaces the icon. */
  default?: () => unknown
}>()
</script>

<template>
  <ImageViewerControl action="previous"><slot /></ImageViewerControl>
</template>
