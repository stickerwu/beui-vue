<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { formatMultiplier, minesMultiplier } from './game-math'
import { useGameAudio } from './use-game-audio'

const props = withDefaults(defineProps<{
  size?: number; mines?: number; defaultMines?: number; sound?: boolean; defaultSound?: boolean
  showResult?: boolean; labels?: Partial<Record<string, string>>; random?: () => number
}>(), { size: 5, defaultMines: 3, showResult: true, random: Math.random, sound: undefined })
const emit = defineEmits<{
  'update:mines': [count: number]; minesChange: [count: number]; reveal: [tile: number, kind: 'mine' | 'gem', multiplier: number]
  cashOut: [multiplier: number, gems: number]; 'update:sound': [value: boolean]; soundChange: [value: boolean]
}>()
const phase = shallowRef<'idle' | 'playing' | 'busted' | 'cashed'>('idle')
const size = computed(() => Math.max(2, Math.round(props.size) || 2))
const tiles = computed(() => size.value ** 2)
const chosen = shallowRef(props.defaultMines)
const count = computed(() => Math.min(tiles.value - 1, Math.max(1, Math.round(props.mines ?? chosen.value))))
const roundMines = shallowRef(count.value)
const localSound = shallowRef(props.defaultSound ?? false)
const sound = computed(() => props.sound ?? localSound.value)
const mines = shallowRef(new Set<number>())
const picked = shallowRef<number[]>([])
const cursor = shallowRef(0)
const finished = computed(() => phase.value === 'busted' || phase.value === 'cashed')
const gems = computed(() => picked.value.filter(index => !mines.value.has(index)).length)
const multiplier = computed(() => minesMultiplier(tiles.value, roundMines.value, gems.value))
const odds = computed(() => {
  const mineCount = phase.value === 'idle' ? count.value : roundMines.value
  return (tiles.value - mineCount - gems.value) / Math.max(1, tiles.value - gems.value) * 100
})
const audio = useGameAudio()
watch(size, () => { phase.value = 'idle'; picked.value = []; mines.value = new Set(); cursor.value = 0 })
function start() {
  if (sound.value) audio.unlock()
  const shuffled = Array.from({ length: tiles.value }, (_, index) => index)
  roundMines.value = count.value
  for (let index = 0; index < roundMines.value; index++) {
    const pick = index + Math.min(tiles.value - index - 1, Math.floor(Math.max(0, props.random()) * (tiles.value - index)))
    ;[shuffled[index], shuffled[pick]] = [shuffled[pick], shuffled[index]]
  }
  mines.value = new Set(shuffled.slice(0, roundMines.value))
  picked.value = []; phase.value = 'playing'; cursor.value = 0
}
function cashOut() {
  if (phase.value !== 'playing' || !gems.value) return
  phase.value = 'cashed'; emit('cashOut', multiplier.value, gems.value)
  if (sound.value) audio.tone(740)
}
function reveal(index: number) {
  if (phase.value !== 'playing' || picked.value.includes(index)) return
  picked.value = [...picked.value, index]
  if (mines.value.has(index)) {
    phase.value = 'busted'; emit('reveal', index, 'mine', 0)
    if (sound.value) audio.tone(110, .22, 'triangle')
  } else {
    emit('reveal', index, 'gem', multiplier.value)
    if (sound.value) audio.tone(440 + gems.value * 22)
    if (gems.value === tiles.value - roundMines.value) cashOut()
  }
}
function changeCount(event: Event) {
  const value = Math.max(1, Math.min(tiles.value - 1, Math.round((event.currentTarget as HTMLInputElement).valueAsNumber) || 1))
  if (props.mines === undefined) chosen.value = value
  emit('update:mines', value); emit('minesChange', value)
}
function toggleSound() {
  const next = !sound.value
  if (next) audio.unlock()
  localSound.value = next; emit('update:sound', next); emit('soundChange', next)
}
function state(index: number) {
  if (!finished.value && !picked.value.includes(index)) return 'hidden'
  return mines.value.has(index) ? 'mine' : 'gem'
}
function move(event: KeyboardEvent, index: number) {
  const shifts: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: -size.value, ArrowDown: size.value }
  if (!(event.key in shifts)) return
  event.preventDefault()
  const next = Math.max(0, Math.min(tiles.value - 1, index + shifts[event.key]))
  ;(event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLButtonElement>(`[data-tile="${next}"]`)?.focus()
}
</script>

<template>
  <section class="game" data-slot="mines" :data-phase="phase" :aria-label="labels?.label ?? 'Mines'">
    <header class="game-head"><strong>{{ labels?.label ?? 'Mines' }}</strong><button type="button" class="toggle" :aria-pressed="sound" aria-label="Sound" @click="toggleSound">♪</button></header>
    <div class="mine-head"><strong>{{ formatMultiplier(phase === 'busted' ? 0 : multiplier) }}</strong><span>{{ odds.toFixed(1) }}% safe</span></div>
    <div class="tiles" role="group" :aria-label="labels?.tiles ?? 'Tiles'" :style="{ gridTemplateColumns: `repeat(${size}, 1fr)` }">
      <button v-for="tile in tiles" :key="tile" type="button" :data-tile="tile - 1" :data-state="state(tile - 1)" :data-picked="picked.includes(tile - 1)"
        :disabled="phase === 'idle'" :aria-disabled="phase !== 'playing' || picked.includes(tile - 1)" :tabindex="cursor === tile - 1 ? 0 : -1"
        :aria-label="`Row ${Math.floor((tile - 1) / size) + 1}, column ${(tile - 1) % size + 1}, ${state(tile - 1)}`"
        @focus="cursor = tile - 1" @keydown="move($event, tile - 1)" @click="reveal(tile - 1)">
        <svg v-if="state(tile - 1) === 'gem'" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 8L7 3h10l5 5-10 14z" fill="#54c9a2" /><path d="M2 8h20M8 8l4 14 4-14L12 3z" fill="none" stroke="#167d63" /></svg>
        <svg v-else-if="state(tile - 1) === 'mine'" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1v22M1 12h22M4 4l16 16M20 4L4 20" stroke="#e34e6c" stroke-width="2" /><circle cx="12" cy="12" r="7" fill="#d63c60" /><circle cx="10" cy="9" r="2" fill="#ffa5b7" /></svg>
      </button>
    </div>
    <div class="game-controls"><label>{{ labels?.mineCount ?? 'Mine count' }} <input type="number" min="1" :max="tiles - 1" :value="count" :disabled="phase === 'playing'" @change="changeCount"></label>
      <button v-if="phase === 'playing'" type="button" class="primary" :disabled="gems === 0" @click="cashOut">{{ labels?.cashOut ?? 'Cash out' }}</button>
      <button v-else type="button" class="primary" @click="start">{{ finished ? 'Play again' : 'Start' }}</button></div>
    <div v-if="showResult && finished" class="ticket" role="status"><strong>{{ phase === 'busted' ? 'Mine hit' : 'Cashed out' }}</strong> · {{ gems }} gems · {{ formatMultiplier(phase === 'busted' ? 0 : multiplier) }}</div>
  </section>
</template>

<style src="./game.css"></style>
<style scoped>
.mine-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }.mine-head strong { font-size: 19px; }
.tiles { display: grid; gap: 5px; }.tiles button { display: grid; place-items: center; aspect-ratio: 1; padding: 0; border: 1px solid #8882; border-radius: 8px; background: #8882; }.tiles button[data-state='gem'] { background: #05966916; }.tiles button[data-state='mine'] { background: #e11d4818; }.tiles button[data-picked='false'] svg { opacity: .42; }.tiles svg { width: 55%; }
.game-controls input { width: 4rem; }.ticket { margin-top: 10px; padding: 8px 12px; background: #8881; border: 1px dashed #8886; border-radius: 8px; font-size: 12px; }
@media (prefers-reduced-motion:no-preference) { .tiles svg { animation: appear .2s ease-out both; } } @keyframes appear { from { transform: scale(.6); opacity: 0; } }
</style>
