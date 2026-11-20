<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { plinkoSlots } from './game-math'
import { useGameAudio } from './use-game-audio'

type Value = string | number
interface Point { x: number; y: number }
interface Ball { id: number; points: Point[]; position: Point; slot: number; started: number; duration: number; value: Value; peg: number }
const props = withDefaults(defineProps<{
  rows?: number; slots?: readonly Value[]; maxBalls?: number; dropLabel?: string; pegFlash?: boolean; defaultPegFlash?: boolean; pegFlashLabel?: string
  sound?: boolean; defaultSound?: boolean; soundLabel?: string; labels?: Partial<Record<string, string>>; random?: () => number
}>(), { rows: 12, maxBalls: 12, defaultPegFlash: true, pegFlash: undefined, sound: undefined, random: Math.random })
const emit = defineEmits<{ land: [slot: number, value: Value]; 'update:pegFlash': [value: boolean]; pegFlashChange: [value: boolean]; 'update:sound': [value: boolean]; soundChange: [value: boolean] }>()
const slots = computed(() => props.slots ?? plinkoSlots(props.rows))
const rows = computed(() => slots.value.length - 1)
const width = computed(() => (rows.value + 2) * 32)
const height = computed(() => 48 + rows.value * 30 + 34)
const pegs = computed(() => Array.from({ length: Math.max(0, rows.value) }, (_, row) => Array.from({ length: row + 1 }, (_, col) => ({ id: `${row}-${col}`, x: width.value / 2 + (col - row / 2) * 32, y: 48 + row * 30 }))).flat())
const localFlash = shallowRef(props.defaultPegFlash)
const localSound = shallowRef(props.defaultSound ?? false)
const flash = computed(() => props.pegFlash ?? localFlash.value)
const sound = computed(() => props.sound ?? localSound.value)
const reduced = shallowRef(false)
const balls = shallowRef<Ball[]>([])
const last = shallowRef(-1)
const announcement = shallowRef('')
const pegHit = shallowRef<Point | null>(null)
const audio = useGameAudio()
let media: MediaQueryList | undefined
let frame = 0
let nextId = 0
function land(ball: Ball) {
  last.value = ball.slot; emit('land', ball.slot, ball.value)
  announcement.value = `Ball ${ball.id} landed in slot ${ball.slot + 1}: ${ball.value}`
  if (sound.value) audio.tone(360 + ball.slot * 12)
}
function draw(now: number) {
  const next: Ball[] = []
  pegHit.value = null
  for (const ball of balls.value) {
    const time = (now - ball.started) / 1000
    if (time >= ball.duration || reduced.value) { land(ball); continue }
    const hopTime = Math.max(0, time - .22)
    const row = Math.floor(hopTime / .25)
    const hop = hopTime - row * .25
    const index = time < .22 ? 0 : 1 + row * 2 + (hop >= .09 ? 1 : 0)
    const fraction = time < .22 ? time / .22 : hop < .09 ? hop / .09 : (hop - .09) / .16
    const from = ball.points[index], to = ball.points[index + 1]
    if (!from || !to) { land(ball); continue }
    const ease = index % 2 === 1 ? 1 - (1 - fraction) ** 2 : fraction ** 2
    ball.position = { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * ease }
    if (index && ball.peg !== row) {
      ball.peg = row
      if (flash.value) pegHit.value = ball.points[1 + row * 2]
      if (sound.value) audio.tone(620 - row * 8, .045)
    }
    next.push(ball)
  }
  balls.value = next
  frame = next.length ? requestAnimationFrame(draw) : 0
}
function drop() {
  if (rows.value < 1 || balls.value.length >= props.maxBalls) return
  if (sound.value) audio.unlock()
  let slot = 0
  const center = width.value / 2
  const points: Point[] = [{ x: center, y: 7 }]
  for (let row = 0; row < rows.value; row++) {
    const x = center + (slot - row / 2) * 32, y = 48 + row * 30 - 10.5
    const right = props.random() < .5
    points.push({ x, y }, { x: x + (right ? 8 : -8), y: y - 7 })
    if (right) slot++
  }
  points.push({ x: center + (slot - rows.value / 2) * 32, y: 48 + rows.value * 30 - 4 })
  const ball = { id: ++nextId, points, position: points[0], started: performance.now(), duration: .22 + rows.value * .25, slot, value: slots.value[slot], peg: -1 }
  if (reduced.value) { land(ball); return }
  balls.value = [...balls.value, ball]
  if (!frame) frame = requestAnimationFrame(draw)
}
function reset() { cancelAnimationFrame(frame); frame = 0; balls.value = []; pegHit.value = null; last.value = -1 }
function sync() { reduced.value = media?.matches ?? false }
function toggleFlash() { const next = !flash.value; localFlash.value = next; emit('update:pegFlash', next); emit('pegFlashChange', next) }
function toggleSound() { const next = !sound.value; if (next) audio.unlock(); localSound.value = next; emit('update:sound', next); emit('soundChange', next) }
onMounted(() => { media = window.matchMedia('(prefers-reduced-motion: reduce)'); sync(); media.addEventListener('change', sync) })
watch(rows, reset)
onBeforeUnmount(() => { reset(); media?.removeEventListener('change', sync) })
</script>

<template>
  <section v-if="rows >= 1" class="game" data-slot="plinko" :aria-label="labels?.board ?? 'Plinko board'">
    <header class="game-head"><strong>Plinko</strong><div><button v-if="!reduced" type="button" class="toggle" :aria-label="pegFlashLabel ?? labels?.pegFlash ?? 'Peg flash'" :aria-pressed="flash" @click="toggleFlash">ϟ</button> <button type="button" class="toggle" :aria-label="soundLabel ?? labels?.sound ?? 'Sound'" :aria-pressed="sound" @click="toggleSound">♪</button></div></header>
    <svg class="board" :viewBox="`0 0 ${width} ${height}`" aria-hidden="true"><circle v-for="peg in pegs" :key="peg.id" :cx="peg.x" :cy="peg.y" r="3.5" fill="currentColor" opacity=".5" />
      <circle v-if="pegHit" :cx="pegHit.x" :cy="pegHit.y + 10.5" r="5" fill="#a78bfa" />
      <g v-for="(value, slot) in slots" :key="slot" :transform="`translate(${16 + slot * 32} ${height - 30})`"><rect width="30" height="26" rx="5" :fill="`hsl(${258 + 65 * Math.abs(slot - rows / 2) / (rows / 2)} 65% ${last === slot ? 52 : 42}%)`" /><text x="15" y="17" text-anchor="middle" fill="white" font-size="10">{{ value }}</text></g>
      <circle v-for="ball in balls" :key="ball.id" :cx="ball.position.x" :cy="ball.position.y" r="7" fill="#c594ff" stroke="#8b5cf6" />
    </svg><div class="game-controls"><span>{{ last < 0 ? '' : String(slots[last]) }}</span><button type="button" class="primary" :disabled="balls.length >= maxBalls" @click="drop">{{ dropLabel ?? labels?.drop ?? 'Drop ball' }}</button></div>
    <p role="status" class="sr-game">{{ announcement }}</p>
  </section>
</template>

<style src="./game.css"></style>
<style scoped>.board { display: block; width: 100%; max-height: 24rem; }</style>
