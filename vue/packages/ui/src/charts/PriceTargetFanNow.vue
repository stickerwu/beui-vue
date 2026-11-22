<script setup lang="ts">
import { computed } from 'vue'
import { motion } from 'motion-v'
import { easeOut, panelSpring } from '../core/motion'
import { usePriceTargetFan } from './price-target-fan-context'

const { geo, reduce } = usePriceTargetFan()
const origin = computed(() => `${geo.value.nowX}px ${geo.value.nowY}px`)
</script>

<template>
  <g data-slot="price-target-fan-now">
    <!-- the now dot lands as the history arrives -->
    <motion.circle tabindex="-1" :cx="geo.nowX" :cy="geo.nowY" :r="3.2" fill="var(--beui-foreground)" :initial="{ opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="reduce ? { duration: 0 } : { ...panelSpring, delay: 0.85 }" :style="{ transformOrigin: origin }" />
    <!-- the live tail: a ring leaves the now dot every few seconds -->
    <motion.circle v-if="!reduce" tabindex="-1" :cx="geo.nowX" :cy="geo.nowY" :r="3.2" fill="none" stroke="var(--beui-foreground)" stroke-width="1" :initial="{ opacity: 0, scale: 1 }" :animate="{ opacity: [0.45, 0], scale: [1, 2.8] }"
      :transition="{ duration: 2.2, ease: easeOut, repeat: Infinity, repeatDelay: 1.6, delay: 1.6 }" :style="{ transformOrigin: origin }" />
  </g>
</template>
