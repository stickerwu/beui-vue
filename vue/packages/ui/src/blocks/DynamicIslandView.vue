<script setup lang="ts">
import { AnimatePresence } from 'motion-v'
import { inject } from 'vue'
import IslandSlot from './IslandSlot.vue'
import { viewKey } from './island-view'

/** Content shown inside `DynamicIsland` while the parent `view` equals `id`. */
defineOptions({ inheritAttrs: false })

defineProps<{
  /** The `view` value of the island that shows this content. */
  id: string
  className?: string
}>()

defineSlots<{
  /** The content of this view. */
  default?(): unknown
}>()

const active = inject(viewKey)
if (!active) throw new Error('DynamicIslandView must be used inside <DynamicIsland>')
</script>

<template>
  <AnimatePresence :initial="false">
    <IslandSlot v-if="active === id" :key="id" v-bind="$attrs" class="be-island-view" :class="className" :data-island-view="id">
      <slot />
    </IslandSlot>
  </AnimatePresence>
</template>
