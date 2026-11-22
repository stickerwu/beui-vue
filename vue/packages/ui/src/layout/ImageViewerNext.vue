<script setup lang="ts">
import ImageViewerControl from './ImageViewerControl.vue'

/** Shows the next image; disabled on the last. */
defineSlots<{
  /** Replaces the icon. */
  default?: () => unknown
}>()
</script>

<template>
  <ImageViewerControl action="next"><slot /></ImageViewerControl>
</template>
