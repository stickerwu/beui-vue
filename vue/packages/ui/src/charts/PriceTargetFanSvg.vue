<script setup lang="ts">
import { onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { motion } from 'motion-v'
import { easeOut } from '../core/motion'
import PriceTargetFanAxes from './PriceTargetFanAxes.vue'
import PriceTargetFanCursor from './PriceTargetFanCursor.vue'
import PriceTargetFanHistory from './PriceTargetFanHistory.vue'
import PriceTargetFanNow from './PriceTargetFanNow.vue'
import PriceTargetFanTargets from './PriceTargetFanTargets.vue'
import { PTF_H as H, PTF_PAD as PAD, PTF_W as W, usePriceTargetFan } from './price-target-fan-context'

defineSlots<{
  /** Compose the chart layers (`PriceTargetFanAxes`, `...History`, `...Targets`, `...Now`, `...Cursor`); omit it for all of them. */
  default?(): unknown
}>()
const { label, mean, fmt, current, onMove, setActive, fadeId, clipId, reduce, geo, t, setSvg } = usePriceTargetFan()
const svg = useTemplateRef<SVGSVGElement>('svg')
watch(svg, element => { setSvg(element) }, { immediate: true, flush: 'post' })
onBeforeUnmount(() => { setSvg(null) })
</script>

<template>
  <svg ref="svg" class="chart" data-slot="price-target-fan-svg" :viewBox="`0 0 ${W} ${H}`" role="group" :aria-label="t('chart', { label, mean: fmt(mean.price), current: fmt(current) })"
    @pointermove="onMove" @pointerleave="$event.pointerType !== 'touch' && setActive(null)">
    <defs>
      <!-- both vertical guides fade out toward the top so they read as markers, not walls -->
      <linearGradient :id="fadeId" gradientUnits="userSpaceOnUse" x1="0" :y1="PAD.t" x2="0" :y2="H - PAD.b">
        <stop offset="0" stop-color="var(--ptf-border-strong)" stop-opacity="0" /><stop offset="0.45" stop-color="var(--ptf-border-strong)" stop-opacity="1" /><stop offset="1" stop-color="var(--ptf-border-strong)" stop-opacity="1" />
      </linearGradient>
      <!-- the fan reveals left to right through this clip, so the dashed projections draw as lines -->
      <clipPath :id="clipId"><motion.rect tabindex="-1" :x="geo.nowX" :y="0" :height="H" :initial="{ width: reduce ? W - geo.nowX : 0 }" :animate="{ width: W - geo.nowX }" :transition="reduce ? { duration: 0 } : { duration: 0.8, ease: easeOut, delay: 0.85 }" /></clipPath>
    </defs>
    <slot>
      <PriceTargetFanAxes />
      <PriceTargetFanHistory />
      <PriceTargetFanTargets />
      <PriceTargetFanNow />
      <PriceTargetFanCursor />
    </slot>
  </svg>
</template>

<style scoped>
.chart { display: block; width: 100%; height: auto; cursor: crosshair; }
.chart :deep(*) { cursor: crosshair; }
</style>
