<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, useId } from 'vue'
import CrashEnvelope from './CrashEnvelope.vue'
import Parachute from './Parachute.vue'
import { BURST, CHUTE, STAGE_W, clamp01, cubicBezier, easeIn, niceAtLeast, wrap } from './crash-parts'
import { growth, timeAt, type CrashGameState } from './crash-round'
import { EXIT, PULSE, SWAP, formatShort } from './game-parts'
import { easeInOut, easeOut } from '../core/motion'

/**
 * Crash, drawn as a hot-air balloon on an altimeter: the multiplier is the altitude. The balloon lifts off and holds
 * while the tape and clouds scroll past; cash out to bail before the envelope pops.
 */
const { game } = defineProps<{ game: CrashGameState }>()

// Stage geometry in SVG units; the stage scales to its container's width.
const W = STAGE_W
const H = 280
// The balloon sits centre right, clear of the readout; the tape runs down the right edge.
const BX = 262
const TAPE_X = 348
// The balloon's envelope centre once aloft, and the tape caret beside it.
const LEVEL = 112
// The highest a target mark sits, so its flag stays on the stage.
const TARGET_PIN = 14
const GROUND_Y = H - 24
// The basket's bottom is 51 units under the envelope centre.
const PARKED = GROUND_Y - 51
// Tape units per unit of ln(multiplier): 1x to 2x spans about 166 units.
const PX = 240
// Clouds stop speeding up past 100x.
const CLOUD_CAP = PX * Math.log(100)
// The lift-off takes this long before the balloon holds and the world scrolls.
const LIFT = 1.2
const rise = cubicBezier(easeInOut)
const id = `crash-balloon-${useId().replace(/[^\w-]/g, '')}`

// The basket drops out of the sky, accelerating.
const DROP = { duration: 0.6, ease: easeIn } as const

// Fabric torn from the envelope, thrown round it and pulled down a little.
const SHARDS = Array.from({ length: 8 }, (_, i) => {
  const angle = ((i * 45 + (i % 2) * 12) * Math.PI) / 180
  const reach = 30 + (i % 3) * 9
  return { id: i, x0: Math.cos(angle) * 12, y0: Math.sin(angle) * 12, x: Math.cos(angle) * reach, y: Math.sin(angle) * reach + 14, spin: (i % 2 ? 1 : -1) * (120 + i * 25) }
})
// Two depths: far clouds are small, faint and slow; near ones bigger and quicker.
const CLOUDS = [
  { id: 0, x: 60, y: 40, size: 0.7, speed: 0.45, opacity: 0.04 },
  { id: 1, x: 200, y: 150, size: 0.6, speed: 0.45, opacity: 0.04 },
  { id: 2, x: 310, y: 250, size: 0.75, speed: 0.45, opacity: 0.04 },
  { id: 3, x: 150, y: 90, size: 1.1, speed: 1.4, opacity: 0.07 },
  { id: 4, x: 290, y: 20, size: 1.2, speed: 1.4, opacity: 0.07 },
  { id: 5, x: 90, y: 220, size: 1, speed: 1.4, opacity: 0.07 },
]
const SPAN = H + 40
// Fixed-altitude sights in the column between the readout and the balloon.
const JET_T = timeAt(10)
const FLOCK = [
  { id: 0, x: 0, y: 0, phase: 0 },
  { id: 1, x: -11, y: 7, phase: 1.3 },
  { id: 2, x: 10, y: 9, phase: 2.6 },
]

/** The next step up the 1, 2, 5 ladder. */
function nextStep(step: number) {
  const unit = Math.round(step / 10 ** Math.floor(Math.log10(step) + 1e-9))
  return Number((step * (unit === 2 ? 2.5 : 2)).toPrecision(12))
}

const view = computed(() => {
  const { t, cashed, lost, reduce } = game
  const m = growth(t)
  // Everything that scrolls derives from ln(m), so a skip just scrolls faster.
  const climb = PX * Math.log(m)
  const lift = t <= 0 ? 0 : reduce ? 1 : rise(Math.min(1, t / LIFT))
  const by = PARKED + (LEVEL - PARKED) * lift
  // Sway eases in with the lift and freezes at the crash with the clock.
  const sway = reduce ? 0 : lift
  const tilt = Math.sin(t * 1.6) * 2 * sway
  const drift = Math.sin(t * 1.1 + 0.6) * 2 * sway
  // Clouds speed up as the climb goes on, up to 100x, then hold that speed so a very long climb can't strobe them.
  const eased = Math.min(climb, CLOUD_CAP)
  const travel = reduce ? 0 : climb + eased ** 2 / 600 + (eased / 300) * (climb - eased)
  // The basket falls clear of the stage, or stays put if it never left the ground.
  const fall = (H + 10 - (by + 42)) * lift
  // Where an altitude sits on screen: the tape, its markers and the landmarks share it.
  const at = (value: number) => LEVEL - (Math.log(value) - Math.log(m)) * PX
  const flagY = cashed === null ? null : at(cashed)
  return { m, climb, lift, by, tilt, drift, travel, fall, at, flagY, tone: lost ? 'lost' : cashed !== null ? 'cashed' : 'live' }
})

const clouds = computed(() => CLOUDS.map((cloud) => ({ ...cloud, y2: wrap(cloud.y + view.value.travel * cloud.speed, SPAN) - 20 })))

/** The altimeter: ticks for the multipliers in view, scrolling down on a log scale as the balloon climbs. */
const ticks = computed(() => {
  const m = view.value.m
  // Multipliers at the top and bottom edges of the stage.
  const top = m * Math.exp(LEVEL / PX)
  const bottom = Math.max(1, m * Math.exp((LEVEL - H) / PX))
  // The finest step still 8 units apart where ticks sit widest; denser ticks further up fade out by spacing.
  const base = niceAtLeast((bottom * 8) / PX)
  const out: { value: number; y: number; tick: number; label: number }[] = []
  for (let k = Math.ceil(bottom / base - 1e-9); k * base <= top; k++) {
    const value = Number((k * base).toPrecision(12))
    // A tick's weight is the coarsest step it lands on.
    let level = base
    for (let step = base; step <= value; step = nextStep(step)) {
      if (Math.abs(value / step - Math.round(value / step)) < 1e-6) level = step
    }
    const gap = PX * Math.log1p(level / value)
    const tick = clamp01((gap - 8) / 10)
    if (tick === 0) continue
    out.push({ value, y: LEVEL - (Math.log(value) - Math.log(m)) * PX, tick, label: clamp01((gap - 56) / 16) })
  }
  return out
})

/** A flock at 3x, a jet at 10x and a satellite at 100x, each brightening as the balloon passes it. */
const sights = computed(() => {
  const { t } = game
  return [
    // Close to the balloon, clear of the readout on narrow stages.
    { value: 3, x: 208 },
    // The jet crosses the column slowly, nose left.
    { value: 10, x: 204 - (t - JET_T) * 2.5 },
    { value: 100, x: 210 },
  ].flatMap(({ value, x }) => {
    const y = view.value.at(value)
    if (y < -30 || y > H + 30) return []
    // 0.4 at rest, peaking at 0.8 level with the balloon.
    const near = Math.abs(y - LEVEL) < 40 ? 0.5 + 0.5 * Math.cos((Math.PI * (y - LEVEL)) / 40) : 0
    return [{ value, x, y, opacity: 0.4 + 0.4 * near }]
  })
})
const flock = computed(() => FLOCK.map((bird) => {
  const flap = Math.sin(game.t * 9 + bird.phase) * 2.5
  const tip = (bird.y - flap).toFixed(2)
  return { id: bird.id, d: `M${bird.x - 4},${tip}L${bird.x},${bird.y}L${bird.x + 4},${tip}` }
}))
const beacon = computed(() => (Math.sin(game.t * 5) > 0.2 ? 1 : 0.15))
const targetY = computed(() => (game.target === null ? 0 : view.value.at(game.target)))
const ghostHidden = computed(() => game.target !== null && game.ghost !== null && Math.abs(view.value.at(game.ghost) - Math.max(targetY.value, TARGET_PIN)) < 12)
</script>

<template>
  <svg aria-hidden="true" :viewBox="`0 0 ${W} ${H}`" class="balloon">
    <defs>
      <!-- The tape fades out at its ends like a drum turning away. -->
      <linearGradient :id="`${id}-fade`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="white" stop-opacity="0" />
        <stop offset="0.18" stop-color="white" stop-opacity="1" />
        <stop offset="0.82" stop-color="white" stop-opacity="1" />
        <stop offset="1" stop-color="white" stop-opacity="0" />
      </linearGradient>
      <mask :id="`${id}-tape`" maskUnits="userSpaceOnUse" x="0" y="0" :width="W" :height="H">
        <rect :width="W" :height="H" :fill="`url(#${id}-fade)`" />
      </mask>
    </defs>

    <!-- Clouds and sights stream with t, so a skip would only flicker them: they fade out while it runs. Reduced motion keeps the clouds still and leaves the sights out. -->
    <g class="world" :data-skip="game.skipping">
      <g v-for="cloud in clouds" :key="cloud.id" :transform="`translate(${cloud.x},${cloud.y2}) scale(${cloud.size})`" :opacity="cloud.opacity" class="cloud">
        <rect x="-18" y="-4" width="36" height="10" rx="5" />
        <circle cx="-5" cy="-4" r="8" />
        <circle cx="7" cy="-2" r="6" />
      </g>

      <g :transform="`translate(0,${game.reduce ? 0 : view.climb.toFixed(2)})`" class="ground" :data-hidden="game.reduce && game.t > 0">
        <rect :y="GROUND_Y" :width="W" :height="H - GROUND_Y" class="ground-fill" />
        <line x1="0" :x2="W" :y1="GROUND_Y" :y2="GROUND_Y" class="border" />
        <ellipse :cx="BX" :cy="GROUND_Y + 3" rx="14" ry="2.5" :opacity="1 - view.lift" class="shadow" />
      </g>

      <!-- A flock at 3x, a jet at 10x and a satellite at 100x, each brightening as the balloon passes it. -->
      <g v-if="!game.reduce" class="sights">
        <g v-for="sight in sights" :key="sight.value" :transform="`translate(${sight.x.toFixed(2)},${sight.y.toFixed(2)})`" :opacity="sight.opacity">
          <template v-if="sight.value === 3">
            <path v-for="bird in flock" :key="bird.id" :d="bird.d" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
          </template>
          <g v-else-if="sight.value === 10">
            <line x1="9" x2="30" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.35" />
            <path d="M-7,0L-4,-1.5H7L9,-4.5H10L9.5,0Z" fill="currentColor" />
            <path d="M-1,-0.5L4,4.5H5.5L3.5,-0.5Z" fill="currentColor" />
          </g>
          <g v-else>
            <rect x="-3" y="-2.5" width="6" height="5" rx="1" fill="currentColor" />
            <rect x="-13" y="-2" width="8" height="4" fill="none" stroke="currentColor" />
            <rect x="5" y="-2" width="8" height="4" fill="none" stroke="currentColor" />
            <path d="M-5,0H-3M3,0H5M0,-2.5V-6" stroke="currentColor" />
            <circle cy="-7" r="1.25" :opacity="beacon" class="beacon" />
          </g>
        </g>
      </g>
    </g>

    <!-- Ties the balloon to its reading on the tape once it holds altitude. -->
    <line :x1="BX + 34" :x2="TAPE_X - 10" :y1="LEVEL" :y2="LEVEL" stroke-dasharray="2 4" :opacity="view.lift" class="tie" />

    <g :mask="`url(#${id}-tape)`" class="tape">
      <rect :x="TAPE_X" :width="W - TAPE_X" :height="H" class="tape-fill" />
      <line :x1="TAPE_X" :x2="TAPE_X" y1="0" :y2="H" class="border" />
      <g v-for="tick in ticks" :key="tick.value" :transform="`translate(${TAPE_X},${tick.y.toFixed(2)})`">
        <line :x2="5 + 7 * tick.label" :opacity="tick.tick" class="tick-line" />
        <!-- Right-aligned, so a label grown for a narrow stage stays on it. -->
        <text v-if="tick.label > 0" :x="W - TAPE_X - 2" dy="0.32em" text-anchor="end" :opacity="tick.label" class="tick-text">{{ formatShort(tick.value) }}</text>
      </g>
    </g>

    <!-- Last round's crash point, a quiet trace to climb past. -->
    <g v-if="game.ghost !== null" :transform="`translate(${TAPE_X},${view.at(game.ghost).toFixed(2)})`" class="ghost">
      <motion.g :key="game.ghost" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="SWAP">
        <line x2="12" stroke="currentColor" stroke-dasharray="2 2" />
        <path d="M-8.5,-2.5L-3.5,2.5M-3.5,-2.5L-8.5,2.5" stroke="currentColor" stroke-width="1.25" />
        <!-- Dropped when it would print over the target's label. -->
        <text v-if="!ghostHidden" x="-12" dy="0.32em" text-anchor="end" class="tick-text ghost-text">{{ formatShort(game.ghost) }}</text>
      </motion.g>
    </g>

    <AnimatePresence :initial="false">
      <!-- The auto target. On the frame it pays it fades and the cash-out flag takes over; the exiting copy keeps its last position. -->
      <motion.g v-if="game.target !== null" key="target" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0, transition: EXIT }" :transition="SWAP" class="target">
        <g :transform="`translate(${TAPE_X},${Math.max(targetY, TARGET_PIN).toFixed(2)})`">
          <line v-if="targetY >= TARGET_PIN" :x2="W - TAPE_X" stroke="currentColor" stroke-dasharray="3 3" stroke-width="1.25" opacity="0.7" />
          <path d="M0,0V-10L8,-7L0,-4" fill="none" stroke="currentColor" stroke-linejoin="round" opacity="0.7" />
          <text x="-12" dy="0.32em" text-anchor="end" class="target-label">{{ targetY < TARGET_PIN ? `${game.text('targetMarkValue', { multiplier: formatShort(game.target) })} ↑` : game.text('targetMark') }}</text>
        </g>
      </motion.g>
    </AnimatePresence>

    <g v-if="view.flagY !== null" :transform="`translate(${TAPE_X},${view.flagY.toFixed(2)})`" class="flag">
      <motion.g :key="game.round" :initial="game.reduce ? { opacity: 0 } : { opacity: 0, scale: 0.25 }" :animate="{ opacity: 1, scale: 1 }" :transition="SWAP">
        <line x1="0" x2="14" y1="0" y2="0" stroke="currentColor" stroke-width="1.5" />
        <path d="M0,0V-10L8,-7L0,-4Z" fill="currentColor" />
      </motion.g>
    </g>

    <g :transform="`translate(${TAPE_X},${LEVEL})`" class="caret" :data-tone="game.lost ? 'lost' : 'live'">
      <line x1="0" :x2="W - TAPE_X" opacity="0.5" stroke="currentColor" />
      <motion.g :key="game.pulse" :initial="game.pulse > 0 && !game.reduce ? { scale: 1.5 } : false" :animate="{ scale: 1 }" :transition="PULSE">
        <path d="M-9,-4.5L-2,0L-9,4.5Z" fill="currentColor" />
      </motion.g>
    </g>

    <!-- The player bails out from the basket and drifts down under a chute, once the balloon is aloft; a cash out on the ground has no drop. -->
    <g v-if="game.cashed !== null && !game.reduce && timeAt(game.cashed) >= LIFT" :transform="`translate(${BX + 8},${(view.by + 48).toFixed(2)})`">
      <motion.g :key="game.round" :style="{ transformBox: 'fill-box', transformOrigin: '50% 0%' }" :initial="{ y: 0, rotate: -10, opacity: 0 }" :animate="{ y: 96, rotate: [-10, 8, -5, 3, 0], opacity: [0, 1, 1, 0] }" :transition="CHUTE">
        <motion.g :initial="{ scale: 0.5 }" :animate="{ scale: 1 }" :transition="SWAP"><Parachute /></motion.g>
      </motion.g>
    </g>

    <g :transform="`translate(${BX},${view.by.toFixed(2)})`" class="body" :data-tone="view.tone">
      <g v-if="game.crashed && !game.reduce" :key="`burst-${game.round}`">
        <motion.circle fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" r="48" :initial="{ scale: 12 / 48, opacity: 0.7 }" :animate="{ scale: 1, opacity: 0 }" :transition="BURST" />
        <motion.path v-for="shard in SHARDS" :key="shard.id" d="M-3,-2Q0,-4 3,-2L2,2Q0,1 -2,2Z" fill="currentColor" :initial="{ x: shard.x0, y: shard.y0, rotate: 0, opacity: 1 }" :animate="{ x: shard.x, y: shard.y, rotate: shard.spin, opacity: 0 }" :transition="BURST" />
      </g>
      <!-- Remounts per round, so a new balloon fades in where the last one popped. -->
      <motion.g :key="game.round" :initial="game.round > 0 ? { opacity: 0 } : false" :animate="{ opacity: game.crashed && game.reduce ? 0 : 1 }" :transition="{ duration: 0.2, ease: easeOut }">
        <g :transform="`translate(${view.drift.toFixed(2)},0) rotate(${view.tilt.toFixed(2)})`">
          <motion.g :initial="false" :animate="game.crashed && !game.reduce ? { y: view.fall, rotate: 14 } : { y: 0, rotate: 0 }" :transition="game.crashed && !game.reduce ? DROP : { duration: 0 }">
            <path d="M-6,31L-5,42M6,31L5,42" stroke="currentColor" stroke-width="0.75" opacity="0.6" />
            <rect x="-6" y="42" width="12" height="9" rx="1.5" class="basket" />
            <line x1="-6.5" x2="6.5" y1="42.5" y2="42.5" stroke-width="1.5" class="basket-rim" />
          </motion.g>
          <motion.g :initial="false" :animate="game.crashed && !game.reduce ? { scale: 1.15, opacity: 0 } : { scale: 1, opacity: 1 }" :transition="game.crashed && !game.reduce ? { duration: 0.12, ease: easeOut } : { duration: 0 }">
            <CrashEnvelope />
          </motion.g>
        </g>
      </motion.g>
    </g>
  </svg>
</template>

<style scoped>
.balloon { display: block; width: 100%; }
.world { color: var(--beui-foreground); opacity: 1; transition: opacity .2s; }
.world[data-skip='true'] { opacity: 0; }
.cloud { fill: var(--beui-foreground); }
.ground { transition: opacity .2s; }
.ground[data-hidden='true'] { opacity: 0; }
.ground-fill { fill: color-mix(in oklab, var(--beui-foreground) 5%, transparent); }
.border { stroke: var(--beui-border); }
.shadow { fill: color-mix(in oklab, var(--beui-foreground) 10%, transparent); }
.beacon { fill: var(--beui-primary); }
.tie { stroke: color-mix(in oklab, var(--beui-foreground) 15%, transparent); }
.tape { color: var(--beui-muted-foreground); font-size: var(--crash-label, 10px); font-variant-numeric: tabular-nums; }
.tape-fill { fill: color-mix(in oklab, var(--beui-foreground) 3%, transparent); }
.tick-line { stroke: color-mix(in oklab, var(--beui-foreground) 30%, transparent); }
.tick-text { fill: var(--beui-muted-foreground); font-size: var(--crash-label, 10px); font-variant-numeric: tabular-nums; }
.ghost { color: color-mix(in oklab, var(--beui-muted-foreground) 60%, transparent); }
.target { color: var(--beui-primary); }
.target-label { fill: color-mix(in oklab, var(--beui-primary) 75%, black); font-size: var(--crash-label, 10px); }
:global(.dark .balloon .target-label) { fill: color-mix(in oklab, var(--beui-primary) 80%, white); }
:global([data-beui-theme='dark'] .balloon .target-label) { fill: color-mix(in oklab, var(--beui-primary) 80%, white); }
.flag { color: var(--beui-primary); }
.caret { color: var(--beui-primary); transition: color .15s; }
.caret[data-tone='lost'] { color: #f43f5e; }
.body { color: var(--beui-primary); transition: color .15s; }
.body[data-tone='lost'] { color: #f43f5e; }
.body[data-tone='cashed'] { color: var(--beui-muted-foreground); }
.basket { fill: color-mix(in oklab, var(--beui-foreground) 60%, transparent); }
.basket-rim { stroke: color-mix(in oklab, var(--beui-foreground) 70%, transparent); }
</style>
