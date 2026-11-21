<script setup lang="ts">
import { motion } from 'motion-v'
import ButtonBase from '../ButtonBase.vue'
import { useHoverSpring } from './use-hover-spring'

defineOptions({inheritAttrs:false})
const {strength = 0.25, magneticClassName} = defineProps<{strength?:number; magneticClassName?:string}>()
const {horizontal, vertical, reset, position} = useHoverSpring()
function move(event: PointerEvent) {
  const point = position(event)
  if (!point) return
  horizontal.set((point.left - point.rect.width / 2) * strength)
  vertical.set((point.top - point.rect.height / 2) * strength)
}
</script>
<template>
  <motion.span class="magnet" :class="magneticClassName" :style="{x:horizontal, y:vertical}" @pointermove="move" @pointerleave="reset">
    <ButtonBase v-bind="$attrs"><slot /></ButtonBase>
  </motion.span>
</template>
<style scoped>.magnet { display:inline-block; }</style>
