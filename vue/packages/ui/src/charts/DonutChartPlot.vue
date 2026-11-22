<script setup lang="ts">
/* The ring sweeps in once it scrolls into view: it turns from -90deg and grows while segments fade in clockwise,
 * 60ms apart. Hovering a segment, or focusing its legend item, pops it outward from the ring's centre and fades
 * the rest. Everything animates transform and opacity. Hover is read from static hit arcs, so a popping segment
 * never slides out from under the pointer and toggles itself. Reduced motion: the ring appears in place and
 * emphasis changes without easing. */
import { computed, shallowRef, useTemplateRef } from 'vue'
import { motion, useInView } from 'motion-v'
import { easeOut, layoutSpring } from '../core/motion'
import { DONUT_SIZE, useDonutChart } from './donut-context'

const CENTER = DONUT_SIZE / 2
/** Scale around the ring's centre rather than each arc's own box. */
const RING_ORIGIN = { transformBox: 'view-box', transformOrigin: `${CENTER}px ${CENTER}px` } as const

defineSlots<{
  /** Centered overlay, usually `DonutChartCenter`. */
  default?(): unknown
}>()
const { placed, radius, thickness, active, setActive, label, reduce, canHover } = useDonutChart()
const plot = useTemplateRef<HTMLElement>('plot')
const inView = useInView(plot, { once: true, amount: 0.4 })
const shown = computed(() => Boolean(reduce.value) || inView.value)
// Stagger segments only for the first sweep, not when emphasis clears.
const entered = shallowRef(false)
</script>

<template>
  <div ref="plot" class="plot" data-slot="donut-chart-plot">
    <svg :viewBox="`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`" role="img" :aria-label="label" class="svg">
      <circle :cx="CENTER" :cy="CENTER" :r="radius" fill="none" :stroke-width="thickness" class="track" opacity="0.6" />
      <motion.g tabindex="-1" :style="RING_ORIGIN" :initial="reduce ? false : { rotate: -90, scale: 0.88, opacity: 0 }" :animate="shown ? { rotate: 0, scale: 1, opacity: 1 } : undefined"
        :transition="{ duration: 0.9, ease: easeOut }" @animation-complete="entered = true">
        <motion.path v-for="(item, index) in placed" :key="item.id" tabindex="-1" :d="item.path" fill="none" :stroke="item.color" :stroke-width="thickness" stroke-linecap="round" :style="RING_ORIGIN"
          :initial="reduce ? false : { opacity: 0 }"
          :animate="shown ? { opacity: active !== null && active !== item.id ? 0.3 : 1, scale: active === item.id ? 1.05 : 1 } : undefined"
          :transition="reduce ? { duration: 0 } : { opacity: { duration: 0.4, ease: easeOut, delay: entered ? 0 : 0.15 + index * 0.06 }, scale: layoutSpring }"
          pointer-events="none" aria-hidden="true" />
      </motion.g>
      <!-- Static, slightly wider hit arcs own hover. They never scale, so the pointer stays on the same segment while its visual pops. -->
      <g>
        <path v-for="item in placed" :key="item.id" :d="item.path" fill="none" stroke="transparent" :stroke-width="thickness + 8" stroke-linecap="round"
          :pointer-events="shown ? 'stroke' : 'none'" style="cursor: pointer" @pointerenter="canHover && setActive(item.id)" @pointerleave="canHover && setActive(null)" />
      </g>
    </svg>
    <div v-if="$slots.default" class="hole"><slot /></div>
  </div>
</template>

<style scoped>
.plot { position: relative; margin-inline: auto; aspect-ratio: 1 / 1; width: 100%; max-width: 16rem; }
.svg { width: 100%; height: 100%; overflow: visible; }
.track { stroke: var(--beui-muted); }
.hole { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-align: center; pointer-events: none; }
</style>
