<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import DialogSurface from './DialogSurface.vue'

interface GalleryImage { id: string; src: string; thumbnail?: string; alt: string; caption?: string; width?: number; height?: number }
const { images, label = 'Photographs' } = defineProps<{ images: readonly GalleryImage[]; label?: string }>()
const active = defineModel<string | null>({ default: null })
const index = computed(() => images.findIndex(image => image.id === active.value))
const selected = computed(() => images[index.value])
const origin = shallowRef<DOMRect>()
let touch: { id: number; x: number; y: number } | undefined
function show(image: GalleryImage, event: MouseEvent) { origin.value = (event.currentTarget as HTMLElement).getBoundingClientRect(); active.value = image.id }
function step(delta: number) { if (images.length) active.value = images[(index.value + delta + images.length) % images.length]!.id }
function press(event: PointerEvent) {
  if (event.pointerType === 'mouse' || !event.isPrimary) return
  touch = { id: event.pointerId, x: event.clientX, y: event.clientY }
}
function release(event: PointerEvent) {
  if (!touch || touch.id !== event.pointerId) return
  const delta = event.clientX - touch.x
  if (event.type === 'pointerup' && Math.abs(delta) > 42 && Math.abs(delta) > Math.abs(event.clientY - touch.y)) step(delta > 0 ? -1 : 1)
  touch = undefined
}
</script>
<template>
  <div class="gallery"><button v-for="image in images" :key="image.id" type="button" :aria-label="image.alt" aria-haspopup="dialog" @click="show(image,$event)"><img :src="image.thumbnail ?? image.src" :alt="image.alt" loading="lazy" :width="image.width" :height="image.height" /></button></div>
  <DialogSurface :open="Boolean(selected)" :label="label" kind="viewer" :origin="origin" @close="active = null" @keydown.left.prevent="step(-1)" @keydown.right.prevent="step(1)">
    <template v-if="selected"><header><span>{{ index + 1 }} / {{ images.length }}</span><button type="button" aria-label="Close viewer" @click="active = null">×</button></header>
      <img class="full" :src="selected.src" :alt="selected.alt" @pointerdown="press" @pointerup="release" @pointercancel="release" />
      <footer><button type="button" aria-label="Previous image" @click="step(-1)">←</button><span aria-live="polite">{{ selected.caption ?? selected.alt }}</span><button type="button" aria-label="Next image" @click="step(1)">→</button></footer>
    </template>
  </DialogSurface>
</template>
<style scoped>.gallery { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(24%,7rem),1fr)); gap: .6rem; } .gallery button { padding: 0; border: 0; border-radius: .8rem; overflow: hidden; background: var(--beui-muted); cursor: zoom-in; } .gallery img { display: block; width: 100%; aspect-ratio: 4/5; height: auto; object-fit: cover; } header,footer { display: flex; align-items: center; justify-content: space-between; gap: .75rem; font-size: .8rem; } header button,footer button { border: 0; border-radius: 50%; width: 2rem; height: 2rem; background: var(--beui-muted); color: inherit; cursor: pointer; } .full { display: block; width: 100%; height: min(64dvh,42rem); object-fit: contain; margin-block: .5rem; touch-action: pan-y pinch-zoom; }</style>
