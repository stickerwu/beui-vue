<script setup lang="ts">
import { animate, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { easeOut, layoutSpring, pressSpring } from '../core/motion'
import ChartTip from './ChartTip.vue'
import { interpolate, useHoverCapable } from './plot-utils'

interface RankSeries { id: string; name: string; ranks: readonly (number | null)[]; color?: string }
const props = defineProps<{
  series: readonly RankSeries[]; periods: readonly string[]; active?: string | null; defaultActive?: string | null; label?: string; labels?: Partial<Record<string, string>>
}>()
const emit = defineEmits<{ 'update:active': [value: string | null]; activeChange: [value: string | null] }>()

const defaults: Record<string, string> = {
  label: 'Rankings over time', empty: 'No rankings yet', plot: '{label} plot, scroll horizontally for more periods',
  description: 'Ranks run from best at the top to lowest at the bottom. Use the legend to highlight or pin a series. Exact values follow in a table.',
  caption: '{label}: exact ranks', series: 'Series', noData: 'No data', highlight: 'Highlight {name}',
  changeUnavailable: 'Change unavailable', unchanged: 'Unchanged', noPrevious: 'No previous rank', noChange: 'No change',
  upOne: 'Up 1 place', up: 'Up {count} places', downOne: 'Down 1 place', down: 'Down {count} places',
  previously: 'Previously #{rank} in {period}', point: '{name}, {period}: rank {rank}',
}
const t = (key: string, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? defaults[key], values)

const PLOT = { width: 560, left: 32, right: 100, top: 28, bottom: 36, rowHeight: 44 }
const COLORS = ['#8b5cf6', '#0d9488', '#f59e0b', '#3b82f6', '#f43f5e', '#a3a33a']
const reduce = useReducedMotion()
const canHover = useHoverCapable()
const clipPrefix = useId()
const tooltipId = useId()

const internal = shallowRef(props.defaultActive ?? null)
const hovered = shallowRef<string | null>(null)
const focused = shallowRef<string | null>(null)

const rows = computed(() => {
  const seen = new Set<string>()
  return props.series.filter(row => !seen.has(row.id) && !!seen.add(row.id)).map((row, index) => ({
    ...row, color: row.color ?? COLORS[index % COLORS.length],
    ranks: Array.from({ length: props.periods.length }, (_, i) => {
      const rank = row.ranks[i]
      return rank != null && Number.isSafeInteger(rank) && rank > 0 ? rank : null
    }),
  }))
})
const rankList = computed(() => [...new Set(rows.value.flatMap(row => row.ranks.filter((rank): rank is number => rank != null)))].sort((a, b) => a - b))
const maxRank = computed(() => rankList.value.at(-1) ?? 1)
// Preserve numeric rank distances, including skipped ranks, without unbounded chart height.
const plotHeight = computed(() => Math.max(1, Math.min(maxRank.value - 1, 8)) * PLOT.rowHeight)
const height = computed(() => PLOT.top + plotHeight.value + PLOT.bottom)
const x = (index: number) => props.periods.length <= 1 ? (PLOT.left + PLOT.width - PLOT.right) / 2 : PLOT.left + index / (props.periods.length - 1) * (PLOT.width - PLOT.left - PLOT.right)
const y = (rank: number) => maxRank.value === 1 ? PLOT.top + plotHeight.value / 2 : PLOT.top + (rank - 1) / (maxRank.value - 1) * plotHeight.value
const width = computed(() => Math.max(PLOT.width, props.periods.length * 64))

const valid = (id: string | null) => id != null && rows.value.some(row => row.id === id)
const pinned = computed(() => { const selected = props.active === undefined ? internal.value : props.active; return valid(selected ?? null) ? selected ?? null : null })
const highlighted = computed(() => valid(hovered.value) ? hovered.value : valid(focused.value) ? focused.value : pinned.value)
watch(rows, () => {
  if (internal.value !== null && !valid(internal.value)) internal.value = null
  if (hovered.value !== null && !valid(hovered.value)) hovered.value = null
  if (focused.value !== null && !valid(focused.value)) focused.value = null
})
function select(id: string | null) {
  if (props.active === undefined) internal.value = id
  emit('update:active', id); emit('activeChange', id)
}
function escape() { select(null); focused.value = null; hovered.value = null }

// The curves, dots and end labels all read the same animated coordinates.
const pointKey = (series: string, index: number) => JSON.stringify([series, props.periods[index]])
const targets = computed(() => {
  const map = new Map<string, { x: number; y: number }>()
  for (const row of rows.value) row.ranks.forEach((rank, index) => { if (rank != null) map.set(pointKey(row.id, index), { x: x(index), y: y(rank) }) })
  return map
})
const positions = shallowRef(new Map(targets.value))
let controls: { stop: () => void } | undefined
watch(targets, next => {
  controls?.stop()
  const from = positions.value
  const start = new Map([...next].map(([key, target]) => [key, from.get(key) ?? target]))
  const settle = () => { positions.value = new Map(next) }
  if (reduce.value) return settle()
  controls = animate(0, 1, {
    ...layoutSpring,
    onUpdate: progress => {
      positions.value = new Map([...next].map(([key, target]) => {
        const origin = start.get(key)!
        return [key, { x: origin.x + (target.x - origin.x) * progress, y: origin.y + (target.y - origin.y) * progress }]
      }))
    },
    onComplete: settle,
  })
})
onBeforeUnmount(() => controls?.stop())

function bumpPath(points: ({ x: number; y: number } | null)[]) {
  let path = ''
  let previous: { x: number; y: number } | null = null
  for (const point of points) {
    if (!point) { previous = null; continue }
    if (previous) {
      const middle = (previous.x + point.x) / 2
      path += ` C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`
    } else path += ` M ${point.x} ${point.y}`
    previous = point
  }
  return path.trim()
}
const lines = computed(() => rows.value.map((row, index) => {
  const points = props.periods.map((_, i) => row.ranks[i] == null ? null : positions.value.get(pointKey(row.id, i)) ?? null)
  const last = points.at(-1) ?? null
  return { ...row, index, path: bumpPath(points), last, clip: `${clipPrefix}-${index}` }
}))
const dots = computed(() => rows.value.flatMap((row, seriesIndex) => row.ranks.flatMap((rank, index) => {
  const position = rank == null ? undefined : positions.value.get(pointKey(row.id, index))
  if (rank == null || !position) return []
  const previous = row.ranks[index - 1]
  const change = previous == null ? null : previous - rank
  const text = change == null ? t('noPrevious') : change === 0 ? t('noChange') : Math.abs(change) === 1 ? t(change > 0 ? 'upOne' : 'downOne') : t(change > 0 ? 'up' : 'down', { count: Math.abs(change) })
  return [{ key: pointKey(row.id, index), row, seriesIndex, index, rank, previous, change: text, position }]
})))
const gainTitle = (gain: number | null) => gain == null ? t('changeUnavailable') : gain === 0 ? t('unchanged') : Math.abs(gain) === 1 ? t(gain > 0 ? 'upOne' : 'downOne') : t(gain > 0 ? 'up' : 'down', { count: Math.abs(gain) })

// Tooltip: 60ms after hover, immediately on keyboard focus, toggled by touch.
const buttons = new Map<string, HTMLElement>()
const tip = shallowRef<string | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
let lastClosed = 0
const tipDot = computed(() => dots.value.find(dot => dot.key === tip.value))
function openTip(key: string, wait = 0) {
  clearTimeout(timer)
  if (!wait || Date.now() - lastClosed < 300) tip.value = key
  else timer = setTimeout(() => { tip.value = key }, wait)
}
function closeTip() { clearTimeout(timer); if (tip.value) lastClosed = Date.now(); tip.value = null }
onBeforeUnmount(() => clearTimeout(timer))
function onFocus(event: FocusEvent, dot: { key: string; row: { id: string } }) {
  focused.value = dot.row.id
  if ((event.currentTarget as HTMLElement).matches(':focus-visible')) openTip(dot.key)
}
function onBlur() { focused.value = null; closeTip() }
function onTouch(event: PointerEvent, key: string) { if (event.pointerType === 'touch') tip.value === key ? closeTip() : openTip(key) }
</script>

<template>
  <section class="bump" data-slot="bump-chart" :aria-label="label ?? t('label')">
    <div v-if="!periods.length || !rankList.length" class="empty">{{ t('empty') }}</div>
    <section v-else class="scroller" :aria-label="t('plot', { label: label ?? t('label') })" tabindex="0">
      <div class="canvas" :style="{ minWidth: `${width}px` }">
        <svg role="img" :aria-label="label ?? t('label')" :viewBox="`0 0 ${PLOT.width} ${height}`">
          <title>{{ label ?? t('label') }}</title>
          <desc>{{ t('description') }}</desc>
          <line v-for="rank in rankList" :key="rank" class="grid" :x1="PLOT.left" :x2="PLOT.width - PLOT.right" :y1="y(rank)" :y2="y(rank)" stroke-dasharray="2 5" />
          <text v-for="(period, index) in periods" :key="period" class="period" :x="x(index)" :y="height - 8" text-anchor="middle">{{ period }}</text>
          <motion.g v-for="line in lines" :key="line.id" tabindex="-1" class="series" :class="{ dim: highlighted !== null && highlighted !== line.id }" :initial="{ opacity: 0 }" :animate="{ opacity: highlighted !== null && highlighted !== line.id ? 0.22 : 1 }" :transition="{ duration: 0.18, ease: easeOut }"
            @pointerenter="canHover && (hovered = line.id)" @pointerleave="hovered = null">
            <defs><clipPath :id="line.clip"><motion.rect tabindex="-1" x="0" y="0" :width="PLOT.width" :height="height" :initial="reduce ? false : { transform: 'scaleX(0)' }" :animate="{ transform: 'scaleX(1)' }" :transition="{ duration: 0.28, delay: Math.min(line.index, 4) * 0.025, ease: easeOut }" /></clipPath></defs>
            <g :clip-path="`url(#${line.clip})`">
              <path :d="line.path" :stroke="line.color" stroke-width="2" fill="none" />
              <motion.path tabindex="-1" :d="line.path" :stroke="line.color" stroke-width="5" fill="none" :initial="false" :animate="{ opacity: highlighted === line.id ? 0.16 : 0 }" :transition="{ duration: 0.18, ease: easeOut }" />
              <path :d="line.path" stroke="transparent" stroke-width="16" fill="none" />
            </g>
            <g v-if="line.last" :transform="`translate(${line.last.x} ${line.last.y})`">
              <text class="name" x="18" dominant-baseline="central" :fill="line.color">{{ line.name.length > 12 ? `${line.name.slice(0, 11)}…` : line.name }}<title>{{ line.name }}</title></text>
            </g>
          </motion.g>
        </svg>
        <div class="points">
          <div v-for="dot in dots" :key="dot.key" class="slot" :style="{ left: `${dot.position.x / PLOT.width * 100}%`, top: `${dot.position.y / height * 100}%` }">
            <div class="hit" @pointerenter="canHover && (hovered = dot.row.id)" @pointerleave="hovered = null">
              <motion.button :ref="(el: any) => { const node = el?.$el ?? el; if (node) buttons.set(dot.key, node); else buttons.delete(dot.key) }" type="button" class="dot"
                :style="{ color: dot.row.color }" :aria-label="t('point', { name: dot.row.name, period: periods[dot.index], rank: dot.rank })" :aria-pressed="pinned === dot.row.id"
                :aria-describedby="tip === dot.key ? tooltipId : undefined"
                :initial="reduce ? false : { transform: 'scale(0.85)', opacity: 0 }"
                :animate="{ transform: 'scale(1)', opacity: highlighted !== null && highlighted !== dot.row.id ? 0.22 : 1 }"
                :transition="{ transform: pressSpring, opacity: { duration: 0.18, ease: easeOut } }"
                :while-hover="canHover && !reduce ? { transform: 'scale(1.12)' } : undefined"
                @focus="onFocus($event, dot)" @blur="onBlur" @click="select(pinned === dot.row.id ? null : dot.row.id)" @keydown.esc="escape"
                @pointerenter="($event as PointerEvent).pointerType === 'mouse' && openTip(dot.key, 60)" @pointerleave="closeTip" @pointerup="onTouch($event, dot.key)">
                <motion.span aria-hidden="true" class="halo" :initial="false" :animate="{ opacity: highlighted === dot.row.id ? 0.12 : 0 }" :transition="{ duration: 0.15, ease: easeOut }" />
                <motion.span class="chip" :initial="reduce ? false : { transform: 'scale(0.85)' }" :animate="{ transform: 'scale(1)' }"
                  :transition="{ ...pressSpring, delay: reduce ? 0 : Math.min(dot.index, 8) * 0.025 + Math.min(dot.seriesIndex, 4) * 0.015 }">{{ dot.rank }}</motion.span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
      <ChartTip :id="tooltipId" :open="tipDot !== undefined" :anchor="tipDot ? buttons.get(tipDot.key) ?? null : null" :follow-cursor="false" side="top" @dismiss="closeTip">
        <span v-if="tipDot" class="bump-tip">
          <span class="row"><span>{{ tipDot.row.name }}</span><span>{{ periods[tipDot.index] }}</span></span>
          <span class="rank-row"><span class="rank" :style="{ color: tipDot.row.color }">#{{ tipDot.rank }}</span><span class="change">{{ tipDot.change }}</span></span>
          <span v-if="tipDot.previous != null" class="previous">{{ t('previously', { rank: tipDot.previous, period: periods[tipDot.index - 1] }) }}</span>
        </span>
      </ChartTip>
      <table class="sr">
        <caption>{{ t('caption', { label: label ?? t('label') }) }}</caption>
        <thead><tr><th scope="col">{{ t('series') }}</th><th v-for="period in periods" :key="period" scope="col">{{ period }}</th></tr></thead>
        <tbody><tr v-for="row in rows" :key="row.id"><th scope="row">{{ row.name }}</th><td v-for="(rank, index) in row.ranks" :key="periods[index]">{{ rank ?? t('noData') }}</td></tr></tbody>
      </table>
    </section>
    <div class="legend">
      <button v-for="row in rows" :key="row.id" type="button" :aria-label="t('highlight', { name: row.name })" :aria-pressed="pinned === row.id"
        :class="{ dim: highlighted && highlighted !== row.id, pinned: pinned === row.id }"
        @click="select(pinned === row.id ? null : row.id)" @pointerenter="canHover && (hovered = row.id)" @pointerleave="hovered = null" @focus="focused = row.id" @blur="focused = null" @keydown.esc="escape">
        <span class="swatch" aria-hidden="true" :style="{ backgroundColor: row.color }" />
        <span class="name">{{ row.name }}</span>
        <span class="last">{{ row.ranks.at(-1) == null ? '—' : `#${row.ranks.at(-1)}` }}</span>
        <span class="gain" :title="gainTitle(row.ranks[0] != null && row.ranks.at(-1) != null ? row.ranks[0]! - row.ranks.at(-1)! : null)">{{
          row.ranks[0] == null || row.ranks.at(-1) == null || row.ranks[0] === row.ranks.at(-1) ? '—' : `${row.ranks[0]! - row.ranks.at(-1)! > 0 ? '↑' : '↓'}${Math.abs(row.ranks[0]! - row.ranks.at(-1)!)}` }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.bump { display: flex; flex-direction: column; gap: 20px; width: 100%; }
.empty { padding: 64px 0; text-align: center; font-size: 14px; line-height: 20px; color: var(--beui-muted-foreground); }
.scroller { overflow-x: auto; border-radius: 8px; }
.scroller:focus-visible { outline: 2px solid var(--beui-ring); }
.canvas { position: relative; }
.canvas svg { display: block; width: 100%; overflow: visible; }
.grid { stroke: var(--beui-border); }
.period { fill: var(--beui-muted-foreground); font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 10px; }
.name { font-size: 10px; font-weight: 500; }
.points { position: absolute; inset: 0; overflow: clip; pointer-events: none; }
.slot { position: absolute; width: 0; height: 0; }
.hit { position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); pointer-events: auto; }
.dot { position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 9999px; background: transparent; cursor: pointer; font: inherit; }
.dot:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.halo { position: absolute; inset: 0; border-radius: 9999px; background: currentColor; }
.chip { position: relative; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: 1.5px solid currentColor; border-radius: 9999px; background: var(--beui-background); font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 9px; line-height: 1; font-weight: 500; }
.legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 20px; }
@media (min-width: 640px) { .legend { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.legend button { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 10px 8px; border: 0; border-radius: 6px; background: transparent; color: var(--beui-foreground); font: inherit; font-size: 12px; line-height: 16px; text-align: left; cursor: pointer; transition: opacity .15s; }
.legend button:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.legend button.dim { opacity: .35; }
.legend button.pinned { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); }
.swatch { flex: none; width: 8px; height: 8px; border-radius: 50%; }
.legend .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 400; }
.last { margin-left: auto; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-variant-numeric: tabular-nums; }
.gain { min-width: 20px; text-align: right; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 10px; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.sr { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>

<style>
.chart-tip .bump-tip { display: block; min-width: 156px; padding: 2px 0; font-size: 12px; line-height: 1.3333; }
.chart-tip .bump-tip .row { display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 10px; color: var(--beui-muted-foreground); }
.chart-tip .bump-tip .rank-row { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-top: 8px; }
.chart-tip .bump-tip .rank { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 18px; line-height: 1.5556; font-weight: 500; }
.chart-tip .bump-tip .previous { display: block; margin-top: 4px; font-size: 10px; color: var(--beui-muted-foreground); }
</style>
