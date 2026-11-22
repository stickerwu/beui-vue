<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const plinkoMessages = {
  board: 'Plinko board',
  drop: 'Drop ball',
  pegFlash: 'Peg flash',
  sound: 'Sound',
  landed: 'Ball {ball} landed in slot {slot}: {value}',
}
export type PlinkoMessages = typeof plinkoMessages
export type PlinkoValue = string | number
</script>

<script setup lang="ts">
import { AnimatePresence, motion, useAnimate } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import ButtonBase from '../ButtonBase.vue'
import { createTickPlayer, type TickPlayer } from '../core/tick-sound'
import { easeOut } from '../core/motion'
import GameToggleButton from './GameToggleButton.vue'
import { plinkoSlots } from './game-math'
import './game-parts.css'

const props = withDefaults(defineProps<{
  /** Rows of pegs when `slots` isn't passed. Default 12. */
  rows?: number
  /** Slot values, left to right. Their count sets the board: n slots get n - 1 rows of pegs, so `rows` is ignored when this is passed. */
  slots?: readonly PlinkoValue[]
  /** Balls allowed in flight at once. Default 12. */
  maxBalls?: number
  dropLabel?: string
  /** Flash each peg as the ball hits it (controlled). Hidden with reduced motion, where no pegs are hit. */
  pegFlash?: boolean
  defaultPegFlash?: boolean
  pegFlashLabel?: string
  /** Click on every peg hit and landing (controlled). */
  sound?: boolean
  defaultSound?: boolean
  soundLabel?: string
  labels?: Partial<PlinkoMessages>
  /** Injectable random source, for reproducible drops. */
  random?: () => number
}>(), { rows: 12, maxBalls: 12, defaultPegFlash: true, pegFlash: undefined, sound: undefined, defaultSound: false, random: () => Math.random() })
const emit = defineEmits<{
  land: [slot: number, value: PlinkoValue]
  'update:pegFlash': [value: boolean]; pegFlashChange: [value: boolean]
  'update:sound': [value: boolean]; soundChange: [value: boolean]
}>()

// Board geometry in SVG units; the board scales to its container's width.
const GAP = 32 // horizontal space between pegs
const ROW = 30 // vertical space between peg rows
const PEG = 3.5
const BALL = 7
const TOP = 48 // first peg row
const SLOT = 34 // slot height

// A drop speeds up (EASE_IN); RISE, its mirror, slows down like a hop and is local because only a bounce needs it.
const EASE_IN = [0.55, 0, 1, 0.45] as const
const RISE = [0, 0.55, 0.45, 1] as const
const HOP_TIME = 0.09 // seconds rising after a peg
const DROP_TIME = 0.16 // seconds falling to the next peg
const HOP_HEIGHT = 7
// Landing tick playback rates: 0.55 in the centre slot, up to 0.95 at the edges.
const LANDING_RATE = 0.55
const LANDING_SPREAD = 0.4

interface Ball {
  id: number
  path: { x: number; y: number }[]
  times: number[]
  slot: number
  duration: number
  /** Id of the peg hit on each row, top to bottom. */
  pegs: string[]
  /** Row of the last peg hit, -1 before the first. */
  lastRow: number
  /** Last rendered y, to catch the frame the ball turns back up off a peg. */
  y: number
  /** Moving up on the last frame: still on the hop from the last peg. */
  rising: boolean
  /** Set once the ball reaches its slot; its exit fade must not land again. */
  landed?: boolean
  yEase: (typeof EASE_IN | typeof RISE)[]
}

let nextBall = 0

const t = computed(() => ({ ...plinkoMessages, ...props.labels }))
const reduce = useReducedMotion()
const [scope, animate] = useAnimate()
const balls = shallowRef<Ball[]>([])
const announcement = shallowRef('')
// The last slot hit stays marked after its flash fades.
const lastSlot = shallowRef<number | null>(null)
const internalSound = shallowRef(props.defaultSound)
const soundOn = computed(() => props.sound ?? internalSound.value)
const internalFlash = shallowRef(props.defaultPegFlash)
const flashOn = computed(() => props.pegFlash ?? internalFlash.value)

// Landings are numbered so a second ball in the same slot still changes the live region's text and is announced again.
let landings = 0
// Each player cuts its own previous tick, so landings get their own player.
let players: Record<'peg' | 'landing', TickPlayer> | null = null
function getPlayers() {
  if (!players) players = { peg: createTickPlayer(), landing: createTickPlayer() }
  return players
}
onBeforeUnmount(() => { players?.peg.dispose(); players?.landing.dispose(); players = null })

function togglePegFlash() {
  const next = !flashOn.value
  if (props.pegFlash === undefined) internalFlash.value = next
  emit('update:pegFlash', next); emit('pegFlashChange', next)
}
function toggleSound() {
  const next = !soundOn.value
  // Unlock audio inside the click, where browsers allow it.
  if (next) getPlayers().peg.prepare()
  if (props.sound === undefined) internalSound.value = next
  emit('update:sound', next); emit('soundChange', next)
}

const values = computed(() => props.slots ?? plinkoSlots(props.rows))
const rows = computed(() => values.value.length - 1)
const invalid = computed(() => values.value.length < 2)

// A new board size makes every ball in flight point at pegs that moved, so drop them at once.
watch(rows, () => { balls.value = []; lastSlot.value = null }, { flush: 'sync' })

const width = computed(() => (rows.value + 2) * GAP)
const height = computed(() => TOP + rows.value * ROW + SLOT)
// Each row runs one peg past the ball's reach on both sides, so the board reads as a triangle that widens down to the slots.
const pegs = computed(() => Array.from({ length: Math.max(0, rows.value) }, (_, row) =>
  Array.from({ length: row + 3 }, (_, i) => ({ id: `${row}-${i - 1}`, x: width.value / 2 + (i - 1 - row / 2) * GAP, y: TOP + row * ROW })),
).flat())
const slotCells = computed(() => values.value.map((label, slot) => {
  const x = width.value / 2 + (slot - rows.value / 2) * GAP - GAP / 2
  return { slot, label, x, y: TOP + rows.value * ROW, size: Math.min(9, (GAP - 8) / (String(label).length * 0.6)) }
}))

/** Height of the ball's centre where it touches a peg on `row`. */
const contactY = (row: number) => TOP + row * ROW - PEG - BALL

/** Random left/right steps from the top peg to a slot, as keyframes. */
function plan(rowCount: number, boardWidth: number) {
  const center = boardWidth / 2
  const points = [{ x: center, y: BALL }] // enters fully inside the board
  const steps: number[] = [0.22] // first fall from the chute to the top peg
  const pegIds: string[] = []
  let k = 0 // rightward steps so far
  for (let row = 0; row < rowCount; row++) {
    const x = center + (k - row / 2) * GAP
    pegIds.push(`${row}-${k}`)
    points.push({ x, y: contactY(row) })
    const right = props.random() < 0.5
    points.push({ x: x + (right ? GAP / 4 : -GAP / 4), y: contactY(row) - HOP_HEIGHT })
    steps.push(HOP_TIME, DROP_TIME)
    if (right) k++
  }
  // Come to rest just inside the slot's top edge, clear of its label.
  points.push({ x: center + (k - rowCount / 2) * GAP, y: TOP + rowCount * ROW - BALL + 3 })
  const duration = steps.reduce((sum, step) => sum + step, 0)
  const times = [0]
  for (const step of steps) times.push(times[times.length - 1]! + step / duration)
  return { path: points, times, slot: k, duration, pegs: pegIds, yEase: times.slice(1).map((_, i) => (i % 2 === 1 ? RISE : EASE_IN)) }
}

function land(slot: number) {
  void animate(`[data-slot="${slot}"]`, { opacity: [0.9, 0] }, { duration: 0.3, ease: easeOut })
  // A lower thunk than a peg hit marks the landing, brighter toward the edges, where landing is rarest.
  if (soundOn.value) getPlayers().landing.play(LANDING_RATE + LANDING_SPREAD * (Math.abs(slot - rows.value / 2) / (rows.value / 2)))
  lastSlot.value = slot
  landings++
  announcement.value = t.value.landed.replace('{ball}', String(landings)).replace('{slot}', String(slot + 1)).replace('{value}', String(values.value[slot]))
  emit('land', slot, values.value[slot]!)
}

// Flash and click a peg on the frame the ball turns back up off it. Reading the ball's own frames keeps both on its clock.
function hitPegs(ball: Ball, y: number) {
  const rising = y < ball.y
  // The row comes from where the ball turned, not from counting turns, so a slow frame that skips a whole hop misses only that peg.
  const row = Math.round((Math.max(ball.y, y) - contactY(0)) / ROW)
  if (rising && !ball.rising && row > ball.lastRow && row < ball.pegs.length) {
    ball.lastRow = row
    const peg = ball.pegs[row]
    // Fast attack, slower decay: the pop peaks a third of the way in.
    if (flashOn.value) void animate(`[data-peg="${peg}"]`, { scale: [1, 1.8, 1], opacity: [0.4, 1, 0.4] }, { duration: 0.3, times: [0, 0.3, 1], ease: easeOut })
    if (soundOn.value) getPlayers().peg.play()
  }
  ball.y = y
  ball.rising = rising
}

const full = computed(() => balls.value.length >= props.maxBalls)
function drop() {
  if (full.value) return
  const ball: Ball = { id: nextBall++, lastRow: -1, y: 0, rising: false, ...plan(rows.value, width.value) }
  if (soundOn.value) getPlayers().peg.prepare()
  if (reduce.value) { land(ball.slot); return }
  balls.value = [...balls.value, ball]
}
function ballUpdate(ball: Ball, latest: Record<string, unknown>) {
  if (typeof latest.y === 'number') hitPegs(ball, latest.y)
}
function ballDone(ball: Ball) {
  if (ball.landed) return
  ball.landed = true
  land(ball.slot)
  balls.value = balls.value.filter(other => other.id !== ball.id)
}
</script>

<template>
  <section v-if="!invalid" class="plinko" data-slot="plinko" :aria-label="t.board">
    <svg ref="scope" class="board" :viewBox="`0 0 ${width} ${height}`" :style="{ maxWidth: `${width * 1.4}px` }" aria-hidden="true">
      <circle v-for="peg in pegs" :key="peg.id" class="peg" :data-peg="peg.id" :cx="peg.x" :cy="peg.y" :r="PEG" />
      <g v-for="cell in slotCells" :key="cell.slot">
        <rect class="slot" :class="{ last: cell.slot === lastSlot }" :x="cell.x + 2" :y="cell.y" :width="GAP - 4" :height="SLOT - 4" rx="6" />
        <rect class="slot-flash" :data-slot="cell.slot" :x="cell.x + 2" :y="cell.y" :width="GAP - 4" :height="SLOT - 4" rx="6" />
        <text class="slot-label" :class="{ last: cell.slot === lastSlot }" :x="cell.x + GAP / 2" :y="cell.y + (SLOT - 4) / 2" text-anchor="middle" dominant-baseline="central" :font-size="cell.size">{{ cell.label }}</text>
      </g>
      <!-- Keyed by size: balls from a board that changed size leave at once. -->
      <AnimatePresence :key="rows">
        <motion.circle v-for="ball in balls" :key="ball.id" class="ball" :r="BALL" cx="0" cy="0"
          :initial="{ x: ball.path[0]!.x, y: ball.path[0]!.y, opacity: 0, scale: 0.9 }"
          :animate="{ x: ball.path.map(point => point.x), y: ball.path.map(point => point.y), opacity: 1, scale: 1 }"
          :exit="{ opacity: 0, y: (ball.path.at(-1)?.y ?? 0) + 4, transition: { duration: 0.12, ease: easeOut } }"
          :transition="{
            opacity: { duration: 0.15, ease: easeOut },
            scale: { duration: 0.15, ease: easeOut },
            x: { duration: ball.duration, times: ball.times, ease: 'linear' },
            y: { duration: ball.duration, times: ball.times, ease: ball.yEase },
          }"
          @update="ballUpdate(ball, $event)" @animation-complete="ballDone(ball)" />
      </AnimatePresence>
    </svg>

    <div class="controls">
      <!-- aria-disabled, not disabled: a disabled button drops keyboard focus. -->
      <ButtonBase class="drop" :press-scale="0.96" :aria-disabled="full || undefined" @click="drop">{{ dropLabel ?? t.drop }}</ButtonBase>
      <!-- With reduced motion balls land at once and hit no pegs. -->
      <GameToggleButton v-if="!reduce" :on="flashOn" :label="pegFlashLabel ?? t.pegFlash" on-icon="Zap" off-icon="ZapOff" @toggle="togglePegFlash" />
      <GameToggleButton :on="soundOn" :label="soundLabel ?? t.sound" on-icon="Volume2" off-icon="VolumeX" @toggle="toggleSound" />
    </div>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </section>
</template>

<style scoped>
.plinko { display: flex; width: 100%; flex-direction: column; align-items: center; gap: 16px; }
.board { display: block; width: 100%; }
.peg { fill: var(--beui-foreground); opacity: .4; transform-box: fill-box; transform-origin: center; }
.slot { fill: var(--beui-muted); }
.slot.last { fill: color-mix(in srgb, var(--beui-primary) 20%, transparent); }
.slot-flash { fill: var(--beui-primary); opacity: 0; }
.slot-label { fill: var(--beui-foreground); font-weight: 500; font-variant-numeric: tabular-nums; }
.slot-label.last { font-weight: 600; }
.ball { fill: var(--beui-primary); }
.controls { display: flex; align-items: center; gap: 8px; }
.drop[aria-disabled='true'] { cursor: not-allowed; }
.sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
</style>
