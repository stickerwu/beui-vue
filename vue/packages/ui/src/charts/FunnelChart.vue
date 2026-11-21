<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, shallowRef, useId } from 'vue'
import { easeOut } from '../core/motion'
import NumberTicker from '../numeric/NumberTicker.vue'
import ChartTip from './ChartTip.vue'
import { interpolate } from './plot-utils'

interface Stage { id: string; label: string; value: number; color?: string }
const props = withDefaults(defineProps<{
  stages: readonly Stage[]; direction?: 'horizontal' | 'vertical'; label?: string; unit?: string
  formatValue?: (value: number) => string; labels?: Partial<Record<string, string>>
}>(), { direction: 'vertical', formatValue: (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 }) })

const defaults: Record<string, string> = {
  label: 'Conversion funnel', unit: 'people', empty: 'No funnel data', stages: 'Funnel stages',
  fromPrevious: '{percent} from previous stage', gained: '{value} gained', dropped: '{value} dropped',
  ofStart: '{percent} of starting total', stage: '{stage}: {value} {unit}, {percent} of starting total',
  range: '{first} → {last} {unit}', overall: 'Overall conversion',
}
const t = (key: string, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? defaults[key], values)
const colors = ['#8b5cf6', '#7774ef', '#548ee4', '#2ca6bc', '#14b8a6']
const reduced = useReducedMotion()
const tooltipId = useId()
const current = shallowRef<string | null>(null)
const buttons = new Map<string, HTMLElement>()
const unit = computed(() => props.unit ?? t('unit'))
const percentage = (value: number | null) => value === null ? '—' : `${value.toFixed(1)}%`

/** Each stage's centre width encodes its value; shared boundaries join without gaps. */
function funnelPath(proportions: readonly number[], index: number, direction: 'horizontal' | 'vertical') {
  const value = proportions[index]
  const top = index === 0 ? value : (proportions[index - 1] + value) / 2
  const bottom = index === proportions.length - 1 ? value : (value + proportions[index + 1]) / 2
  const start = index / proportions.length
  const end = (index + 1) / proportions.length
  const middle = (start + end) / 2
  const quarter = (end - start) / 4
  const point = (cross: number, along: number) => direction === 'vertical' ? `${cross * 1000},${along * 500}` : `${along * 1000},${cross * 500}`
  const left = (width: number) => 0.5 - width * 0.46
  const right = (width: number) => 0.5 + width * 0.46
  return `M${point(left(top), start)} L${point(right(top), start)} C${point(right(top), start + quarter)} ${point(right(value), middle - quarter)} ${point(right(value), middle)} C${point(right(value), middle + quarter)} ${point(right(bottom), end - quarter)} ${point(right(bottom), end)} L${point(left(bottom), end)} C${point(left(bottom), end - quarter)} ${point(left(value), middle + quarter)} ${point(left(value), middle)} C${point(left(value), middle - quarter)} ${point(left(top), start + quarter)} ${point(left(top), start)} Z`
}

const model = computed(() => {
  const seen = new Set<string>()
  const valid = props.stages.filter(stage => {
    if (seen.has(stage.id) || !Number.isFinite(stage.value) || stage.value < 0) return false
    seen.add(stage.id)
    return true
  })
  const first = valid[0]?.value ?? 0
  const last = valid.at(-1)?.value ?? 0
  const maximum = valid.reduce((max, stage) => Math.max(max, stage.value), 0)
  const proportions = valid.map(stage => maximum > 0 ? stage.value / maximum : 0)
  const rows = valid.map((stage, index) => {
    const previous = valid[index - 1]?.value
    return {
      ...stage, color: stage.color ?? colors[index % colors.length],
      path: funnelPath(proportions, index, props.direction),
      conversion: first > 0 ? stage.value / first * 100 : null,
      step: previous !== undefined && previous > 0 ? stage.value / previous * 100 : null,
      change: previous === undefined ? null : stage.value - previous,
    }
  })
  return { rows, first, last, conversion: first > 0 ? last / first * 100 : null }
})
const rows = computed(() => model.value.rows)
const horizontal = computed(() => props.direction === 'horizontal')
const active = computed(() => rows.value.find(row => row.id === current.value))
const activeIndex = computed(() => rows.value.findIndex(row => row.id === current.value))

// Hover opens after 120ms (instant right after another tooltip closed); keyboard focus opens at once.
let timer: ReturnType<typeof setTimeout> | undefined
let lastClosed = 0
function open(id: string, wait = 0) {
  clearTimeout(timer)
  const show = () => { current.value = id }
  if (!wait || Date.now() - lastClosed < 300) show()
  else timer = setTimeout(show, wait)
}
function close() {
  clearTimeout(timer)
  if (current.value !== null) lastClosed = Date.now()
  current.value = null
}
function focus(event: FocusEvent, id: string) { if ((event.currentTarget as HTMLElement).matches(':focus-visible')) open(id) }
function enter(event: PointerEvent, id: string) { if (event.pointerType === 'mouse') open(id, 120) }
function tap(event: PointerEvent, id: string) { if (event.pointerType === 'touch') { if (current.value === id) close(); else open(id) } }
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <section class="funnel" data-slot="funnel-chart" :aria-label="label ?? t('label')">
    <p v-if="!rows.length" class="empty">{{ t('empty') }}</p>
    <template v-else>
      <div class="plot-wrap">
        <div class="scroll">
          <div class="plot" :style="{ height: `${horizontal ? 300 : Math.max(320, rows.length * 72)}px`, minWidth: `${horizontal ? rows.length * 110 : 240}px` }">
            <svg aria-hidden="true" viewBox="0 0 1000 500" preserveAspectRatio="none">
              <motion.path v-for="stage in rows" :key="stage.id" tabindex="-1" :fill="stage.color" :initial="false" :animate="{ d: stage.path }" :transition="{ duration: reduced ? 0 : 0.28, ease: easeOut }" />
            </svg>
            <ol :aria-label="t('stages')" :style="horizontal ? { gridTemplateColumns: `repeat(${rows.length}, 1fr)` } : { gridTemplateRows: `repeat(${rows.length}, 1fr)` }">
              <li v-for="stage in rows" :key="stage.id">
                <button :ref="el => { if (el) buttons.set(stage.id, el as HTMLElement); else buttons.delete(stage.id) }" type="button"
                  :aria-label="t('stage', { stage: stage.label, value: formatValue(stage.value), unit, percent: percentage(stage.conversion) })"
                  :aria-describedby="current === stage.id ? tooltipId : undefined"
                  @focus="focus($event, stage.id)" @blur="close" @pointerenter="enter($event, stage.id)" @pointerleave="close" @pointerup="tap($event, stage.id)" @keydown.esc="close">
                  <span>{{ formatValue(stage.value) }}</span>
                </button>
              </li>
            </ol>
          </div>
        </div>
        <ChartTip :id="tooltipId" :open="active !== undefined" :anchor="active ? buttons.get(active.id) ?? null : null" :follow-cursor="false" side="top" @dismiss="close">
          <span v-if="active" :key="active.id" class="tip">
            <span class="muted">{{ active.label }}</span>
            <NumberTicker :value="active.value" :format="() => formatValue(active!.value)" :suffix="` ${unit}`" :duration="0.35" :start-on-view="false" class-name="mono" />
            <template v-if="activeIndex > 0">
              <span>{{ t('fromPrevious', { percent: percentage(active.step) }) }}</span>
              <span class="muted">{{ t((active.change ?? 0) > 0 ? 'gained' : 'dropped', { value: formatValue(Math.abs(active.change ?? 0)) }) }}</span>
            </template>
            <span class="muted">{{ t('ofStart', { percent: percentage(active.conversion) }) }}</span>
          </span>
        </ChartTip>
        <div class="legend">
          <span v-for="stage in rows" :key="stage.id" class="key"><span class="dot" aria-hidden="true" :style="{ backgroundColor: stage.color }" /><span>{{ stage.label }}</span><span class="pct">{{ percentage(stage.conversion) }}</span></span>
        </div>
      </div>
      <div class="summary">
        <span class="muted">{{ t('range', { first: formatValue(model.first), last: formatValue(model.last), unit }) }}</span>
        <span class="overall"><span class="muted">{{ t('overall') }}</span><span class="figure">{{ percentage(model.conversion) }}</span></span>
      </div>
    </template>
  </section>
</template>

<style scoped>
.funnel { display: flex; flex-direction: column; gap: 24px; width: 100%; }
.empty { margin: 0; padding: 64px 0; text-align: center; font-size: 14px; line-height: 20px; color: var(--beui-muted-foreground); }
.plot-wrap { display: flex; flex-direction: column; gap: 20px; }
.scroll { overflow-x: auto; }
.plot { position: relative; }
.plot svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.plot ol { position: absolute; inset: 0; display: grid; margin: 0; padding: 0; list-style: none; }
.plot li { min-width: 0; min-height: 0; margin: 0; }
.plot button { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; outline: none; transition: background-color .15s; }
.plot button:hover { background: color-mix(in srgb, var(--beui-foreground) 5%, transparent); }
.plot button:focus-visible { box-shadow: inset 0 0 0 2px var(--beui-ring); }
.plot button span { padding: 4px 8px; border-radius: 4px; background: color-mix(in srgb, var(--beui-background) 85%, transparent); font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 12px; line-height: 16px; font-weight: 500; font-variant-numeric: tabular-nums; }
.legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 24px; }
.key { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; line-height: 16px; }
.dot { flex: none; width: 8px; height: 8px; border-radius: 50%; }
.pct { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 10px; color: var(--beui-muted-foreground); }
.summary { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding-top: 16px; border-top: 1px solid var(--beui-border); font-size: 12px; line-height: 16px; }
.overall { display: flex; align-items: center; gap: 8px; }
.figure { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-weight: 500; font-variant-numeric: tabular-nums; }
.muted { color: var(--beui-muted-foreground); }
</style>

<style>
.chart-tip .tip { display: flex; flex-direction: column; gap: 6px; font-size: 12px; line-height: 1.3333; padding: 2px 0; }
.chart-tip .tip .muted { color: var(--beui-muted-foreground); }
.chart-tip .tip .mono { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); }
</style>
