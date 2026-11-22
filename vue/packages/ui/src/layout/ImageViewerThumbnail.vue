<script setup lang="ts">
import { motion } from 'motion-v'
import { computed } from 'vue'
import { layoutSpring, pressSpring } from '../core/motion'
import { useImageViewerContext } from './image-viewer-context'

/** One gallery thumbnail; the image keeps its shared-layout identity when the trigger is customised. */
const props = defineProps<{
  /** Id of the image in the viewer's `images`. */
  imageId: string
  /** Extra classes for the thumbnail image. */
  imageClassName?: string
  disabled?: boolean
}>()
defineSlots<{
  /** Overlay drawn over the thumbnail image. */
  default?: () => unknown
}>()

const context = useImageViewerContext('ImageViewerThumbnail')
const image = computed(() => {
  const found = context.images.value.find(item => item.id === props.imageId)
  if (!found) throw new Error(`ImageViewerThumbnail: unknown image id "${props.imageId}".`)
  return found
})
</script>

<template>
  <motion.button
    type="button" class="be-lightbox-thumb" :aria-label="context.fill(context.t.value.open, { alt: image.alt })"
    aria-haspopup="dialog" :aria-expanded="image.id === context.value.value" :disabled="disabled"
    :while-press="context.reduce.value ? undefined : { scale: 0.98 }" :transition="pressSpring"
    @click="!disabled && context.select(image.id)">
    <motion.img
      :layout-id="context.reduce.value ? undefined : `${context.groupKey}-${image.id}`" :src="image.src" :alt="image.alt"
      :width="image.width" :height="image.height" loading="lazy" :draggable="false" :transition="layoutSpring"
      class="be-lightbox-thumb-image" :class="imageClassName" />
    <slot />
  </motion.button>
</template>

<style>
.be-lightbox-thumb { position: relative; overflow: hidden; margin: 0; padding: 0; border: 0; border-radius: 1rem; background: var(--beui-muted); color: inherit; cursor: zoom-in; }
.be-lightbox-thumb:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-lightbox-thumb-image { display: block; height: auto; width: 100%; }
</style>
