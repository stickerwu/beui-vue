<script lang="ts">
export { imageViewerMessages, type ImageViewerMessages, type LightboxImage, type MorphingLightboxProps } from './image-viewer-context'
</script>

<script setup lang="ts">
import ImageViewer from './ImageViewer.vue'
import type { LightboxImage, MorphingLightboxProps } from './image-viewer-context'

/** The ready-made lightbox: a thumbnail gallery and its viewer. `ImageViewer` and its parts compose the same thing piece by piece. */
defineOptions({ inheritAttrs: false })
defineProps<MorphingLightboxProps>()
const active = defineModel<string | null>({ default: null })
defineSlots<{
  /** Replaces the caption line under the viewer. */
  caption?(props: { image: LightboxImage }): unknown
}>()
</script>

<template>
  <ImageViewer v-model="active" v-bind="$attrs" :images="images" :label="label" :labels="labels" :thumbnail-class-name="thumbnailClassName" :class="className">
    <template v-if="$slots.caption" #renderCaption="{ image }"><slot name="caption" :image="image" /></template>
  </ImageViewer>
</template>
