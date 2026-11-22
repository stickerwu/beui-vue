<script setup lang="ts">
import { useImageViewerContext } from './image-viewer-context'

/** Caption of the open image: its `caption`, else its `alt`. */
defineSlots<{
  /** Replaces the caption text. */
  default?: () => unknown
}>()
const context = useImageViewerContext('ImageViewerCaption')
</script>

<template>
  <div aria-live="polite" data-lightbox-content class="be-lightbox-caption">
    <slot>
      <template v-if="context.image.value">
        <component :is="context.renderCaption()" v-if="context.renderCaption()" :image="context.image.value" />
        <template v-else>{{ context.image.value.caption ?? context.image.value.alt }}</template>
      </template>
    </slot>
  </div>
</template>

<style>
.be-lightbox-caption { min-width: 0; text-align: center; font-size: .875rem; line-height: 1.25rem; }
</style>
