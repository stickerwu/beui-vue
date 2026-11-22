<script setup lang="ts">
import { useImageViewerContext } from './image-viewer-context'

/** "2 / 5" position of the open image. */
const { index, images, t, fill } = useImageViewerContext('ImageViewerCounter')
</script>

<template>
  <span aria-live="polite" class="be-lightbox-counter">{{ fill(t.counter, { current: index + 1, total: images.length }) }}</span>
</template>

<style>
.be-lightbox-counter { font-size: .75rem; line-height: 1rem; font-variant-numeric: tabular-nums; }
</style>
