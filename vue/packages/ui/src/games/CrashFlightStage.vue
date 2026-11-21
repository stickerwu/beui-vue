<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, useId } from 'vue'
import Parachute from './Parachute.vue'
import { BURST, CHUTE, STAGE_W, niceAtLeast, wrap, easeIn } from './crash-parts'
import { GROWTH, growth, timeAt, type CrashGameState } from './crash-round'
import { EXIT, SWAP, formatShort } from './game-parts'
import { easeOut } from '../core/motion'

/** The flight: a curve from 1x at 0s to the current multiplier, on axes that grow with it. */
const { game } = defineProps<{ game: CrashGameState }>()

// Graph geometry in SVG units, matching the shell's 10:7 stage.
const W = STAGE_W
const H = 280
// The y labels sit in the right pad; the left pad clears the parked plane's tail.
const PAD = { left: 18, right: 40, top: 20, bottom: 24 }
// The axes start at 8s and 2.2x, then grow so the head stays near 82% across and 72% up, which keeps them continuous with no rescale jumps.
const X_MIN = 8
// 2.2x, not lower: while the axes are fixed the head must stay under the readout's corner.
const Y_MIN = 2.2
const HEAD_X = 0.82
const HEAD_Y = 0.72
const uid = useId().replace(/[^\w-]/g, '')
const fill = `crash-fill-${uid}`

// The crashed plane tumbles and drops out of the sky, accelerating.
const TUMBLE = { duration: 0.6, ease: easeIn, opacity: { duration: 0.6, times: [0, 0.6, 1] } } as const
const FADE = { duration: 0.15, ease: easeOut } as const

// Paper shreds thrown out by the crash, spread round the head and pulled down a little. Fixed, so every crash is the same shape.
const SHREDS = Array.from({ length: 7 }, (_, i) => {
  const angle = ((-160 + i * 50 + (i % 2) * 14) * Math.PI) / 180
  const reach = 20 + (i % 3) * 8
  return { id: i, x: Math.cos(angle) * reach, y: Math.sin(angle) * reach + 12, spin: (i % 2 ? 1 : -1) * (140 + i * 30) }
})
// Speed field points, scattered over the plot by fixed strides.
const PLOT_H = H - PAD.top - PAD.bottom
const FAR = Array.from({ length: 22 }, (_, i) => ({ id: i, x: (i * 97.3) % W, y: PAD.top + ((i * 53.7) % PLOT_H) }))
const NEAR = Array.from({ length: 9 }, (_, i) => ({ id: i, x: (i * 151.9) % W, y: PAD.top + 8 + ((i * 71.3) % (PLOT_H - 16)) }))

const view = computed(() => {
  const { t, cashed, crashed, reduce, target } = game
  const m = growth(t)
  const xMax = Math.max(X_MIN, t / HEAD_X)
  const yMax = Math.max(Y_MIN, 1 + (m - 1) / HEAD_Y)
  const x = (seconds: number) => PAD.left + (seconds / xMax) * (W - PAD.left - PAD.right)
  const y = (value: number) => H - PAD.bottom - ((value - 1) / (yMax - 1)) * (H - PAD.top - PAD.bottom)
  const base = y(1)
  // Sampled densely enough that the bend reads as smooth at any scale.
  const path = (from: number, to: number) => {
    let d = ''
    for (let i = 0; i <= 48; i++) {
      const s = from + ((to - from) * i) / 48
      d += `${i === 0 ? 'M' : 'L'}${x(s).toFixed(2)},${y(growth(s)).toFixed(2)}`
    }
    return d
  }
  const cashT = cashed === null ? null : timeAt(cashed)
  const flown = cashT === null ? t : Math.min(t, cashT)
  const line = path(0, flown)
  const area = `${line}L${x(flown).toFixed(2)},${base}L${x(0)},${base}Z`
  const lost = crashed && cashed === null
  const missed = cashT !== null && t > cashT && !crashed ? path(cashT, t) : null

  const yStep = niceAtLeast((yMax - 1) / 4)
  // 1x plus round multiples of the step (500x, 1K x, not 501x), skipping one too close to the baseline.
  const yTicks = [1]
  for (let k = Math.ceil(1 / yStep + 1e-9); k * yStep <= yMax + 1e-9; k++) {
    if (k * yStep - 1 >= yStep * 0.5) yTicks.push(+(k * yStep).toFixed(6))
  }
  const xStep = niceAtLeast(xMax / 4)
  const xTicks = Array.from({ length: Math.floor(xMax / xStep + 1e-9) }, (_, i) => (i + 1) * xStep)

  const head = { x: x(t), y: y(m) }
  // Bank along the curve's on-screen slope, levelling out on the runway at 0s and easing up over the first 0.6s of take-off.
  const slope = Math.atan2(-((H - PAD.top - PAD.bottom) / (yMax - 1)) * GROWTH * m, (W - PAD.left - PAD.right) / xMax)
  const flying = t > 0 && !crashed
  const bob = flying && !reduce ? Math.sin(t * 6) * 3 : 0
  const takeOff = reduce ? (t > 0 ? 1 : 0) : Math.min(1, t / 0.6)
  const bank = Math.max(-70, (slope * 180) / Math.PI) * takeOff + bob

  const travel = reduce ? 0 : 30 * t + 9 * Math.min(t, 20) ** 2 + 360 * Math.max(0, t - 20)
  const near = travel
  const far = travel * 0.35
  const streakLength = 4 + Math.min(14, (30 + 18 * Math.min(t, 20)) * 0.035)
  const marker = cashT === null || cashed === null ? null : { x: x(cashT), y: y(cashed) }
  const targetLine = target === null ? null : { y: y(Math.min(target, yMax)), above: target > yMax, label: formatShort(target) }

  return {
    xMax, y, x, yTicks, xTicks, line, area, lost, missed, head, bank, flying, marker, targetLine,
    far, near, streakLength,
    tone: lost ? 'lost' : cashed !== null ? 'cashed' : 'live',
  }
})
const fieldOn = computed(() => view.value.flying && !game.skipping)
</script>

<template>
  <svg aria-hidden="true" :viewBox="`0 0 ${W} ${H}`" class="flight">
    <defs>
      <linearGradient :id="fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="currentColor" stop-opacity="0.22" />
        <stop offset="1" stop-color="currentColor" stop-opacity="0" />
      </linearGradient>
      <!-- Grid lines fade in from the left, leaving the readout's corner clear. -->
      <linearGradient :id="`${fill}-fade`" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0.2" stop-color="white" stop-opacity="0" />
        <stop offset="0.6" stop-color="white" stop-opacity="1" />
      </linearGradient>
      <mask :id="`${fill}-grid`" maskUnits="userSpaceOnUse" x="0" y="0" :width="W" :height="H">
        <rect :width="W" :height="H" :fill="`url(#${fill}-fade)`" />
      </mask>
    </defs>

    <!-- Speed field: far dots and near streaks stream past, faster as the plane climbs. Shown only in flight. -->
    <g class="field" :data-on="fieldOn">
      <circle v-for="dot in FAR" :key="dot.id" :cx="wrap(dot.x - view.far, W)" :cy="dot.y" r="1" class="far" />
      <line v-for="streak in NEAR" :key="streak.id" :x1="wrap(streak.x - view.near, W)" :x2="wrap(streak.x - view.near, W) + view.streakLength" :y1="streak.y" :y2="streak.y" stroke-width="1.5" stroke-linecap="round" class="near" />
    </g>

    <g class="label">
      <AnimatePresence :initial="false">
        <motion.g v-for="value in view.yTicks" :key="`y${formatShort(value)}`" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0, transition: EXIT }" :transition="FADE">
          <line :x1="PAD.left" :x2="W - PAD.right" :y1="view.y(value)" :y2="view.y(value)" :mask="value === 1 ? undefined : `url(#${fill}-grid)`" :class="value === 1 ? 'base' : 'grid'" />
          <!-- Labels on the right, past the head. Right-aligned, so a label grown for a narrow stage stays on it. -->
          <text :x="W - 2" :y="view.y(value)" dy="0.32em" text-anchor="end" class="tick">{{ formatShort(value) }}</text>
        </motion.g>
        <motion.g v-for="value in view.xTicks" :key="`x${+value.toFixed(1)}`" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0, transition: EXIT }" :transition="FADE">
          <text :x="view.x(value)" :y="H - 8" text-anchor="middle" class="tick">{{ game.text('seconds', { seconds: String(+value.toFixed(1)) }) }}</text>
        </motion.g>
      </AnimatePresence>
    </g>

    <AnimatePresence>
      <!-- The auto target, ahead of the plane: a dashed line, or a caret at the top while it is still above the axes. It fades out once it pays. -->
      <motion.g v-if="view.targetLine" key="target" class="target" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0, transition: EXIT }" :transition="FADE">
        <line v-if="!view.targetLine.above" opacity="0.75" :x1="PAD.left" :x2="W - PAD.right" :y1="view.targetLine.y" :y2="view.targetLine.y" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" :mask="`url(#${fill}-grid)`" />
        <text :x="W - PAD.right - 4" :y="view.targetLine.above ? PAD.top + 4 : view.targetLine.y - 6" text-anchor="end" class="target-label">{{ `${game.text('autoMark', { multiplier: view.targetLine.label })}${view.targetLine.above ? ' ↑' : ''}` }}</text>
      </motion.g>
    </AnimatePresence>

    <g class="curve" :data-tone="view.lost ? 'lost' : 'live'">
      <path :d="view.area" :fill="`url(#${fill})`" />
      <path :d="view.line" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    </g>
    <AnimatePresence>
      <!-- After a cash out the plane's trail shows what was left on the table while it flies on; it clears at the crash. -->
      <motion.path v-if="view.missed" :key="`missed-${game.round}`" :d="view.missed" fill="none" stroke-width="2" stroke-dasharray="4 5" stroke-linecap="round" class="missed" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0, transition: EXIT }" :transition="FADE" />
    </AnimatePresence>

    <g v-if="view.marker" :transform="`translate(${view.marker.x.toFixed(2)},${view.marker.y.toFixed(2)})`">
      <!-- The player bails out: a parachute opens at the cash point and drifts down, swaying, before it fades. -->
      <motion.g v-if="!game.reduce" :key="`chute-${game.round}`" :style="{ transformBox: 'fill-box', transformOrigin: '50% 0%' }" :initial="{ y: 2, rotate: -12, opacity: 0 }" :animate="{ y: 40, rotate: [-12, 9, -6, 4, 0], opacity: [0, 1, 1, 0] }" :transition="CHUTE">
        <motion.g :initial="{ scale: 0.6 }" :animate="{ scale: 1 }" :transition="SWAP"><Parachute /></motion.g>
      </motion.g>
      <!-- The badge in the readout names the value; the curve marks where. -->
      <motion.circle :key="game.round" r="4.5" stroke-width="2.5" class="marker" :initial="game.reduce ? { opacity: 0 } : { opacity: 0, scale: 0.25 }" :animate="{ opacity: 1, scale: 1 }" :transition="SWAP" />
    </g>

    <g :transform="`translate(${view.head.x.toFixed(2)},${view.head.y.toFixed(2)})`" class="head" :data-tone="view.tone">
      <g v-if="game.crashed && !game.reduce" :key="`burst-${game.round}`">
        <motion.circle fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" r="28" :initial="{ scale: 5 / 28, opacity: 0.7 }" :animate="{ scale: 1, opacity: 0 }" :transition="BURST" />
        <motion.path v-for="shred in SHREDS" :key="shred.id" d="M0,-2.5L3,2L-3,2Z" fill="currentColor" :initial="{ x: 0, y: 0, rotate: 0, opacity: 1 }" :animate="{ x: shred.x, y: shred.y, rotate: shred.spin, opacity: 0 }" :transition="BURST" />
      </g>
      <!-- Screen-space fall on the outside, the plane's bank inside it. -->
      <motion.g :key="`plane-${game.round}`" :initial="false"
        :animate="game.crashed ? (game.reduce ? { opacity: 0 } : { x: 16, y: 70, rotate: 150, scale: 0.75, opacity: [1, 1, 0] }) : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }"
        :transition="game.crashed && !game.reduce ? TUMBLE : { duration: 0.2, ease: easeOut }">
        <g :transform="`rotate(${view.bank.toFixed(2)}) translate(0,-3)`">
          <!-- A folded paper plane, nose to the right, about 26 units long. -->
          <g>
            <path d="M13,0L-4,-1L-8,6Z" fill="currentColor" opacity="0.55" />
            <path d="M13,0L-11,-9L-4,-1Z" fill="currentColor" />
            <path d="M13,0L-4,-1" class="plane-fold" stroke-width="0.75" />
          </g>
        </g>
      </motion.g>
      <!-- Where the flight ended, left behind once the plane has fallen, so a finished graph still says how far it got. -->
      <motion.g v-if="game.crashed" :key="`end-${game.round}`" :initial="game.reduce ? { opacity: 0 } : { opacity: 0, scale: 0.25 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ ...SWAP, delay: game.reduce ? 0 : 0.35 }">
        <circle r="7" fill="currentColor" opacity="0.15" />
        <path d="M-3,-3L3,3M3,-3L-3,3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </motion.g>
    </g>
  </svg>
</template>

<style scoped>
.flight { display: block; width: 100%; }
.field { opacity: 0; transition: opacity .2s; }
.field[data-on='true'] { opacity: 1; }
.far { fill: color-mix(in oklab, var(--beui-foreground) 15%, transparent); }
.near { stroke: color-mix(in oklab, var(--beui-foreground) 10%, transparent); }
.label { color: var(--beui-muted-foreground); font-size: var(--crash-label, 10px); font-variant-numeric: tabular-nums; }
.tick { fill: currentColor; font-size: var(--crash-label, 10px); }
.base { stroke: var(--beui-border); }
.grid { stroke: color-mix(in oklab, var(--beui-foreground) 7%, transparent); }
.target { color: var(--beui-primary); }
.target-label { fill: color-mix(in oklab, var(--beui-primary) 75%, black); font-size: var(--crash-label, 10px); font-weight: 500; font-variant-numeric: tabular-nums; }
:global(.dark .flight .target-label) { fill: color-mix(in oklab, var(--beui-primary) 80%, white); }
:global([data-beui-theme='dark'] .flight .target-label) { fill: color-mix(in oklab, var(--beui-primary) 80%, white); }
.curve { color: var(--beui-primary); transition: color .15s; }
.curve[data-tone='lost'], .head[data-tone='lost'] { color: #f43f5e; }
.head { color: var(--beui-primary); transition: color .15s; }
.head[data-tone='cashed'] { color: var(--beui-muted-foreground); }
.missed { stroke: color-mix(in oklab, var(--beui-muted-foreground) 50%, transparent); }
.marker { fill: var(--beui-card); stroke: var(--beui-primary); }
.plane-fold { stroke: color-mix(in oklab, var(--beui-card) 40%, transparent); }
</style>
