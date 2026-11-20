<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { floor2, formatMultiplier, gameTargets, slideResult } from './game-math'
import { useGameAudio } from './use-game-audio'

interface Round { id: number; result: number; target: number; bet: number }
const props = withDefaults(defineProps<{
  target?: number; defaultTarget?: number; targets?: readonly number[]; bet?: number; defaultBet?: number
  currency?: string; formatAmount?: (value: number) => string; getResult?: () => number | Promise<number>
  duration?: number; sound?: boolean; defaultSound?: boolean; labels?: Partial<Record<string, string>>
}>(), { defaultTarget: 2, targets: () => gameTargets, defaultBet: 1, currency: '$', duration: 4, sound: undefined })
const emit = defineEmits<{
  result: [value: number, target: number, bet: number]; 'update:target': [value: number]; targetChange: [value: number]
  'update:bet': [value: number]; betChange: [value: number]; 'update:sound': [value: boolean]; soundChange: [value: boolean]
}>()
const amountFormat = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const localBet = shallowRef(props.defaultBet), localTarget = shallowRef(props.defaultTarget)
const localSound = shallowRef(props.defaultSound ?? false)
const bet = computed(() => props.bet ?? localBet.value)
const target = computed(() => {
  const value = props.target ?? localTarget.value
  return Number.isFinite(value) ? Math.max(1.01, value) : 1.01
})
const options = computed(() => [...new Set([...props.targets.filter(value => Number.isFinite(value) && value >= 1.01), target.value])].sort((left, right) => left - right))
const sound = computed(() => props.sound ?? localSound.value)
const audio = useGameAudio()
const phase = shallowRef<'idle' | 'starting' | 'sliding' | 'settled'>('idle')
const busy = computed(() => phase.value === 'starting' || phase.value === 'sliding')
const history = shallowRef<Round[]>([]), announcement = shallowRef('')
const filler = [3.8, 1.71, 2.43, 1.29, 6.45, 1.49, 1.05, 3.62, 1.91, 2.27, 13.4]
const cards = shallowRef<number[]>(filler)
const position = shallowRef(3)
let frame = 0, serial = 0
function amount(value: number) { return props.formatAmount?.(value) ?? `${props.currency}${amountFormat.format(value)}` }
function changeBet(value: number) {
  const next = Number.isFinite(value) && value > 0 ? value : 0
  localBet.value = next
  emit('update:bet', next); emit('betChange', next)
}
function changeTarget(event: Event) {
  const next = Number((event.currentTarget as HTMLSelectElement).value)
  localTarget.value = next
  emit('update:target', next); emit('targetChange', next)
}
function toggleSound() {
  const next = !sound.value
  if (next) audio.unlock()
  localSound.value = next
  emit('update:sound', next); emit('soundChange', next)
}
function settle(round: Round) {
  phase.value = 'settled'
  const won = round.result >= round.target
  announcement.value = `Landed on ${formatMultiplier(round.result)}. ${won ? 'Won' : 'Missed'} target ${formatMultiplier(round.target)}.`
  history.value = [round, ...history.value].slice(0, 12)
  if (won && sound.value) audio.tone(740)
  emit('result', round.result, round.target, round.bet)
}
async function start() {
  if (busy.value || !(bet.value > 0)) return
  if (sound.value) audio.unlock()
  const id = ++serial, previous = phase.value, roundBet = bet.value, roundTarget = target.value
  phase.value = 'starting'
  let result: number
  try { result = await (props.getResult ?? slideResult)() }
  catch {
    if (id === serial) { phase.value = previous; announcement.value = 'Could not start round.' }
    return
  }
  if (id !== serial) return
  result = Number.isFinite(result) ? Math.max(1, floor2(result)) : 1
  const round = { id, result, target: roundTarget, bet: roundBet }
  const destination = 27
  cards.value = Array.from({ length: destination + 5 }, (_, index) => index === destination ? result : filler[(index * 7 + id) % filler.length])
  phase.value = 'sliding'
  announcement.value = `Sliding. Target ${formatMultiplier(roundTarget)}.`
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.max(0, props.duration * 1000)
  const began = performance.now()
  position.value = 3
  function step(now: number) {
    const fraction = duration ? Math.min(1, (now - began) / duration) : 1
    const next = 3 + (destination - 3) * (1 - (1 - fraction) ** 3)
    if (sound.value && Math.round(position.value) !== Math.round(next)) audio.tone(530, .04)
    position.value = next
    if (fraction < 1) frame = requestAnimationFrame(step)
    else settle(round)
  }
  frame = requestAnimationFrame(step)
}
onBeforeUnmount(() => { serial++; cancelAnimationFrame(frame) })
</script>

<template>
  <section class="game slide-game" data-slot="slide-game" :data-phase="phase" :aria-label="labels?.label ?? 'Slide game'">
    <header class="game-head"><strong>{{ labels?.label ?? 'Slide game' }}</strong><button type="button" class="toggle" :aria-pressed="sound" :aria-label="labels?.sound ?? 'Sound'" @click="toggleSound">♪</button></header>
    <div class="reel" aria-hidden="true">
      <div class="track" :style="{ transform: `translateX(${-position * 64 - 28}px)` }">
        <div v-for="(card, index) in cards" :key="index" class="card" :data-win="card >= target" :data-selected="Math.round(position) === index">
          {{ formatMultiplier(card) }}<span v-if="card >= target" />
        </div>
      </div>
    </div>
    <div class="game-controls">
      <label>{{ labels?.betAmount ?? 'Bet amount' }} <input type="number" step="any" min="0" :value="bet" :disabled="busy" @input="changeBet(($event.currentTarget as HTMLInputElement).valueAsNumber)"></label>
      <div><button class="toggle" type="button" :disabled="busy" :aria-label="labels?.halveBet ?? 'Halve bet'" @click="changeBet(floor2(bet / 2))">½</button>
        <button class="toggle" type="button" :disabled="busy" :aria-label="labels?.doubleBet ?? 'Double bet'" @click="changeBet(Math.min(1e9, floor2(bet * 2)))">2×</button></div>
      <label>{{ labels?.target ?? 'Target' }} <select :value="target" :disabled="busy" @change="changeTarget"><option v-for="value in options" :key="value" :value="value">{{ value }}×</option></select></label>
    </div>
    <dl><div><dt>{{ labels?.winChance ?? 'Win chance' }}</dt><dd>{{ (99 / target).toFixed(2) }}%</dd></div><div><dt>{{ labels?.profitOnWin ?? 'Profit on win' }}</dt><dd>{{ amount(bet * (target - 1)) }}</dd></div></dl>
    <div class="game-controls"><button type="button" class="primary" :disabled="busy || !(bet > 0)" @click="start">{{ busy ? 'Sliding…' : labels?.slide ?? 'Slide' }}</button>
      <span v-if="history.length && !busy">{{ history[0].result >= history[0].target ? 'Won' : 'Missed' }} · {{ formatMultiplier(history[0].result) }}</span>
    </div>
    <div v-if="history.length" class="history" aria-label="Recent rounds"><span v-for="round in history" :key="round.id">{{ formatMultiplier(round.result) }}</span></div>
    <p class="sr-game" role="status">{{ announcement }}</p>
  </section>
</template>

<style src="./game.css"></style>
<style scoped>
.reel { position: relative; height: 118px; overflow: hidden; border-radius: 10px; background: #85858a12; }
.reel::before,.reel::after { position: absolute; z-index: 1; left: calc(50% - 7px); content: ''; border-inline: 7px solid transparent; }
.reel::before { top: 0; border-top: 10px solid currentColor; }.reel::after { bottom: 0; border-bottom: 10px solid currentColor; }
.track { position: absolute; top: 18px; left: 50%; display: flex; gap: 8px; }
.card { box-sizing: border-box; width: 56px; height: 82px; display: grid; place-items: center; position: relative; border: 1px solid #8885; border-radius: 10px; font-size: 13px; font-weight: 650; font-variant-numeric: tabular-nums; background: Canvas; color: CanvasText; }
.card[data-win='true'] { background: #7650b4; color: white; }.card[data-selected='true'] { outline: 2px solid currentColor; outline-offset: -4px; }.card span { position: absolute; bottom: 10px; width: 14px; height: 3px; border-radius: 2px; background: currentColor; opacity: .68; }
.game-controls input { width: 4rem; }.game-controls .toggle + .toggle { margin-left: 3px; }
dl,dl div { display: flex; } dl { margin: 12px 0 0; gap: 16px; flex-wrap: wrap; } dl div { gap: 4px; font-size: 12px; } dt { opacity: .7; } dd { margin: 0; font-variant-numeric: tabular-nums; }
</style>
