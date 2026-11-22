<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'

/**
 * One positioned masonry cell. It reports its rounded border-box height, like
 * the virtualizer's `measureElement`, so the lanes can be packed with real sizes.
 */
const emit = defineEmits<{ measure: [size: number] }>()

const root = useTemplateRef<HTMLElement>('root')
let observer: ResizeObserver | undefined

onMounted(() => {
  const node = root.value
  if (!node) return
  emit('measure', Math.round(node.getBoundingClientRect().height))
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(([entry]) => {
    const box = entry?.borderBoxSize?.[0]
    if (box) emit('measure', Math.round(box.blockSize))
  })
  observer.observe(root.value!, { box: 'border-box' })
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="root" class="be-masonry-item">
    <slot />
  </div>
</template>

<style scoped>
.be-masonry-item { position: absolute; top: 0; left: 0; will-change: transform; }
</style>
