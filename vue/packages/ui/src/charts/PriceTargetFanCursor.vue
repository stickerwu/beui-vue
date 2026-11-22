<script setup lang="ts">
import { motion } from 'motion-v'
import { glideSpring } from '../core/motion'
import { PTF_H as H, PTF_PAD as PAD, usePriceTargetFan } from './price-target-fan-context'

const { scrub, geo, y, hist, fadeId, reduce } = usePriceTargetFan()
</script>

<template>
  <g data-slot="price-target-fan-cursor">
    <!-- the scrub crosshair flows along the history on a spring instead of stepping cell to cell, so a slow drag reads as one continuous read-out -->
    <g v-if="scrub !== null" pointer-events="none">
      <motion.line tabindex="-1" :y1="PAD.t" :y2="H - PAD.b" :stroke="`url(#${fadeId})`" stroke-width="1" :initial="false" :animate="{ x1: geo.hx(scrub), x2: geo.hx(scrub) }" :transition="reduce ? { duration: 0 } : glideSpring" />
      <motion.circle tabindex="-1" :r="3.2" fill="var(--beui-foreground)" stroke="var(--beui-background)" stroke-width="1.5" :initial="false" :animate="{ cx: geo.hx(scrub), cy: y(hist[scrub]) }" :transition="reduce ? { duration: 0 } : glideSpring" />
    </g>
  </g>
</template>
