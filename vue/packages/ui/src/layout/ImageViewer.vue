<script lang="ts">
export { imageViewerMessages, useImageViewer, type ImageViewerImage, type ImageViewerMessages, type LightboxImage, type MorphingLightboxProps } from './image-viewer-context'
</script>

<script setup lang="ts">
import { LayoutGroup } from 'motion-v'
import { computed, provide, useId, useSlots, watch } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import ImageViewerContent from './ImageViewerContent.vue'
import ImageViewerGallery from './ImageViewerGallery.vue'
import ImageViewerThumbnail from './ImageViewerThumbnail.vue'
import { imageViewerKey, imageViewerMessages, type ImageViewerMessages, type LightboxImage } from './image-viewer-context'

/** A composable image gallery with a focus-managed, thumbnail-connected viewer. Compose `ImageViewerGallery` and `ImageViewerContent` inside, or omit the default slot for the ready-made layout. */
defineOptions({ inheritAttrs: false })
const props = defineProps<{
  images: readonly LightboxImage[]
  /** Starting open image id when `v-model` is not bound. */
  defaultValue?: string | null
  label?: string
  /** Extra classes for every thumbnail of the ready-made layout. */
  thumbnailClassName?: string
  /** Override any built-in string. */
  labels?: Partial<ImageViewerMessages>
}>()
/** Id of the open image, or null for closed; `v-model`. */
const model = defineModel<string | null>()
defineSlots<{
  /** Compose gallery and viewer parts instead of the default layout. */
  default?: () => unknown
  /** Replaces the caption line under the viewer; receives the open image. */
  renderCaption?: (props: { image: LightboxImage }) => unknown
}>()
const slots = useSlots()

const t = computed(() => ({ ...imageViewerMessages, ...props.labels }))
const label = computed(() => props.label ?? t.value.label)
const value = computed(() => (model.value !== undefined ? model.value : (props.defaultValue ?? null)))
const index = computed(() => props.images.findIndex(item => item.id === value.value))
const image = computed(() => (index.value < 0 ? undefined : props.images[index.value]))
const reducedMotion = useReducedMotion()
const reduce = computed(() => reducedMotion.value)
// Stable per-instance shared-layout identity; `useId` can contain characters a `layoutId` string should not.
const groupKey = `be-image-viewer-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, entry]) => text.replaceAll(`{${key}}`, String(entry)), template)
}
function select(id: string | null) { model.value = id }
function move(direction: -1 | 1) {
  const next = props.images[index.value + direction]
  if (image.value && next) select(next.id)
}

function validate(list: readonly LightboxImage[]) {
  if (new Set(list.map(item => item.id)).size !== list.length) throw new Error('ImageViewer requires unique image ids.')
  if (list.some(item => !Number.isFinite(item.width) || !Number.isFinite(item.height) || item.width <= 0 || item.height <= 0)) {
    throw new Error('ImageViewer requires positive image dimensions.')
  }
}
validate(props.images)
watch(() => props.images, validate)
// Drop removed identities instead of letting a re-added image reopen a session.
watch([image, value], () => {
  if (value.value !== null && index.value < 0) model.value = null
}, { flush: 'post' })

provide(imageViewerKey, {
  images: computed(() => props.images), value, image, index, label, t, fill, groupKey, reduce,
  renderCaption: () => slots.renderCaption, select, move, close: () => select(null),
})
</script>

<template>
  <LayoutGroup>
    <slot v-if="$slots.default" />
    <template v-else>
      <ImageViewerGallery v-bind="$attrs">
        <ImageViewerThumbnail v-for="item in images" :key="item.id" :image-id="item.id" :class="thumbnailClassName" />
      </ImageViewerGallery>
      <ImageViewerContent />
    </template>
  </LayoutGroup>
</template>
