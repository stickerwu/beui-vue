<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'
import { computed, provide } from 'vue'
import { aspectKey, layoutSpring } from './state'

const props = withDefaults(defineProps<{ ratio?: number, animated?: boolean, contentClassName?: string }>(), { ratio: 1, animated: true })
const reduce = useReducedMotion()
const animated = computed(() => props.animated && !reduce.value)
const ratio = computed(() => {
  if (!Number.isFinite(props.ratio) || props.ratio <= 0) throw new RangeError('AspectRatio: ratio must be a finite, positive number.')
  return props.ratio
})
provide(aspectKey, { ratio, animated })
</script>

<template>
  <motion.div class="be-aspect" :layout="animated" :transition="layoutSpring" :style="{ aspectRatio: ratio }">
    <div class="be-aspect-layer" :class="contentClassName"><slot /></div>
  </motion.div>
</template>

<style scoped>
.be-aspect { position: relative; width: 100%; min-width: 0; overflow: hidden; }
.be-aspect-layer { position: absolute; inset: 0; }
</style>
