<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, shallowRef, useId, useTemplateRef } from 'vue'
import { seriesPaths, type LineChartCurve } from '../graphics/chart-geometry'
import ChartInspector from './ChartInspector.vue'

const { data, label, labels = [], variant = 'line', curve = 'monotone', color = 'currentColor', height = 40,
  strokeWidth = 2, showDelta = false, invertDelta = false, interactive = false, formatValue = value => value.toLocaleString('en-US'), messages = {} } = defineProps<{
  data: readonly (number | null)[]; label: string; labels?: readonly string[]; variant?: 'line' | 'area'; curve?: LineChartCurve
  color?: string; height?: number; strokeWidth?: number; showDelta?: boolean; invertDelta?: boolean; interactive?: boolean
  formatValue?: (value: number) => string; messages?: Partial<{ noData: string; inspect: string; sample: string }>
}>()
const host = useTemplateRef('host')
const width = shallowRef(160)
const active = shallowRef(-1)
const gradient = useId()
const values = computed(() => data.map(value => typeof value === 'number' && Number.isFinite(value) ? value : null))
const valid = computed(() => values.value.filter((value): value is number => value !== null))
const points = computed(() => {
  const min = Math.min(...valid.value), max = Math.max(...valid.value)
  return values.value.map((value, index) => value === null ? null : ({
    x: 3 + (values.value.length < 2 ? .5 : index / (values.value.length - 1)) * (width.value - 6),
    y: 3 + (max === min ? .5 : (max - value) / (max - min)) * (height - 6),
  }))
})
const paths = computed(() => seriesPaths(points.value, curve, height - 3))
const delta = computed(() => {
  const first = valid.value[0], last = valid.value.at(-1)
  return first && last !== undefined ? (last - first) / Math.abs(first) * 100 : null
})
const descriptions = computed(() => values.value.map((value, index) => `${labels[index] ?? `${messages.sample ?? 'Sample'} ${index + 1}`}: ${value === null ? messages.noData ?? 'No data' : formatValue(value)}`))
const summary = computed(() => `${label}. ${valid.value.length ? `${formatValue(valid.value[0])} → ${formatValue(valid.value[valid.value.length - 1])}` : messages.noData ?? 'No data'}`)
let observer: ResizeObserver | undefined
onMounted(() => {
  if (!host.value) return
  const measure = () => { if (host.value) width.value = Math.max(6, host.value.clientWidth) }
  measure(); observer = new ResizeObserver(measure); observer.observe(host.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="sparkline" data-slot="sparkline">
    <div ref="host" class="spark-plot" :style="{ height: `${height}px` }">
      <svg role="img" :aria-label="summary" :viewBox="`0 0 ${width} ${height}`" width="100%" :height="height">
        <defs><linearGradient :id="gradient" x1="0" x2="0" y1="0" y2="1"><stop :stop-color="color" stop-opacity=".24" /><stop offset="1" :stop-color="color" stop-opacity="0" /></linearGradient></defs>
        <path v-if="variant === 'area'" :d="paths.area" :fill="`url(#${gradient})`" />
        <path :d="paths.line" fill="none" :stroke="color" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
        <circle v-if="interactive && points[active]" :cx="points[active]?.x" :cy="points[active]?.y" r="3" :fill="color" />
      </svg>
      <ChartInspector v-if="interactive" :label="messages.inspect ?? `${label}: inspect values`" :values="descriptions" :index="active" @inspect="active = $event" @close="active = -1" />
      <div v-if="interactive && active >= 0" role="tooltip" class="spark-tip">{{ descriptions[active] }}</div>
    </div>
    <span v-if="showDelta && delta !== null" class="delta" :class="{ down: invertDelta ? delta > 0 : delta < 0 }">{{ delta >= 0 ? '+' : '' }}{{ delta.toFixed(1) }}%</span>
  </div>
</template>

<style scoped>
.sparkline { display: flex; align-items: center; gap: 10px; }
.spark-plot { position: relative; flex: 1; min-width: 0; }
.spark-plot:focus-within { outline: 2px solid currentColor; outline-offset: 3px; }
.delta { color: #047857; background: #05966916; padding: 2px 6px; border-radius: 5px; font-size: 11px; font-variant-numeric: tabular-nums; }
.delta.down { color: #be123c; background: #e11d4818; }
.spark-tip { position: absolute; bottom: 100%; right: 0; background: CanvasText; color: Canvas; font-size: 11px; padding: 3px 7px; border-radius: 4px; }
</style>
