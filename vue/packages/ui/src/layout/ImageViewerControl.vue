<script setup lang="ts">
import { computed } from 'vue'
import { useImageViewerContext } from './image-viewer-context'

/** Shared button of `ImageViewerClose`, `ImageViewerPrevious` and `ImageViewerNext`. */
const props = defineProps<{ action: 'close' | 'previous' | 'next'; disabled?: boolean }>()
defineSlots<{ default?: () => unknown }>()
const context = useImageViewerContext('ImageViewer controls')
const unavailable = computed(() => props.action === 'previous'
  ? context.index.value <= 0
  : props.action === 'next'
    ? context.index.value < 0 || context.index.value >= context.images.value.length - 1
    : false)
const label = computed(() => context.t.value[props.action])
function activate() {
  if (props.action === 'close') context.close()
  else context.move(props.action === 'previous' ? -1 : 1)
}
</script>

<template>
  <button type="button" class="be-lightbox-control" :aria-label="label" :disabled="disabled || unavailable" @click="activate">
    <slot>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <template v-if="action === 'close'"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></template>
        <path v-else-if="action === 'previous'" d="m15 18-6-6 6-6" />
        <path v-else d="m9 18 6-6-6-6" />
      </svg>
    </slot>
  </button>
</template>

<style>
.be-lightbox-control { display: inline-flex; box-sizing: border-box; width: 2.5rem; height: 2.5rem; flex: none; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; border-radius: 9999px; background: rgb(255 255 255 / .1); color: #fff; cursor: pointer; transition: background-color .15s; }
@media (hover: hover) { .be-lightbox-control:hover:enabled { background: rgb(255 255 255 / .2); } }
.be-lightbox-control:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.be-lightbox-control:disabled { opacity: .3; cursor: default; }
</style>
