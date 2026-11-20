<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, shallowRef, useId, useTemplateRef, watchEffect } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import { useLineChart } from './chart-model'
import { seriesPaths, type Point } from './chart-geometry'
import { useChartMotion } from './use-chart-motion'

const { height = 288, strokeWidth = 2, showGrid = true, fadeEdges = true } = defineProps<{
  height?: number; strokeWidth?: number; showGrid?: boolean; fadeEdges?: boolean
}>()
const { props, data, visible, index, open, inspect, inspecting, geometry, domain, messages,
  loading, label, valueText, tickText, hidden, hovered, tooltipId, overlay } = useLineChart()
const stage = useTemplateRef('stage')
const host = useTemplateRef('host')
const width = shallowRef(0)
const revealed = shallowRef(false)
const reduced = useReducedMotion()
const ease = [0.16, 1, 0.3, 1] as const
const glide = computed(() => reduced.value ? { duration: 0 } : { type: 'spring' as const, stiffness: 400, damping: 40 })
const id = useId()
const left = 44
const top = 12
const innerWidth = computed(() => Math.max(0, width.value - left - 16))
const innerHeight = computed(() => Math.max(1, height - top - 8))
const count = computed(() => data.value.categories.length)
const empty = computed(() => !count.value || !data.value.rows.length)
const cursor = computed(() => index.value < 0 ? Math.max(0, count.value - 1) : index.value)
const xAt = (position: number) => left + (count.value > 1 ? position / (count.value - 1) : 0.5) * innerWidth.value
const yAt = (value: number) => top + (domain.value.max - value) / (domain.value.max - domain.value.min) * innerHeight.value
const stride = computed(() => Math.max(1, Math.ceil(count.value * 64 / Math.max(1, innerWidth.value))))
const columnLabels = computed(() => data.value.categories.flatMap((category, position) =>
  (count.value - 1 - position) % stride.value ? [] : [{ category, position: xAt(position) }]))
const pointKey = (row: string, column: string) => JSON.stringify([row, column])
const baseline = 'baseline'
const targets = computed(() => {
  const values = new Map<string, Point>()
  if (!width.value) return values
  values.set(baseline, { x: 0, y: yAt(Math.max(domain.value.min, Math.min(domain.value.max, 0))) })
  for (const row of data.value.rows) {
    row.values.forEach((value, position) => {
      if (value !== null) values.set(pointKey(row.id, data.value.categories[position]), { x: xAt(position), y: yAt(value) })
    })
  }
  return values
})
const animated = useChartMotion(targets, width)
const paths = computed(() => data.value.rows.map((row, rowIndex) => {
  const samples = data.value.categories.map(category => animated.value.get(pointKey(row.id, category)) ?? null)
  return { ...row, gradient: `${id}-area-${rowIndex}`, ...seriesPaths(samples, props.curve ?? 'monotone', animated.value.get(baseline)?.y ?? 0) }
}))
const crossX = computed(() => xAt(cursor.value))
const markers = computed(() => visible.value.flatMap(row => {
  const point = animated.value.get(pointKey(row.id, data.value.categories[cursor.value]))
  return point ? [{ ...point, id: row.id, color: row.color }] : []
}))
const activeText = computed(() => [data.value.categories[cursor.value], ...visible.value.map(row => {
  const value = row.values[cursor.value]
  return messages.value.seriesValue.replace('{name}', row.name).replace('{value}', value == null ? messages.value.missing : valueText(value))
})].join('. '))
const placeholder = computed(() => seriesPaths(Array.from({ length: 16 }, (_, step) => {
  const fraction = step / 15
  return { x: left + fraction * innerWidth.value, y: top + innerHeight.value * (0.62 - fraction * 0.18 + Math.sin(fraction * Math.PI * 3) * 0.07) }
}), 'monotone', height).line)
const edgeFraction = computed(() => Math.min(0.08, 32 / Math.max(1, innerWidth.value)))
let resizeObserver: ResizeObserver | undefined
let intersection: IntersectionObserver | undefined
onMounted(() => {
  const element = stage.value
  if (!element) return
  width.value = element.clientWidth
  resizeObserver = new ResizeObserver(() => { width.value = element.clientWidth })
  resizeObserver.observe(element)
  if ('IntersectionObserver' in window) {
    intersection = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { revealed.value = true; intersection?.disconnect() }
    }, { threshold: 0.3 })
    intersection.observe(element)
  } else revealed.value = true
})
watchEffect(() => { overlay.value = host.value; geometry.value = { width: innerWidth.value, height: innerHeight.value } })
onBeforeUnmount(() => { resizeObserver?.disconnect(); intersection?.disconnect(); overlay.value = null })

let pointerFocus = false
let pressing = false
let lastPoint: number | null = null
function pointer(event: PointerEvent) {
  if (event.type === 'pointerdown') { pressing = true; pointerFocus = true; lastPoint = null }
  if (!pressing && (event.pointerType === 'touch' || !window.matchMedia('(any-hover: hover)').matches)) return
  const rect = (event.currentTarget as HTMLInputElement).getBoundingClientRect()
  const position = Math.round(Math.max(0, Math.min(1, (event.clientX - rect.left) / (rect.width || 1))) * (count.value - 1))
  if (position !== lastPoint) { inspect(position); lastPoint = position }
}
function leave(event: PointerEvent) {
  lastPoint = null
  if (event.pointerType !== 'touch' && (pointerFocus || document.activeElement !== event.currentTarget)) open.value = false
}
function keydown(event: KeyboardEvent) {
  pointerFocus = false
  pressing = false
  if (event.key === 'Escape') open.value = false
  else if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) inspect(cursor.value)
}
function nativeInput(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  if (pressing) input.value = String(cursor.value)
  else inspect(input.valueAsNumber)
}
</script>

<template>
  <div class="chart-plot" data-slot="line-chart-plot">
    <div ref="stage" class="stage" :style="{ height: `${height}px` }">
      <p v-if="empty && !loading" class="centered">{{ messages.noData }}</p>
      <svg v-if="width && (!empty || loading)" aria-hidden="true" class="drawing" :width="width" :height="height">
        <defs>
          <clipPath :id="`${id}-clip`"><motion.rect x="0" y="-16" :width="width" :height="height + 32" :style="{ originX: 0 }"
            :initial="reduced ? false : { scaleX: 0 }" :animate="{ scaleX: (revealed && !loading) || reduced ? 1 : 0 }"
            :transition="revealed ? { duration: .7, delay: .12, ease } : { duration: 0 }" /></clipPath>
          <linearGradient :id="`${id}-edges`" gradientUnits="userSpaceOnUse" :x1="left" :x2="left + innerWidth" y1="0" y2="0">
            <stop offset="0" stop-color="white" :stop-opacity="fadeEdges ? 0 : 1" /><stop :offset="edgeFraction" stop-color="white" />
            <stop :offset="1 - edgeFraction" stop-color="white" /><stop offset="1" stop-color="white" :stop-opacity="fadeEdges ? 0 : 1" />
          </linearGradient>
          <mask :id="`${id}-mask`" maskUnits="userSpaceOnUse" x="0" :width="width" y="-16" :height="height + 32">
            <rect y="-16" :width="width" :height="height + 32" :fill="`url(#${id}-edges)`" />
            <motion.rect x="0" y="-16" :width="width" :height="height + 32" fill="black"
              :initial="{ x: left, opacity: 0 }" :animate="{ x: index < 0 ? left : crossX, opacity: inspecting ? .6 : 0 }"
              :transition="{ x: glide, opacity: { duration: .18, ease } }" />
          </mask>
          <linearGradient :id="`${id}-cross`" gradientUnits="userSpaceOnUse" x1="0" x2="0" :y1="top" :y2="height - 8">
            <stop stop-color="currentColor" stop-opacity="0" /><stop offset=".25" stop-color="currentColor" stop-opacity=".35" />
            <stop offset=".75" stop-color="currentColor" stop-opacity=".35" /><stop offset="1" stop-color="currentColor" stop-opacity="0" />
          </linearGradient>
          <linearGradient v-for="row in paths" :id="row.gradient" :key="row.id" x1="0" x2="0" y1="0" y2="1">
            <stop :stop-color="row.color" :stop-opacity="paths.length > 1 ? .14 : .28" /><stop offset="1" :stop-color="row.color" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g v-if="showGrid" class="axis">
          <line v-for="tick in domain.ticks" :key="tick" :x1="left" :x2="left + innerWidth" :y1="yAt(tick)" :y2="yAt(tick)" stroke="currentColor" :stroke-opacity="tick === 0 ? .3 : .12" />
        </g>
        <g :mask="`url(#${id}-mask)`">
          <path v-if="loading" class="placeholder" :d="placeholder" fill="none" stroke="currentColor" :stroke-width="strokeWidth" />
          <g v-else :clip-path="`url(#${id}-clip)`">
            <g v-for="row in paths" :key="row.id" class="series" :opacity="hidden.includes(row.id) ? 0 : hovered && !hidden.includes(hovered) && hovered !== row.id ? .2 : 1">
              <path v-if="props.variant === 'area'" :d="row.area" :fill="`url(#${row.gradient})`" />
              <path :d="row.line" fill="none" :stroke="row.color" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
            </g>
          </g>
        </g>
        <g v-if="inspecting">
          <motion.line x1="0" x2="0" :y1="top" :y2="height - 8" :stroke="`url(#${id}-cross)`" :initial="{ x: crossX, opacity: 0 }" :animate="{ x: crossX, opacity: 1 }" :transition="{ x: glide, opacity: { duration: .12 } }" />
          <motion.g v-for="mark in markers" :key="mark.id" :initial="{ x: mark.x, y: mark.y, opacity: 0, scale: .5 }" :animate="{ x: mark.x, y: mark.y, opacity: 1, scale: 1 }" :transition="{ default: glide, opacity: { duration: .12 } }">
            <circle r="10" :fill="mark.color" opacity=".18" /><circle r="4" :fill="mark.color" stroke="var(--beui-chart-bg, var(--beui-background))" stroke-width="2" />
          </motion.g>
        </g>
      </svg>
      <div v-if="width && !loading && !empty" aria-hidden="true" class="axis-labels">
        <span v-for="tick in domain.ticks" :key="tick" class="value-tick" :style="{ top: `${yAt(tick)}px`, width: `${left - 8}px` }">{{ tickText(tick) }}</span>
      </div>
      <output v-if="loading" class="centered">{{ props.loadingLabel ?? messages.loading }}<span v-if="props.loadingLabel === ''" class="sr-only">{{ messages.loadingStatus }}</span></output>
      <div ref="host" class="inspection" :style="{ left: `${left}px`, top: `${top}px` }">
        <input v-if="!loading && !empty" class="inspector" type="range" :min="0" :max="count - 1" step="1" :value="cursor"
          :aria-label="messages.inspect.replace('{label}', label)" :aria-valuetext="activeText" :aria-describedby="inspecting ? tooltipId : undefined"
          @focus="!pointerFocus && inspect(cursor)" @blur="open = false; pointerFocus = false; pressing = false"
          @pointerenter="pointer" @pointermove="pointer" @pointerdown="pointer" @pointerleave="leave" @pointerup="pressing = false"
          @pointercancel="pressing = false; pointerFocus = false; open = false" @keydown="keydown" @input="nativeInput" />
      </div>
    </div>
    <div v-if="!empty" aria-hidden="true" class="categories">
      <template v-if="width && !loading">
        <span v-for="column in columnLabels" :key="column.category" class="tick" :style="{ left: `${column.position}px`, opacity: inspecting && Math.abs(column.position - crossX) < 40 ? 0 : undefined }">{{ column.category }}</span>
        <motion.div v-if="inspecting" class="pill-position" :initial="{ x: crossX, opacity: 0 }" :animate="{ x: crossX, opacity: 1 }" :transition="{ x: glide, opacity: { duration: .12 } }"><span class="pill">{{ data.categories[cursor] }}</span></motion.div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.chart-plot { width: 100%; min-width: 0; user-select: none; }
.stage, .categories { position: relative; }
.drawing { position: absolute; inset: 0; overflow: visible; }
.axis,.value-tick,.tick { color: var(--beui-chart-muted, var(--beui-muted-foreground)); }
.axis-labels { position: absolute; inset: 0; pointer-events: none; }
.value-tick { position: absolute; left: 0; text-align: right; transform: translateY(-50%); font: 11px/1.5 ui-monospace, monospace; font-variant-numeric: tabular-nums; }
.centered { position: absolute; inset: 0; display: grid; place-items: center; font: inherit; font-size: 13px; opacity: .72; }
.inspection { position: absolute; right: 16px; bottom: 8px; border-radius: 3px; }
.inspection:has(.inspector:focus-visible) { outline: 2px solid var(--beui-chart-ring, color-mix(in srgb, currentColor 12%, transparent)); outline-offset: 4px; }
.inspector { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; touch-action: pan-y; cursor: crosshair; }
.categories { height: 20px; margin-top: 8px; }
.tick { position: absolute; top: 2px; transform: translateX(-50%); white-space: nowrap; font-size: 11px; line-height: 1.5; transition: opacity 150ms; }
.pill-position { position: absolute; left: 0; top: 0; pointer-events: none; }
.pill { display: block; transform: translateX(-50%); white-space: nowrap; border-radius: 1rem; padding: 2px 8px; font-size: 11px; font-weight: 500; line-height: 16px; color: var(--beui-chart-bg, var(--beui-background)); background: var(--beui-chart-fg, var(--beui-foreground)); }
.series { transition: opacity 180ms ease-out; }
.placeholder { opacity: .35; }
.sr-only { position: absolute; clip-path: inset(50%); width: 1px; height: 1px; overflow: hidden; }
@media (prefers-reduced-motion: no-preference) {
  .placeholder { animation: pulse 1600ms ease-in-out infinite alternate; }
}
@keyframes pulse { to { opacity: .65; } }
</style>
