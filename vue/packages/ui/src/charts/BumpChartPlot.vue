<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, useId, watch } from 'vue'
import { motion } from 'motion-v'
import { easeOut, pressSpring } from '../core/motion'
import ChartTip from './ChartTip.vue'
import { BUMP_PLOT as PLOT, useBumpChart } from './bump-context'

const { t, label, periods, reduce, canHover, hovered, focused, rows, rankList, height, x, y, width, pinned, highlighted, select, escape, pointKey, positions, setHovered, setFocused } = useBumpChart()
const clipPrefix = useId()
const tooltipId = useId()

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
  const points = periods.value.map((_, i) => row.ranks[i] == null ? null : positions.value.get(pointKey(row.id, i)) ?? null)
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
// Escape, or a tap that lands elsewhere, closes an open tip (the keyboard and touch paths have no pointerleave).
watch(tip, (key, _, cleanup) => {
  if (key === null) return
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeTip() }
  const onDown = (event: PointerEvent) => { if (event.pointerType === 'touch' && !buttons.get(key)?.contains(event.target as Node)) closeTip() }
  document.addEventListener('keydown', onKey)
  document.addEventListener('pointerdown', onDown, true)
  cleanup(() => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown, true) })
})
function onFocus(event: FocusEvent, dot: { key: string; row: { id: string } }) {
  setFocused(dot.row.id)
  if ((event.currentTarget as HTMLElement).matches(':focus-visible')) openTip(dot.key)
}
function onBlur() { setFocused(null); closeTip() }
function onTouch(event: PointerEvent, key: string) { if (event.pointerType === 'touch') tip.value === key ? closeTip() : openTip(key) }
</script>

<template>
  <div v-if="!periods.length || !rankList.length" class="empty">{{ t('empty') }}</div>
  <section v-else class="scroller" data-slot="bump-chart-plot" :aria-label="t('plot', { label })" tabindex="0">
    <div class="canvas" :style="{ minWidth: `${width}px` }">
      <svg role="img" :aria-label="label" :viewBox="`0 0 ${PLOT.width} ${height}`">
        <title>{{ label }}</title>
        <desc>{{ t('description') }}</desc>
        <line v-for="rank in rankList" :key="rank" class="grid" :x1="PLOT.left" :x2="PLOT.width - PLOT.right" :y1="y(rank)" :y2="y(rank)" stroke-dasharray="2 5" />
        <text v-for="(period, index) in periods" :key="period" class="period" :x="x(index)" :y="height - 8" text-anchor="middle">{{ period }}</text>
        <motion.g v-for="line in lines" :key="line.id" tabindex="-1" class="series" :class="{ dim: highlighted !== null && highlighted !== line.id }" :initial="{ opacity: 0 }" :animate="{ opacity: highlighted !== null && highlighted !== line.id ? 0.22 : 1 }" :transition="{ duration: 0.18, ease: easeOut }"
          @pointerenter="canHover && (setHovered(line.id))" @pointerleave="setHovered(null)">
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
          <div class="hit" @pointerenter="canHover && (setHovered(dot.row.id))" @pointerleave="setHovered(null)">
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
      <caption>{{ t('caption', { label }) }}</caption>
      <thead><tr><th scope="col">{{ t('series') }}</th><th v-for="period in periods" :key="period" scope="col">{{ period }}</th></tr></thead>
      <tbody><tr v-for="row in rows" :key="row.id"><th scope="row">{{ row.name }}</th><td v-for="(rank, index) in row.ranks" :key="periods[index]">{{ rank ?? t('noData') }}</td></tr></tbody>
    </table>
  </section>
</template>

<style scoped>
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
.chip { position: relative; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: 1.5px solid currentColor; border-radius: 9999px; background: var(--beui-background); font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 9px; line-height: 1.5; font-weight: 500; }
.sr { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>

<!-- Tooltip content is teleported to the body, so its rules cannot be scoped. -->
<style>
.chart-tip .bump-tip { display: block; min-width: 156px; padding: 2px 0; font-size: 12px; line-height: calc(4 / 3); }
.chart-tip .bump-tip .row { display: flex; align-items: center; justify-content: space-between; gap: 16px; font-size: 10px; color: var(--beui-muted-foreground); }
.chart-tip .bump-tip .rank-row { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-top: 8px; }
.chart-tip .bump-tip .rank { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 18px; line-height: 1.5556; font-weight: 500; }
.chart-tip .bump-tip .previous { display: block; margin-top: 4px; font-size: 10px; color: var(--beui-muted-foreground); }
</style>
