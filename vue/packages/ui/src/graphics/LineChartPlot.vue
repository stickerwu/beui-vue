<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, shallowRef, useId, useTemplateRef, watch, watchEffect } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import TextShimmer from '../effects/TextShimmer.vue'
import { easeInOut, layoutSpring, swapSpring } from '../core/motion'
import { useLineChart } from './chart-model'
import { seriesPaths, type Point } from './chart-geometry'
import { useChartMotion } from './use-chart-motion'

const { height = 288, strokeWidth = 2, showGrid = true, fadeEdges = true } = defineProps<{
  height?: number; strokeWidth?: number; showGrid?: boolean; fadeEdges?: boolean
}>()
const { props, data, visible, index, open, touching, inspect, inspecting, geometry, domain, messages,
  loading, label, valueText, tickText, hidden, hovered, tooltipId, overlay } = useLineChart()
const stage = useTemplateRef('stage')
const host = useTemplateRef('host')
const width = shallowRef(0)
const revealed = shallowRef(false)
const reduced = useReducedMotion()
const ease = [0.16, 1, 0.3, 1] as const
const glide = computed(() => reduced.value || touching.value ? { duration: 0 } : layoutSpring)
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
// Roll the pill's label up when moving right and down when moving left.
const direction = shallowRef(1)
watch(() => (index.value >= 0 && !loading.value ? index.value : null), (next, previous) => {
  if (next !== null && previous !== null && previous !== undefined) direction.value = next < previous ? -1 : 1
})
const EXIT = { opacity: 0, transition: { duration: 0.1, ease } } as const
const FADE = { duration: 0.16, ease } as const
const bandWidth = computed(() => Math.max(80, innerWidth.value * 0.28))
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
  if (event.pointerType === 'touch') touching.value = event.type !== 'pointerup'
  if (!pressing && (event.pointerType === 'touch' || !window.matchMedia('(any-hover: hover)').matches)) return
  const rect = (event.currentTarget as HTMLInputElement).getBoundingClientRect()
  const position = Math.round(Math.max(0, Math.min(1, (event.clientX - rect.left) / (rect.width || 1))) * (count.value - 1))
  if (position !== lastPoint) { inspect(position); lastPoint = position }
}
function leave(event: PointerEvent) {
  lastPoint = null
  if (event.pointerType === 'touch') touching.value = false
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
        <AnimatePresence v-if="showGrid" :initial="false">
          <motion.line v-for="tick in domain.ticks" :key="tick" tabindex="-1" class="axis" :x1="left" :x2="left + innerWidth" y1="0" y2="0" stroke="currentColor" :stroke-opacity="tick === 0 ? .3 : .12"
            :initial="{ opacity: 0, y: yAt(tick) }" :animate="{ opacity: 1, y: yAt(tick) }" :exit="EXIT" :transition="{ opacity: FADE, default: glide }" />
        </AnimatePresence>
        <g v-if="!empty" :mask="`url(#${id}-mask)`">
          <motion.g tabindex="-1" :clip-path="`url(#${id}-clip)`" :initial="false" :animate="{ opacity: loading ? 0 : 1 }" :transition="{ duration: .15, ease }">
            <g v-for="row in paths" :key="row.id" class="series" :opacity="hidden.includes(row.id) ? 0 : hovered && !hidden.includes(hovered) && hovered !== row.id ? .2 : 1">
              <path v-if="props.variant === 'area'" :d="row.area" :fill="`url(#${row.gradient})`" />
              <path :d="row.line" fill="none" :stroke="row.color" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
            </g>
          </motion.g>
        </g>
        <AnimatePresence>
          <motion.g v-if="loading" key="placeholder" tabindex="-1" class="axis" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0, transition: { duration: .12, ease } }" :transition="{ duration: .2, ease }">
            <defs>
              <linearGradient :id="`${id}-band`" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stop-color="white" stop-opacity="0" /><stop offset=".5" stop-color="white" /><stop offset="1" stop-color="white" stop-opacity="0" />
              </linearGradient>
              <mask :id="`${id}-pulse`" maskUnits="userSpaceOnUse" :x="left - bandWidth" y="0" :width="innerWidth + bandWidth * 2" :height="top * 2 + innerHeight">
                <motion.rect tabindex="-1" x="0" y="0" :width="bandWidth" :height="top * 2 + innerHeight" :fill="`url(#${id}-band)`" :initial="{ x: left - bandWidth }" :animate="{ x: left + innerWidth }"
                  :transition="{ duration: 1.6, ease: easeInOut, repeat: Infinity, repeatDelay: .35 }" />
              </mask>
            </defs>
            <!-- Shares the plot's edge fade, so the handoff to real lines keeps its silhouette. -->
            <g :mask="`url(#${id}-mask)`">
              <motion.path tabindex="-1" :d="placeholder" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" :initial="{ strokeOpacity: .22 }"
                :animate="reduced ? { strokeOpacity: [.22, .45, .22] } : { strokeOpacity: .22 }" :transition="reduced ? { duration: 1.8, ease: easeInOut, repeat: Infinity } : undefined" />
              <path v-if="!reduced" :d="placeholder" fill="none" stroke="currentColor" stroke-opacity=".75" :stroke-width="strokeWidth" stroke-linecap="round" :mask="`url(#${id}-pulse)`" />
            </g>
          </motion.g>
        </AnimatePresence>
        <g v-if="inspecting">
          <motion.line x1="0" x2="0" :y1="top" :y2="height - 8" :stroke="`url(#${id}-cross)`" :initial="{ x: crossX, opacity: 0 }" :animate="{ x: crossX, opacity: 1 }" :transition="{ x: glide, opacity: { duration: .12 } }" />
          <motion.g v-for="mark in markers" :key="mark.id" :initial="{ x: mark.x, y: mark.y, opacity: 0, scale: .5 }" :animate="{ x: mark.x, y: mark.y, opacity: 1, scale: 1 }" :transition="{ default: glide, opacity: { duration: .12 } }">
            <circle r="10" :fill="mark.color" opacity=".18" /><circle r="4" :fill="mark.color" stroke="var(--beui-chart-bg, var(--beui-background))" stroke-width="2" />
          </motion.g>
        </g>
      </svg>
      <motion.div v-if="width && !empty" aria-hidden="true" class="axis-labels" :initial="false" :animate="{ opacity: loading ? 0 : 1 }" :transition="{ duration: .15, ease }">
        <AnimatePresence :initial="false">
          <motion.span v-for="tick in domain.ticks" :key="tick" class="value-tick" :style="{ width: `${left - 8}px` }" :initial="{ opacity: 0, y: yAt(tick) }" :animate="{ opacity: 1, y: yAt(tick) }"
            :exit="EXIT" :transition="{ opacity: FADE, default: glide }"><span class="tick-y">{{ tickText(tick) }}</span></motion.span>
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        <motion.output v-if="loading" key="loading" class="loading" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0, y: reduced ? 0 : 8, transition: { duration: .18, ease } }" :transition="{ duration: .2, ease }">
          <TextShimmer v-if="props.loadingLabel ?? messages.loading">{{ props.loadingLabel ?? messages.loading }}</TextShimmer><span v-else class="sr-only">{{ messages.loadingStatus }}</span>
        </motion.output>
      </AnimatePresence>
      <div ref="host" class="inspection" :style="{ left: `${left}px`, top: `${top}px` }">
        <input v-if="!loading && !empty" class="inspector" type="range" :min="0" :max="count - 1" step="1" :value="cursor"
          :aria-label="messages.inspect.replace('{label}', label)" :aria-valuetext="activeText" :aria-describedby="inspecting ? tooltipId : undefined"
          @focus="!pointerFocus && inspect(cursor)" @blur="open = false; pointerFocus = false; pressing = false"
          @pointerenter="pointer" @pointermove="pointer" @pointerdown="pointer" @pointerleave="leave" @pointerup="pressing = false; touching = false"
          @pointercancel="pressing = false; pointerFocus = false; open = false; touching = false" @keydown="keydown" @input="nativeInput" />
      </div>
    </div>
    <motion.div v-if="!empty" aria-hidden="true" class="categories" :initial="false" :animate="{ opacity: loading ? 0 : 1 }" :transition="{ duration: .15, ease }">
      <template v-if="width">
        <span v-for="column in columnLabels" :key="column.category" class="tick" :style="{ left: `${column.position}px`, opacity: inspecting && Math.abs(column.position - crossX) < 40 ? 0 : undefined }">{{ column.category }}</span>
        <AnimatePresence>
          <motion.div v-if="inspecting" key="pill" class="pill-position" :initial="{ x: crossX, opacity: 0 }" :animate="{ x: crossX, opacity: 1 }" :exit="{ opacity: 0, transition: { duration: .1, ease } }" :transition="{ x: glide, opacity: { duration: .12 } }">
            <span class="pill">
              <AnimatePresence mode="popLayout" :initial="false">
                <motion.span :key="data.categories[cursor]" class="pill-label" :initial="{ y: reduced ? 0 : direction * 10, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
                  :exit="{ y: reduced ? 0 : direction * -10, opacity: 0 }" :transition="reduced ? { duration: .12 } : swapSpring">{{ data.categories[cursor] }}</motion.span>
              </AnimatePresence>
            </span>
          </motion.div>
        </AnimatePresence>
      </template>
    </motion.div>
  </div>
</template>

<style scoped>
.chart-plot { width: 100%; min-width: 0; user-select: none; }
.stage, .categories { position: relative; }
.drawing { position: absolute; inset: 0; overflow: visible; }
.axis,.value-tick,.tick { color: var(--beui-chart-muted, var(--beui-muted-foreground)); }
.axis-labels { position: absolute; inset: 0; pointer-events: none; }
.value-tick { position: absolute; top: 0; left: 0; white-space: nowrap; font: 11px/1.5 var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-variant-numeric: tabular-nums; }
.tick-y { display: block; text-align: right; transform: translateY(-50%); }
.centered { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; margin: 0; font-size: 14px; line-height: 20px; color: var(--beui-muted-foreground); }
.loading { position: absolute; left: 44px; right: 16px; top: 12px; bottom: 8px; display: flex; align-items: center; justify-content: center; pointer-events: none; font-size: 12px; line-height: 1.3333; color: var(--beui-muted-foreground); }
.inspection { position: absolute; right: 16px; bottom: 8px; border-radius: 3px; }
.inspection:has(.inspector:focus-visible) { outline: 2px solid var(--beui-chart-ring, color-mix(in srgb, currentColor 12%, transparent)); outline-offset: 4px; }
.inspector { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; touch-action: pan-y; cursor: crosshair; }
.categories { height: 20px; margin-top: 8px; }
.tick { position: absolute; top: 2px; transform: translateX(-50%); white-space: nowrap; font-size: 11px; line-height: 1.5; transition: opacity 150ms; }
.pill-position { position: absolute; left: 0; top: 0; pointer-events: none; }
.pill { display: block; overflow: hidden; transform: translateX(-50%); white-space: nowrap; border-radius: 1rem; padding: 2px 8px; font-size: 11px; font-weight: 500; line-height: 16px; color: var(--beui-chart-bg, var(--beui-background)); background: var(--beui-chart-fg, var(--beui-foreground)); }
.pill-label { display: block; }
.series { transition: opacity 180ms ease-out; }
.sr-only { position: absolute; clip-path: inset(50%); width: 1px; height: 1px; overflow: hidden; }
</style>
