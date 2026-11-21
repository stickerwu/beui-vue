<script lang="ts">
/** English defaults. Override per instance with `messages`. */
export const sparklineMessages = {
  inspect: '{label}: inspect samples',
  sample: 'Sample {index}',
  sampleValue: '{name}: {value}',
  range: 'from {first} to {last}',
  up: 'up {percent}%',
  down: 'down {percent}%',
  missing: 'no data',
  noData: 'No data',
}
export type SparklineMessages = typeof sparklineMessages
</script>

<script setup lang="ts">
/* A compact trend for tables, stat cards and inline text. New values morph the line on the same spring as
 * LineChart, and the end dot follows. With `interactive`, hovering, dragging or arrow keys move a dot along the
 * line and the readout shows that sample. Reduced motion: values update in place. */
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import NumberTicker from '../numeric/NumberTicker.vue'
import { layoutSpring } from '../core/motion'
import { seriesPaths, type LineChartCurve, type Point } from '../graphics/chart-geometry'
import { useChartMotion } from '../graphics/use-chart-motion'
import XYInspector from './XYInspector.vue'
import { interpolate, useHoverCapable, useMeasuredSize } from './plot-utils'

const PAD = 3
const props = withDefaults(defineProps<{
  /** Samples in display order. Missing or non-finite values leave a gap. */
  data: readonly (number | null)[]
  /** Optional sample labels, such as dates, used by the interactive readout. */
  labels?: readonly string[]
  /** Accessible name, such as "Revenue, last 30 days". */
  label: string
  variant?: 'line' | 'area'
  curve?: LineChartCurve
  /** Any CSS color. Defaults to the current text color. */
  color?: string
  /** Height in px. Width follows the container. */
  height?: number
  strokeWidth?: number
  /** Show the change from the first to the last sample as a badge. */
  showDelta?: boolean
  /** Color a fall green and a rise red, for metrics where lower is better. */
  invertDelta?: boolean
  /** Hover, drag or arrow keys to read individual samples. Adds one tab stop. */
  interactive?: boolean
  formatValue?: (value: number) => string
  messages?: Partial<SparklineMessages>
}>(), { variant: 'line', curve: 'monotone', color: 'currentColor', height: 32, strokeWidth: 1.5, showDelta: false, invertDelta: false, interactive: false })

const number = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })
const t = (key: keyof SparklineMessages, values?: Record<string, string | number>) => interpolate(props.messages?.[key] ?? sparklineMessages[key], values)
const format = (value: number) => (props.formatValue ?? number.format)(value)
const reduce = useReducedMotion()
const canHover = useHoverCapable()
const gradient = useId()
const tooltipId = useId()
const host = useTemplateRef<HTMLElement>('host')
const size = useMeasuredSize(host, { width: 0, height: props.height })
const width = computed(() => size.value.width)
const activeIndex = shallowRef(-1)
const open = shallowRef(false)
// Under a finger the readout dot tracks the touch directly instead of gliding.
const touching = shallowRef(false)
// A sample inspected before the data shrank no longer exists.
const active = computed(() => activeIndex.value >= 0 && activeIndex.value < props.data.length ? activeIndex.value : -1)
const values = computed(() => props.data.map(value => typeof value === 'number' && Number.isFinite(value) ? value : null))
const present = computed(() => values.value.filter((value): value is number => value !== null))
// Fit the data tightly: a zero baseline would flatten a metric that sits far from zero.
const lo = computed(() => present.value.length ? Math.min(...present.value) : 0)
const hi = computed(() => present.value.length ? Math.max(...present.value) : 1)
const x = (index: number) => PAD + (values.value.length === 1 ? (width.value - PAD * 2) / 2 : (index / (values.value.length - 1)) * (width.value - PAD * 2))
const y = (value: number) => hi.value === lo.value ? props.height / 2 : PAD + ((hi.value - value) / (hi.value - lo.value)) * (props.height - PAD * 2)

const targets = computed(() => {
  const map = new Map<string, Point>()
  if (width.value > 0) {
    map.set('baseline', { x: 0, y: props.height })
    values.value.forEach((value, index) => { if (value !== null) map.set(String(index), { x: x(index), y: y(value) }) })
  }
  return map
})
const animated = useChartMotion(targets, width)
const paths = computed(() => {
  const baseline = animated.value.get('baseline')
  if (!baseline) return { line: '', area: '' }
  // Indexed by position: a live sparkline shifts every sample left as it ticks.
  return seriesPaths(values.value.map((value, index) => value === null ? null : animated.value.get(String(index)) ?? null), props.curve, baseline.y)
})

const lastIndex = computed(() => { for (let index = values.value.length - 1; index >= 0; index--) if (values.value[index] !== null) return index; return -1 })
const firstIndex = computed(() => values.value.findIndex(value => value !== null))
const last = computed(() => lastIndex.value >= 0 ? values.value[lastIndex.value] as number : null)
const first = computed(() => firstIndex.value >= 0 ? values.value[firstIndex.value] as number : null)
const delta = computed(() => first.value !== null && last.value !== null && first.value !== 0 ? ((last.value - first.value) / Math.abs(first.value)) * 100 : null)
const trend = computed(() => delta.value === null || Math.abs(delta.value) < 0.05 ? 'flat' : delta.value > 0 ? 'up' : 'down')
const tone = computed(() => trend.value === 'flat' ? 'flat' : (trend.value === 'up') !== props.invertDelta ? 'good' : 'bad')
const inspecting = computed(() => props.interactive && open.value && active.value >= 0 && values.value[active.value] !== null)
const dotIndex = computed(() => inspecting.value ? active.value : lastIndex.value)
const dotValue = computed(() => dotIndex.value >= 0 ? values.value[dotIndex.value] : null)
const name = (index: number) => props.labels?.[index] ?? t('sample', { index: index + 1 })
const summary = computed(() => [
  props.label,
  first.value !== null && last.value !== null ? t('range', { first: format(first.value), last: format(last.value) }) : t('missing'),
  delta.value !== null && trend.value !== 'flat' ? t(trend.value as 'up' | 'down', { percent: Math.abs(delta.value).toFixed(1) }) : null,
].filter(Boolean).join(', '))
const valueText = (index: number) => {
  const value = values.value[index]
  return t('sampleValue', { name: name(index), value: value === null || value === undefined ? t('missing') : format(value) })
}
</script>

<template>
  <div class="sparkline" data-slot="sparkline">
    <div ref="host" class="plot" :style="{ height: `${height}px`, color }">
      <svg role="img" :aria-label="summary" :width="width || undefined" :height="height" class="svg">
        <template v-if="variant === 'area'">
          <defs>
            <linearGradient :id="gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="currentColor" stop-opacity="0.3" />
              <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path :d="paths.area" :fill="`url(#${gradient})`" />
        </template>
        <path :d="paths.line" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
        <motion.circle v-if="width > 0 && dotValue !== null && dotValue !== undefined" tabindex="-1" :r="inspecting ? 3.5 : 2.5" :cx="0" :cy="0" fill="currentColor"
          class="dot" :stroke-width="inspecting ? 2 : 0" :initial="false" :animate="{ x: x(dotIndex), y: y(dotValue) }" :transition="reduce || touching ? { duration: 0 } : layoutSpring" />
      </svg>
      <div v-if="interactive && present.length" class="inspector">
        <XYInspector :count="values.length" :active-index="active" :label="t('inspect', { label })" :value-text="valueText" mode="point" :open="open"
          :described-by="tooltipId" :can-hover="canHover" @active="activeIndex = $event" @update:open="open = $event" @touch-change="touching = $event" />
      </div>
    </div>
    <span v-if="interactive && present.length" :id="tooltipId" :aria-hidden="!inspecting" class="readout">
      <span class="value">
        <NumberTicker v-if="dotValue !== null && dotValue !== undefined" :value="dotValue" :format="() => format(dotValue as number)" :start-on-view="false" :duration="0.2" :stagger="0" class-name="spark-ticker" />
        <template v-else>{{ t('noData') }}</template>
      </span>
      <motion.span tabindex="-1" class="caption" :initial="false" :animate="{ opacity: inspecting ? 1 : 0 }" :transition="{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }">{{ inspecting ? name(active) : ' ' }}</motion.span>
    </span>
    <span v-if="showDelta && delta !== null" aria-hidden="true" class="delta" :class="tone">{{ trend === 'up' ? '+' : trend === 'down' ? '−' : '' }}{{ Math.abs(delta).toFixed(1) }}%</span>
  </div>
</template>

<style scoped>
.sparkline { display: inline-flex; width: 100%; min-width: 0; align-items: center; gap: 8px; }
.plot { position: relative; min-width: 0; flex: 1 1 0%; }
.svg { position: absolute; inset: 0; overflow: visible; }
.dot { stroke: var(--beui-background, #fff); }
.inspector { position: absolute; inset: 0; border-radius: 2px; }
.inspector:has(:focus-visible) { outline: 2px solid rgb(17 17 17 / 12%); outline-offset: 2px; }
.readout { flex: none; text-align: right; font-size: 12px; line-height: 1.25; font-variant-numeric: tabular-nums; }
.value { display: block; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); }
.value :deep(.spark-ticker) { white-space: pre; }
.caption { display: block; font-size: 10px; color: var(--beui-muted-foreground); }
.delta { flex: none; border-radius: 6px; padding: 2px 6px; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 11px; line-height: 16px; font-variant-numeric: tabular-nums; }
.delta.good { background: rgb(16 185 129 / 10%); color: #059669; }
.delta.bad { background: rgb(244 63 94 / 10%); color: #e11d48; }
.delta.flat { background: var(--beui-muted); color: var(--beui-muted-foreground); }
:global(.dark .sparkline .inspector:has(:focus-visible)) { outline-color: rgb(255 255 255 / 10%); }
:global(.dark .sparkline .delta.good) { color: #34d399; }
:global(.dark .sparkline .delta.bad) { color: #fb7185; }
</style>
