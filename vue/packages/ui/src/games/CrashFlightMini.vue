<script setup lang="ts">
import { motion } from 'motion-v'
import { computed } from 'vue'
import { MINI, MINI_REPLAY, type CrashMiniatureProps } from './crash-parts'
import { growth, timeAt } from './crash-round'
import { SWAP } from './game-parts'
import { easeOut } from '../core/motion'

/**
 * The round's flight in miniature, on its own axes so a skip to a huge crash still reads: the curve replays up to
 * your cash out, runs on dashed to the crash, and ends in a cross; a missed target is a dashed line above.
 */
const props = defineProps<CrashMiniatureProps>()

const geo = computed(() => {
  const top = Math.max(props.crash, props.target ?? 1, 1.01)
  const end = timeAt(top)
  const x = (seconds: number) => 4 + (seconds / end) * (MINI.width - 8)
  const y = (value: number) => MINI.height - 4 - ((value - 1) / (top - 1)) * (MINI.height - 8)
  const path = (from: number, to: number) => {
    let d = ''
    for (let i = 0; i <= 24; i++) {
      const s = from + ((to - from) * i) / 24
      d += `${i === 0 ? 'M' : 'L'}${x(s).toFixed(2)},${y(growth(s)).toFixed(2)}`
    }
    return d
  }
  const crashT = timeAt(props.crash)
  const cashT = props.cashed === null ? null : timeAt(props.cashed)
  return { x, y, path, crashT, cashT }
})
const draw = (delay: number) => ({
  initial: { pathLength: props.reduce ? 1 : 0 },
  animate: { pathLength: 1 },
  transition: { ...MINI_REPLAY, delay: props.reduce ? 0 : delay },
})
</script>

<template>
  <svg aria-hidden="true" :viewBox="`0 0 ${MINI.width} ${MINI.height}`" :width="MINI.width" :height="MINI.height" class="mini">
    <line :x1="4" :x2="MINI.width - 4" :y1="MINI.height - 4" :y2="MINI.height - 4" class="base" />
    <line v-if="target !== null" :x1="4" :x2="MINI.width - 4" :y1="geo.y(target)" :y2="geo.y(target)" stroke-dasharray="2 3" class="dim" />
    <motion.path v-if="geo.cashT === null" :d="geo.path(0, geo.crashT)" fill="none" stroke-width="2" stroke-linecap="round" class="lost" v-bind="draw(0.3)" />
    <template v-else>
      <motion.path :d="geo.path(0, geo.cashT)" fill="none" stroke-width="2" stroke-linecap="round" class="won" v-bind="draw(0.3)" />
      <motion.path :d="geo.path(geo.cashT, geo.crashT)" fill="none" stroke-width="1.5" stroke-dasharray="2 3" stroke-linecap="round" class="dim" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.25, ease: easeOut, delay: reduce ? 0 : 0.8 }" />
      <circle :cx="geo.x(geo.cashT)" :cy="geo.y(cashed ?? 1)" r="3" stroke-width="1.5" class="cash" />
    </template>
    <motion.path :d="`M${geo.x(geo.crashT) - 2.5},${geo.y(crash) - 2.5}l5,5m0,-5l-5,5`" stroke-width="1.75" stroke-linecap="round" class="lost cross" fill="none"
      :initial="reduce ? { opacity: 0 } : { opacity: 0, scale: 0.25 }" :animate="{ opacity: 1, scale: 1 }" :style="{ transformBox: 'fill-box', transformOrigin: 'center' }" :transition="{ ...SWAP, delay: reduce ? 0 : 0.85 }" />
  </svg>
</template>

<style scoped>
.mini { flex: none; overflow: visible; }
.base { stroke: var(--beui-border); }
.dim { stroke: color-mix(in oklab, var(--beui-muted-foreground) 60%, transparent); fill: none; }
.lost { stroke: #f43f5e; }
.won { stroke: var(--beui-primary); }
.cash { fill: var(--beui-card); stroke: var(--beui-primary); }
</style>
