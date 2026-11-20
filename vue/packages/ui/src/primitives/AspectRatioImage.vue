<script setup lang="ts">
import { motion } from 'motion-v'
import { computed } from 'vue'
import { layoutSpring, useAspectRatio } from './state'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ width: number, height: number, alt: string, draggable?: boolean }>()
const { ratio, animated } = useAspectRatio()
const fillWidth = computed(() => {
  if (![props.width, props.height].every(value => Number.isFinite(value) && value > 0)) throw new RangeError('AspectRatioImage: dimensions must be finite and positive.')
  return ratio.value >= props.width / props.height
})
</script>

<template>
  <div class="be-aspect-grid">
    <motion.img v-bind="$attrs" class="be-aspect-image" :alt="alt" :width="width" :height="height" :draggable="draggable"
      :layout="animated" :transition="layoutSpring" :style="{ width: fillWidth ? '100%' : 'auto', height: fillWidth ? 'auto' : '100%' }" />
  </div>
</template>

<style scoped>
.be-aspect-grid { position: absolute; inset: 0; display: grid; grid-template: minmax(0, 1fr) / minmax(0, 1fr); place-items: center; }
.be-aspect-image { display: block; max-width: none; max-height: none; }
</style>
