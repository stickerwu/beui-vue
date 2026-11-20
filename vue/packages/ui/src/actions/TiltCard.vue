<script setup lang="ts">
import { motion, useTransform } from 'motion-v'
import { shallowRef } from 'vue'
import { useHoverSpring } from './use-hover-spring'

const {max = 12, glare = true} = defineProps<{max?:number; glare?:boolean}>()
const {horizontal, vertical, reset, position, reduce, hover} = useHoverSpring()
const transform = useTransform(() => `perspective(1000px) rotateX(${vertical.get()}deg) rotateY(${horizontal.get()}deg)`)
const shine = shallowRef('50% 50%')
function move(event: PointerEvent) {
  const point = position(event)
  if (!point) return
  const left = point.left / point.rect.width
  const top = point.top / point.rect.height
  horizontal.set((left - 0.5) * max)
  vertical.set((0.5 - top) * max)
  shine.value = `${left * 100}% ${top * 100}%`
}
</script>
<template>
  <motion.div class="tilt" :style="{transform}" @pointermove="move" @pointerleave="reset"><slot /><span v-if="glare && hover && !reduce" class="glare" :style="{'--shine':shine}" aria-hidden="true" /></motion.div>
</template>
<style scoped>
.tilt { position:relative; isolation:isolate; overflow:hidden; border-radius:1rem; transform-style:preserve-3d; }
.glare { position:absolute; inset:0; pointer-events:none; opacity:.15; background:radial-gradient(circle at var(--shine),var(--beui-foreground),transparent 50%); }
</style>
