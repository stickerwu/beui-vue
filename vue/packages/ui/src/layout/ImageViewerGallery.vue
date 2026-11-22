<script setup lang="ts">
import { useImageViewerContext } from './image-viewer-context'

/** The thumbnail grid. */
defineSlots<{ default?: () => unknown }>()
const { label } = useImageViewerContext('ImageViewerGallery')
</script>

<template>
  <section :aria-label="label" class="be-lightbox-gallery"><slot /></section>
</template>

<style>
.be-lightbox-gallery { display: grid; width: 100%; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }
@media (min-width: 640px) { .be-lightbox-gallery { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>
