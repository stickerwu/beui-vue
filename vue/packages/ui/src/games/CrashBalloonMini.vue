<script setup lang="ts">
import { motion } from 'motion-v'
import CrashEnvelope from './CrashEnvelope.vue'
import Parachute from './Parachute.vue'
import { MINI, MINI_REPLAY, type CrashMiniatureProps } from './crash-parts'
import { SWAP } from './game-parts'
import { easeOut } from '../core/motion'

/**
 * The round as a tiny altimeter, on its own log scale so a skip to a huge crash still reads: the climb rises up the
 * tape, a parachute hangs where you bailed out, the balloon pops at the crash height, and a missed target is a dashed line above it.
 */
const props = defineProps<CrashMiniatureProps>()

const top = Math.max(props.crash, props.target ?? 1, 1.01)
// Room above the top level for the popped balloon.
const y = (value: number) => MINI.height - 4 - (Math.log(value) / Math.log(top)) * (MINI.height - 14)
const tape = 12
const won = props.cashed !== null
const reach = won ? props.cashed! : props.crash
const after = (extra: number) => (props.reduce ? 0 : MINI_REPLAY.delay + extra)
const pop = {
  initial: props.reduce ? { opacity: 0 } : { opacity: 0, scale: 0.25 },
  animate: { opacity: 1, scale: 1 },
  style: { transformBox: 'fill-box', transformOrigin: 'center' } as const,
}
</script>

<template>
  <svg aria-hidden="true" :viewBox="`0 0 ${MINI.width} ${MINI.height}`" :width="MINI.width" :height="MINI.height" class="mini">
    <line :x1="tape" :x2="tape" y1="4" :y2="MINI.height - 4" class="base" />
    <line :x1="tape - 3" :x2="tape + 3" :y1="MINI.height - 4" :y2="MINI.height - 4" class="base" />
    <line v-if="target !== null" :x1="tape" :x2="MINI.width - 4" :y1="y(target)" :y2="y(target)" stroke-dasharray="2 3" class="dim" />
    <!-- The climb up the tape, replayed. -->
    <motion.line :x1="tape" :x2="tape" :y1="y(1)" :y2="y(reach)" stroke-width="2.5" stroke-linecap="round" :class="won ? 'won' : 'lost'"
      :initial="{ pathLength: reduce ? 1 : 0 }" :animate="{ pathLength: 1 }" :transition="{ ...MINI_REPLAY, delay: after(0) }" />
    <template v-if="won && cashed !== null">
      <motion.line :x1="tape" :x2="tape" :y1="y(cashed)" :y2="y(crash)" stroke-width="1.5" stroke-dasharray="2 3" class="dim" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.25, ease: easeOut, delay: after(0.5) }" />
      <line :x1="tape" x2="34" :y1="y(cashed)" :y2="y(cashed)" stroke-dasharray="1 2" class="won-soft" />
      <g :transform="`translate(40,${(y(cashed) - 5).toFixed(2)}) scale(0.6)`">
        <motion.g v-bind="pop" :transition="{ ...SWAP, delay: after(0.45) }"><Parachute /></motion.g>
      </g>
    </template>
    <line :x1="tape" x2="56" :y1="y(crash)" :y2="y(crash)" stroke-dasharray="1 2" class="dim-soft" />
    <g :transform="`translate(64,${y(crash).toFixed(2)})`">
      <motion.g v-bind="pop" :transition="{ ...SWAP, delay: after(0.55) }">
        <!-- The popped balloon, faded, with the crash's cross over it. -->
        <g transform="scale(0.26)" opacity="0.45" :class="won ? 'ghost' : 'lostc'"><CrashEnvelope /></g>
        <path d="M-3,-3L3,3M3,-3L-3,3" stroke-width="1.75" stroke-linecap="round" class="lost" fill="none" />
      </motion.g>
    </g>
  </svg>
</template>

<style scoped>
.mini { flex: none; overflow: visible; }
.base { stroke: var(--beui-border); }
.dim { stroke: color-mix(in oklab, var(--beui-muted-foreground) 60%, transparent); }
.dim-soft { stroke: color-mix(in oklab, var(--beui-muted-foreground) 50%, transparent); }
.lost { stroke: #f43f5e; }
.won { stroke: var(--beui-primary); }
.won-soft { stroke: color-mix(in srgb, var(--beui-primary) 50%, transparent); }
.ghost { color: var(--beui-muted-foreground); }
.lostc { color: #f43f5e; }
</style>
