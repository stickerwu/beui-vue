<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { easeOut, glideSpring, panelSpring } from '../core/motion'
import NumberTicker from '../numeric/NumberTicker.vue'
import ChartTip from './ChartTip.vue'
import { interpolate, useHoverCapable } from './plot-utils'

interface Target { key: string; price: number; analysts: number; color?: string }
type Active = { type: 'history'; date: string } | { type: 'target'; key: string }
const props = defineProps<{
  current: number; targets: readonly [Target, Target, Target]; history?: readonly { date: string; price: number }[]; label?: string
  dates?: { start?: string; mid?: string; horizon?: string }; active?: Active | null; defaultActive?: Active | null; labels?: Partial<Record<string, string>>
}>()
const emit = defineEmits<{ 'update:active': [value: Active | null]; activeChange: [value: Active | null] }>()

const defaults: Record<string, string> = {
  label: 'Price target · 12 months', chart: '{label}: mean {mean}, now {current}', target: '{key} target', targetButton: '{key} target {price}, {analysts} analysts',
  history: 'Price history', price: 'Price', analysts: 'Analysts', vsNow: 'vs now', now: 'Now', horizon: 'Target',
}
const t = (key: string, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? defaults[key], values)

const W = 520, H = 236, PAD = { l: 36, r: 108, t: 16, b: 28 }
const reduce = useReducedMotion()
const canHover = useHoverCapable()
const clipId = useId()
const fadeId = `${clipId}-fade`
const tooltipId = useId()
const svg = useTemplateRef<SVGSVGElement>('svg')

const scrubDate = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(date))
const axisDate = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', year: 'numeric' }).format(new Date(date))
const fmt = (price: number) => `$${price.toFixed(2)}`
/** A hue as text: capped lightness in light so 11px numbers reach AA; native in dark (`--ptf-ink-l` flips per theme on the root). */
const ink = (color: string) => `oklch(from ${color} min(l, var(--ptf-ink-l, 1)) c h)`

const local = shallowRef(props.defaultActive ?? null)
const history = computed(() => (props.history ?? []).filter(point => Number.isFinite(point.price) && point.price > 0 && Number.isFinite(Date.parse(point.date))))
const prices = computed(() => history.value.map(point => point.price))
const requested = computed(() => props.active === undefined ? local.value : props.active)
const targetIndex = computed(() => requested.value?.type === 'target' ? props.targets.findIndex(target => target.key === (requested.value as { key: string }).key) : -1)
const historyIndex = computed(() => requested.value?.type === 'history' ? history.value.findIndex(point => point.date === (requested.value as { date: string }).date) : -1)
const hotT = computed(() => targetIndex.value >= 0 ? targetIndex.value : null)
const scrub = computed(() => historyIndex.value >= 0 ? historyIndex.value : null)
function setActive(next: Active | null) {
  if (props.active === undefined) local.value = next
  emit('update:active', next); emit('activeChange', next)
}
const setHotT = (index: number | null) => setActive(index === null ? null : { type: 'target', key: props.targets[index].key })
const setScrub = (index: number | null) => setActive(index === null ? null : { type: 'history', date: history.value[index].date })

// The domain follows the data: whatever history and targets arrive, the chart fills its height.
const domain = computed(() => {
  const values = [props.current, ...prices.value, ...props.targets.map(target => target.price)]
  const lo = Math.min(...values), hi = Math.max(...values)
  const pad = Math.max((hi - lo) * 0.06, 0.5)
  return { min: lo - pad, max: hi + pad }
})
const y = (value: number) => PAD.t + (1 - (value - domain.value.min) / (domain.value.max - domain.value.min)) * (H - PAD.t - PAD.b)
const pct = (price: number) => (price - props.current) / props.current * 100

const geo = computed(() => {
  const histW = (W - PAD.l - PAD.r) * 0.56
  const nowX = PAD.l + histW
  const times = history.value.map(point => Date.parse(point.date))
  const first = times[0] ?? 0, last = times[times.length - 1] ?? first
  const hx = (i: number) => last === first ? nowX - 12 : PAD.l + (times[i] - first) / (last - first) * (histW - 12)
  const nowY = y(props.current)
  const endX = W - PAD.r
  const line = prices.value.map((value, i) => `${i === 0 ? 'M' : 'L'}${hx(i).toFixed(1)},${y(value).toFixed(1)}`).join(' ') + (prices.value.length ? ` L${nowX},${nowY}` : '')
  const colors = ['var(--ptf-success)', 'var(--ptf-accent)', 'var(--ptf-warning)']
  const proj = props.targets.map((target, i) => {
    const ty = y(target.price)
    const cx = nowX + (endX - nowX) * 0.5
    const cy = nowY + (ty - nowY) * 0.15
    return { ...target, color: target.color ?? colors[i], ty, d: `M${nowX},${nowY} Q${cx},${cy} ${endX},${ty}`, cx, cy }
  })
  return { hx, nowX, nowY, endX, line, proj }
})

function onMove(event: PointerEvent) {
  if (!canHover.value || event.pointerType === 'touch') return
  const element = svg.value
  if (!element) return
  const box = element.getBoundingClientRect()
  const g = geo.value
  const px = (event.clientX - box.left) / box.width * W
  if (px > g.nowX + 6) {
    // In the fan the nearest projection owns the pointer, so the card walks from high to mean to low.
    const py = (event.clientY - box.top) / box.height * H
    const u = Math.min(1, (px - g.nowX) / (g.endX - g.nowX))
    const ys = g.proj.map(p => (1 - u) * (1 - u) * g.nowY + 2 * (1 - u) * u * p.cy + u * u * p.ty)
    let nearest = 0, best = Number.POSITIVE_INFINITY
    ys.forEach((cy, i) => { const d = Math.abs(py - cy); if (d < best) { best = d; nearest = i } })
    // Right after now the three curves still overlap; picking one there would be a guess.
    setHotT(Math.max(...ys) - Math.min(...ys) < 24 ? null : nearest)
    return
  }
  if (!history.value.length || px > g.nowX - 6) { setActive(null); return }
  let nearest = 0
  for (let i = 1; i < history.value.length; i++) if (Math.abs(g.hx(i) - px) < Math.abs(g.hx(nearest) - px)) nearest = i
  setScrub(nearest)
}

// A hovered target wins over the scrub; the card sits on whichever side keeps it in view.
const overlay = computed(() => {
  const g = geo.value
  if (hotT.value !== null) {
    const p = g.proj[hotT.value]
    const up = p.price >= props.current
    return {
      px: g.endX, py: p.ty, title: `${t('target', { key: p.key })}${props.dates?.horizon ? ` · ${props.dates.horizon}` : ''}`,
      metrics: [{ label: t('price'), value: fmt(p.price) }, { label: t('analysts'), value: String(p.analysts) }],
      accent: { label: t('vsNow'), value: `${up ? '+' : '−'}${Math.abs(pct(p.price)).toFixed(1)}%`, color: p.color },
    }
  }
  if (scrub.value !== null) {
    const point = history.value[scrub.value]
    return { px: g.hx(scrub.value), py: y(point.price), title: scrubDate(point.date), metrics: [{ label: t('price'), value: fmt(point.price) }], accent: null }
  }
  return null
})
const mean = computed(() => props.targets[1])
const head = computed(() => hotT.value !== null ? geo.value.proj[hotT.value] : { key: mean.value.key, price: mean.value.price, color: undefined as string | undefined })
const headPct = computed(() => pct(head.value.price))
// Round-numbered gridlines derived from the domain, at most four of them.
const grid = computed(() => {
  const span = domain.value.max - domain.value.min
  const mag = 10 ** Math.floor(Math.log10(span / 3.2))
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= 4.2) ?? 10 * mag
  const out: number[] = []
  for (let v = Math.ceil(domain.value.min / step) * step; v <= domain.value.max; v += step) out.push(v)
  let decimals = 0
  while (decimals < 8 && !Number.isInteger(Number((step * 10 ** decimals).toFixed(6)))) decimals++
  return { out, decimals }
})
const axisLabels = computed(() => {
  const list = history.value
  return [
    ...(list.length ? [{ x: geo.value.hx(0), text: props.dates?.start ?? axisDate(list[0].date), anchor: 'start' }] : []),
    ...(list.length > 2 ? [{ x: geo.value.hx(Math.floor(list.length / 2)), text: props.dates?.mid ?? axisDate(list[Math.floor(list.length / 2)].date), anchor: 'middle' }] : []),
    { x: geo.value.nowX, text: t('now'), anchor: 'middle' },
    { x: geo.value.endX, text: props.dates?.horizon ?? t('horizon'), anchor: 'middle' },
  ]
})

function historyKey(event: KeyboardEvent) {
  const list = history.value
  const index = scrub.value ?? list.length - 1
  if (event.key === 'Escape') { event.preventDefault(); setActive(null) }
  else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault()
    setScrub(event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : Math.max(0, Math.min(list.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1))))
  }
}
function targetKey(event: KeyboardEvent, index: number) {
  if (event.key === 'Escape') { event.preventDefault(); setActive(null) }
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setHotT(hotT.value === index ? null : index) }
}
function targetTouch(event: PointerEvent, index: number) {
  if (event.pointerType === 'touch') { event.preventDefault(); setHotT(hotT.value === index ? null : index) }
}
const nowOrigin = computed(() => `${geo.value.nowX}px ${geo.value.nowY}px`)
</script>

<template>
  <div class="ptf" data-slot="price-target-fan">
    <div class="head">
      <div class="head-line">
        <NumberTicker :value="Math.round(head.price * 100)" :format="v => (v / 100).toFixed(2)" prefix="$" :duration="0.5" class-name="price" />
        <span class="pct" :style="{ color: ink(head.color ?? (headPct >= 0 ? 'var(--ptf-success)' : 'var(--ptf-warning)')) }">
          <NumberTicker :value="Math.round(Math.abs(headPct) * 10)" :format="v => (v / 10).toFixed(1)" :prefix="headPct >= 0 ? '+' : '−'" suffix="%" :duration="0.5" />
        </span>
        <span class="name">{{ t('target', { key: head.key }) }}</span>
      </div>
    </div>
    <div class="plot">
      <svg ref="svg" :viewBox="`0 0 ${W} ${H}`" role="group" :aria-label="t('chart', { label: label ?? t('label'), mean: fmt(mean.price), current: fmt(current) })"
        @pointermove="onMove" @pointerleave="$event.pointerType !== 'touch' && setActive(null)">
        <defs>
          <!-- both vertical guides fade out toward the top so they read as markers, not walls -->
          <linearGradient :id="fadeId" gradientUnits="userSpaceOnUse" x1="0" :y1="PAD.t" x2="0" :y2="H - PAD.b">
            <stop offset="0" stop-color="var(--ptf-border-strong)" stop-opacity="0" /><stop offset="0.45" stop-color="var(--ptf-border-strong)" stop-opacity="1" /><stop offset="1" stop-color="var(--ptf-border-strong)" stop-opacity="1" />
          </linearGradient>
          <!-- the fan reveals left to right through this clip, so the dashed projections draw as lines -->
          <clipPath :id="clipId"><motion.rect tabindex="-1" :x="geo.nowX" :y="0" :height="H" :initial="{ width: reduce ? W - geo.nowX : 0 }" :animate="{ width: W - geo.nowX }" :transition="reduce ? { duration: 0 } : { duration: 0.8, ease: easeOut, delay: 0.85 }" /></clipPath>
        </defs>
        <g>
          <g v-for="value in grid.out" :key="value">
            <line :x1="PAD.l" :y1="y(value)" :x2="geo.endX" :y2="y(value)" stroke="var(--ptf-border)" stroke-dasharray="2 5" />
            <text class="tick" :x="PAD.l - 8" :y="y(value) + 3" text-anchor="end">{{ value.toFixed(grid.decimals) }}</text>
          </g>
          <text v-for="label in axisLabels" :key="label.x" class="axis" :x="label.x" :y="H - 8" :text-anchor="label.anchor">{{ label.text }}</text>
          <line :x1="geo.nowX" :y1="PAD.t" :x2="geo.nowX" :y2="H - PAD.b" :stroke="`url(#${fadeId})`" stroke-width="1" stroke-dasharray="3 3" />
        </g>
        <g v-if="prices.length" class="history" role="slider" tabindex="0" :aria-label="t('history')" aria-valuemin="0" :aria-valuemax="prices.length - 1"
          :aria-valuenow="scrub ?? prices.length - 1" :aria-valuetext="`${history[scrub ?? prices.length - 1].date}: ${fmt(prices[scrub ?? prices.length - 1])}`" :aria-describedby="scrub !== null ? tooltipId : undefined"
          @focus="setScrub(prices.length - 1)" @blur="setActive(null)" @keydown="historyKey">
          <!-- history draws itself to now -->
          <motion.path tabindex="-1" :d="geo.line" fill="none" stroke="var(--beui-foreground)" stroke-width="1.5" stroke-linecap="round" :initial="{ pathLength: reduce ? 1 : 0 }" :animate="{ pathLength: 1 }" :transition="reduce ? { duration: 0 } : { duration: 0.9, ease: easeOut }" />
        </g>
        <g :clip-path="`url(#${clipId})`">
          <g v-for="(p, i) in geo.proj" :key="p.key" class="target" :class="{ dim: hotT !== null && hotT !== i, still: reduce }" role="button" tabindex="0" :aria-label="t('targetButton', { key: p.key, price: fmt(p.price), analysts: p.analysts })"
            :aria-pressed="hotT === i" :aria-describedby="hotT === i ? tooltipId : undefined" @focus="setHotT(i)" @blur="setHotT(null)" @pointerdown="targetTouch($event, i)" @keydown="targetKey($event, i)">
            <path :d="p.d" fill="none" stroke="transparent" stroke-width="16" />
            <path :d="p.d" fill="none" :stroke="p.color" :stroke-width="hotT === i ? 2.2 : 1.4" :stroke-opacity="hotT === i ? 1 : 0.75" stroke-dasharray="2 4" stroke-linecap="round" />
            <!-- the hot projection draws itself solid over the dashes, base to target -->
            <motion.path v-if="hotT === i" tabindex="-1" :d="p.d" fill="none" :stroke="p.color" stroke-width="2.2" stroke-linecap="round" :initial="{ pathLength: reduce ? 1 : 0 }" :animate="{ pathLength: 1 }" :transition="reduce ? { duration: 0 } : { duration: 0.35, ease: easeOut }" />
            <motion.circle tabindex="-1" :cx="geo.endX" :cy="p.ty" fill="var(--beui-background)" :stroke="p.color" stroke-width="1.6" :r="3.2" :animate="{ r: hotT === i ? 4.5 : 3.2 }" :transition="reduce ? { duration: 0 } : panelSpring" />
            <text class="value" :x="geo.endX + 10" :y="p.ty + 4" :fill="ink(p.color)">{{ p.price }}</text>
          </g>
        </g>
        <!-- the now dot lands as the history arrives -->
        <motion.circle tabindex="-1" :cx="geo.nowX" :cy="geo.nowY" :r="3.2" fill="var(--beui-foreground)" :initial="{ opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0 }" :animate="{ opacity: 1, scale: 1 }"
          :transition="reduce ? { duration: 0 } : { ...panelSpring, delay: 0.85 }" :style="{ transformOrigin: nowOrigin }" />
        <!-- the live tail: a ring leaves the now dot every few seconds -->
        <motion.circle v-if="!reduce" tabindex="-1" :cx="geo.nowX" :cy="geo.nowY" :r="3.2" fill="none" stroke="var(--beui-foreground)" stroke-width="1" :initial="{ opacity: 0, scale: 1 }" :animate="{ opacity: [0.45, 0], scale: [1, 2.8] }"
          :transition="{ duration: 2.2, ease: easeOut, repeat: Infinity, repeatDelay: 1.6, delay: 1.6 }" :style="{ transformOrigin: nowOrigin }" />
        <!-- the scrub crosshair flows along the history on a spring instead of stepping cell to cell -->
        <g v-if="scrub !== null" pointer-events="none">
          <motion.line tabindex="-1" :y1="PAD.t" :y2="H - PAD.b" :stroke="`url(#${fadeId})`" stroke-width="1" :initial="false" :animate="{ x1: geo.hx(scrub), x2: geo.hx(scrub) }" :transition="reduce ? { duration: 0 } : glideSpring" />
          <motion.circle tabindex="-1" :r="3.2" fill="var(--beui-foreground)" stroke="var(--beui-background)" stroke-width="1.5" :initial="false" :animate="{ cx: geo.hx(scrub), cy: y(prices[scrub]) }" :transition="reduce ? { duration: 0 } : glideSpring" />
        </g>
      </svg>
      <ChartTip :id="tooltipId" :open="overlay !== null" :anchor="svg" :anchor-point="{ x: (overlay?.px ?? 0) / W, y: (overlay?.py ?? 0) / H }" :follow-cursor="false" side="top" max-width="148px">
        <span v-if="overlay" class="ptf-tip">
          <span class="title">{{ overlay.title }}</span>
          <span class="metrics"><span v-for="metric in overlay.metrics" :key="metric.label" class="metric"><span class="k">{{ metric.label }}</span><span class="v">{{ metric.value }}</span></span></span>
          <span v-if="overlay.accent" class="metric accent"><span class="k">{{ overlay.accent.label }}</span><span class="v" :style="{ color: ink(overlay.accent.color) }">{{ overlay.accent.value }}</span></span>
        </span>
      </ChartTip>
    </div>
  </div>
</template>

<style scoped>
.head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 4px; padding: 0 4px; }
.head-line { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.head-line :deep(.price) { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 24px; line-height: 32px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -.025em; color: var(--beui-foreground); }
.pct { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 12px; line-height: 16px; font-weight: 500; font-variant-numeric: tabular-nums; }
.name { font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.plot { position: relative; }
.plot svg { display: block; width: 100%; height: auto; cursor: crosshair; }
.plot svg :deep(*) { cursor: crosshair; }
.tick, .axis, .value { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-variant-numeric: tabular-nums; }
.tick { font-size: 9px; fill: var(--beui-muted-foreground); }
.axis { font-size: 9px; fill: var(--beui-muted-foreground); }
.value { font-size: 11px; font-weight: 600; }
.history, .target { outline: none; }
.target { transition: opacity .25s cubic-bezier(.16, 1, .3, 1); }
.target.dim { opacity: .3; }
.target.still { transition: none; }
.history:focus-visible, .target:focus-visible { outline: none; }
</style>

<style>
.ptf { --ptf-success: oklch(70% 0.18 155); --ptf-warning: oklch(78% 0.18 75); --ptf-accent: var(--beui-accent, oklch(72% 0.18 195)); --ptf-border: var(--beui-border); --ptf-border-strong: oklch(15% 0 0 / 0.12); --ptf-ink-l: 0.5; box-sizing: border-box; width: 520px; max-width: 100%; }
:where(.dark, [data-beui-theme="dark"]) .ptf { --ptf-border-strong: rgb(255 255 255 / 0.1); --ptf-ink-l: 1; }
.chart-tip .ptf-tip { display: block; width: 148px; max-width: 100%; padding: 2px 0; font-size: 12px; line-height: 1.3333; }
.chart-tip .ptf-tip .title { display: block; font-size: 10px; color: var(--beui-muted-foreground); }
.chart-tip .ptf-tip .metrics { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.chart-tip .ptf-tip .metric { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; }
.chart-tip .ptf-tip .metric .k { font-weight: 500; color: var(--beui-foreground); }
.chart-tip .ptf-tip .metric .v { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-variant-numeric: tabular-nums; color: var(--beui-foreground); }
.chart-tip .ptf-tip .metric.accent { margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--beui-border); }
</style>
