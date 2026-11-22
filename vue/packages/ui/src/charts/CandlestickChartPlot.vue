<script setup lang="ts">
/* Candles fade up 12ms apart on first draw. The live candle's body, wick, and volume bar spring to new values as
 * trades print, and the last-price line follows. Pointer or arrow keys move a crosshair with a price tag on the
 * axis. Every moving shape is drawn at unit height and placed with translateY and scaleY, so updates animate
 * transforms only. Reduced motion: no fade or spring; values update in place. */
import { computed, shallowRef, useTemplateRef } from 'vue'
import { motion } from 'motion-v'
import { easeOut, layoutSpring } from '../core/motion'
import { useCandlestickChart } from './candlestick-context'
import { useMeasuredSize } from './plot-utils'

/** Right gutter reserved for price labels, in px. */
const AXIS = 64
const VOLUME_SHARE = 0.18
const GAP = 8
/** Scale from the shape's own top edge rather than its centre. */
const TOP_ORIGIN = { originX: 0, originY: 0 } as const

const { height = 320 } = defineProps<{
  /** Plot height in px. */
  height?: number
}>()
const { t, title, formatPrice, reduce, candles, active, setActive, lastPrice } = useCandlestickChart()

const scale = computed(() => {
  const lows = candles.value.map(candle => candle.low)
  const highs = candles.value.map(candle => candle.high)
  if (lastPrice.value !== undefined) { lows.push(lastPrice.value); highs.push(lastPrice.value) }
  const min = lows.length ? Math.min(...lows) : 0
  const max = highs.length ? Math.max(...highs) : 1
  const pad = Math.max((max - min) * 0.08, max * 0.0005, 0.0001)
  return { min: min - pad, max: max + pad, volumeMax: Math.max(1, ...candles.value.map(candle => candle.volume)) }
})

const root = useTemplateRef<HTMLElement>('root')
const size = useMeasuredSize(root, { width: 0, height: 0 })
const width = computed(() => size.value.width)
const pointerY = shallowRef<number | null>(null)
// Stagger candles only for the first draw, not when the hover dim changes.
const entered = shallowRef(false)

const plotWidth = computed(() => Math.max(0, width.value - AXIS))
const priceHeight = computed(() => height * (1 - VOLUME_SHARE) - GAP)
const slot = computed(() => candles.value.length ? plotWidth.value / candles.value.length : 0)
const body = computed(() => Math.max(1, slot.value * 0.62))
const y = (price: number) => (scale.value.max - price) / (scale.value.max - scale.value.min || 1) * priceHeight.value
const priceAt = (py: number) => scale.value.max - py / priceHeight.value * (scale.value.max - scale.value.min)
const ticks = computed(() => Array.from({ length: 5 }, (_, i) => scale.value.max - (scale.value.max - scale.value.min) * (i + 0.5) / 5))
const spring = computed(() => reduce.value ? { duration: 0 } : layoutSpring)

const shapes = computed(() => candles.value.map((candle, index) => {
  const up = candle.close >= candle.open
  const cx = index * slot.value + slot.value / 2
  const top = y(Math.max(candle.open, candle.close))
  const wickTop = y(candle.high)
  const volumeHeight = Math.max(0.5, candle.volume / scale.value.volumeMax * height * VOLUME_SHARE)
  return {
    id: candle.id, up, cx, index,
    wick: { y: wickTop, scaleY: Math.max(1, y(candle.low) - wickTop) },
    bodyAnim: { y: top, scaleY: Math.max(1, Math.abs(y(candle.open) - y(candle.close))) },
    volumeAnim: { y: height - volumeHeight, scaleY: volumeHeight },
    dimmed: active.value !== null && active.value !== index,
  }
}))

function onPointerMove(event: PointerEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = event.clientX - rect.left
  const py = event.clientY - rect.top
  if (x > plotWidth.value || !slot.value) return
  setActive(Math.min(candles.value.length - 1, Math.max(0, Math.floor(x / slot.value))))
  pointerY.value = py <= priceHeight.value ? py : null
}
function onKeyDown(event: KeyboardEvent) {
  const current = active.value ?? candles.value.length - 1
  let next: number | null = current
  if (event.key === 'ArrowLeft') next = Math.max(0, current - 1)
  else if (event.key === 'ArrowRight') next = Math.min(candles.value.length - 1, current + 1)
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = candles.value.length - 1
  else if (event.key === 'Escape') next = null
  else return
  event.preventDefault()
  pointerY.value = null
  setActive(next)
}
function onPointerLeave() { setActive(null); pointerY.value = null }

const focus = computed(() => active.value !== null ? candles.value[active.value] : candles.value.at(-1))
const crossX = computed(() => active.value !== null ? active.value * slot.value + slot.value / 2 : null)
const valueText = computed(() => focus.value ? t('valueText', {
  label: focus.value.label, open: formatPrice(focus.value.open), high: formatPrice(focus.value.high),
  low: formatPrice(focus.value.low), close: formatPrice(focus.value.close),
}) : undefined)
</script>

<template>
  <div ref="root" class="plot be-candles" data-slot="candlestick-chart-plot" role="slider" tabindex="0" :aria-label="title" aria-valuemin="0" :aria-valuemax="Math.max(0, candles.length - 1)"
    :aria-valuenow="active ?? Math.max(0, candles.length - 1)" :aria-valuetext="valueText" :style="{ height: `${height}px` }"
    @pointermove="onPointerMove" @pointerleave="onPointerLeave" @keydown="onKeyDown" @blur="setActive(null)">
    <svg v-if="width > 0" :width="width" :height="height" class="svg" aria-hidden="true">
      <line v-for="tick in ticks" :key="tick" :x1="0" :x2="plotWidth" :y1="y(tick)" :y2="y(tick)" class="grid" stroke-dasharray="2 6" />
      <motion.g v-for="shape in shapes" :key="shape.id" :class="shape.up ? 'rise' : 'fall'" :initial="reduce ? false : { opacity: 0 }" :animate="{ opacity: shape.dimmed ? 0.45 : 1 }"
        :transition="{ duration: 0.3, ease: easeOut, delay: reduce || entered ? 0 : Math.min(shape.index * 0.012, 0.6) }" @animation-complete="entered = true">
        <motion.line :x1="shape.cx" :x2="shape.cx" :y1="0" :y2="1" vector-effect="non-scaling-stroke" :stroke-width="1" :style="TOP_ORIGIN" :initial="false" :animate="shape.wick" :transition="spring" />
        <motion.rect :x="shape.cx - body / 2" :y="0" :width="body" :height="1" :stroke-width="0" :style="TOP_ORIGIN" :initial="false" :animate="shape.bodyAnim" :transition="spring" />
        <motion.rect :x="shape.cx - body / 2" :y="0" :width="body" :height="1" :stroke-width="0" :opacity="0.28" :style="TOP_ORIGIN" :initial="false" :animate="shape.volumeAnim" :transition="spring" />
      </motion.g>
      <motion.line v-if="lastPrice !== undefined" :x1="0" :x2="plotWidth" :y1="0" :y2="0" :initial="false" :animate="{ y: y(lastPrice) }" :transition="spring" class="last" stroke-dasharray="3 4" />
      <line v-if="crossX !== null" :x1="crossX" :x2="crossX" :y1="0" :y2="height" class="cross" />
      <line v-if="pointerY !== null" :x1="0" :x2="plotWidth" :y1="pointerY" :y2="pointerY" class="cross" />
    </svg>
    <template v-if="width > 0">
      <span v-for="tick in ticks" :key="`t${tick}`" class="tick" :style="{ top: `${y(tick)}px` }">{{ formatPrice(tick) }}</span>
      <motion.div v-if="lastPrice !== undefined" class="tag-wrap" :initial="false" :animate="{ y: y(lastPrice) }" :transition="spring"><span class="tag">{{ formatPrice(lastPrice) }}</span></motion.div>
      <span v-if="pointerY !== null" class="tag pointer" :style="{ top: `${pointerY}px` }">{{ formatPrice(priceAt(pointerY)) }}</span>
    </template>
  </div>
</template>

<style scoped>
.tick, .tag { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); }
.plot { position: relative; width: 100%; cursor: crosshair; touch-action: pan-y; user-select: none; border-radius: 12px; outline: none; }
.plot:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 12%, transparent); }
.svg { position: absolute; inset: 0; overflow: visible; }
.grid { stroke: var(--beui-border); }
.rise { fill: #10b981; stroke: #10b981; }
.fall { fill: #f43f5e; stroke: #f43f5e; }
.last { stroke: var(--beui-foreground); stroke-opacity: .45; }
.cross { stroke: var(--beui-foreground); stroke-opacity: .3; }
.tick { position: absolute; right: 0; padding-right: 4px; transform: translateY(-50%); font-size: 12px; line-height: calc(4 / 3); font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); pointer-events: none; }
.tag-wrap { position: absolute; top: 0; right: 0; pointer-events: none; }
.tag { display: block; padding: 2px 6px; border-radius: 6px; font-size: 12px; line-height: calc(4 / 3); font-variant-numeric: tabular-nums; background: var(--beui-foreground); color: var(--beui-background); transform: translateY(-50%); }
.tag.pointer { position: absolute; right: 0; background: var(--beui-muted); color: var(--beui-foreground); pointer-events: none; }
</style>
