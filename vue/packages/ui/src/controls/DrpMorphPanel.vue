<script setup lang="ts">
import { AnimatePresence } from 'motion-v'
import { onMounted, shallowRef } from 'vue'
import DrpMorphSurface from './DrpMorphSurface.vue'

defineProps<{
  open: boolean
  anchor: HTMLElement | null
  id: string
  labelledBy?: string
  side?: 'top' | 'bottom'
  align?: 'start' | 'end'
  sideOffset?: number
  radius?: number
  shadow?: boolean
  width?: string
  contentClass?: string
}>()
const emit = defineEmits<{ opened: [content: HTMLElement] }>()
// The panel portals to the body, which does not exist during server rendering.
const mounted = shallowRef(false)
onMounted(() => { mounted.value = true })
</script>

<template>
  <Teleport v-if="mounted" to="body">
    <AnimatePresence>
      <DrpMorphSurface
        v-if="open"
        key="drp-surface"
        :anchor="anchor"
        :id="id"
        :labelled-by="labelledBy"
        :side="side"
        :align="align"
        :side-offset="sideOffset"
        :radius="radius"
        :shadow="shadow"
        :width="width"
        :content-class="contentClass"
        @opened="emit('opened', $event)"
      >
        <slot />
      </DrpMorphSurface>
    </AnimatePresence>
  </Teleport>
</template>
