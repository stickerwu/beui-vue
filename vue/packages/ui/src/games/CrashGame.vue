<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useCrashRound, type CrashProps } from './crash-round'
import { gameTargets, formatMultiplier, floor2 } from './game-math'
import { useGameAudio } from './use-game-audio'
import CrashScene from './CrashScene.vue'

const props = withDefaults(defineProps<CrashProps & { design: 'flight' | 'balloon' | 'tower' }>(), { sound: undefined })
const emit = defineEmits<{
  start: [round: number]; cashOut: [value: number]; crash: [point: number, payout: number | null]
  'update:autoCashOut': [value: number | null]; autoCashOutChange: [value: number | null]; 'update:sound': [value: boolean]; soundChange: [value: boolean]
}>()
const localSound = shallowRef(props.defaultSound ?? false)
const sound = computed(() => props.sound ?? localSound.value)
const audio = useGameAudio()
const { phase, value, cashed, auto, target, history, announcement, canSkip, start, cashOut, skip } = useCrashRound(props, {
  start: round => emit('start', round), cash: paid => emit('cashOut', paid), crash: (point, payout) => emit('crash', point, payout),
  chime: frequency => { if (sound.value) audio.tone(frequency) },
})
const name = computed(() => props.labels?.label ?? ({ flight: 'Crash', balloon: 'Crash Balloon', tower: 'Crash Tower' })[props.design])
const busy = computed(() => phase.value === 'running' || phase.value === 'starting')
function toggleSound() {
  const next = !sound.value
  if (next) audio.unlock()
  if (props.sound === undefined) localSound.value = next
  emit('update:sound', next); emit('soundChange', next)
}
function choose(event: Event) {
  const raw = (event.currentTarget as HTMLSelectElement).value
  const next = raw ? Number(raw) : null
  if (props.autoCashOut === undefined) auto.value = next
  emit('update:autoCashOut', next); emit('autoCashOutChange', next)
}
function act() {
  if (sound.value) audio.unlock()
  if (phase.value !== 'running') void start()
  else if (cashed.value !== null) skip()
  else cashOut()
}
</script>

<template>
  <section class="game crash-game" :data-slot="design === 'flight' ? 'crash' : `crash-${design}`" :data-phase="phase" :aria-label="name">
    <header class="game-head"><strong>{{ name }}</strong><button type="button" class="toggle" :aria-pressed="sound" :aria-label="labels?.sound ?? 'Sound'" @click="toggleSound">{{ sound ? '♪' : '♩' }}</button></header>
    <div class="stage"><CrashScene :design="design" :value="value" :crashed="phase === 'crashed'" :running="phase === 'running'" /><div class="reading"><small>{{ phase === 'crashed' ? labels?.crashed ?? 'Crashed' : cashed !== null ? labels?.cashedOut ?? 'Cashed out' : labels?.multiplier ?? 'Multiplier' }}</small><strong>{{ formatMultiplier(floor2(value)) }}</strong></div></div>
    <div class="game-controls"><label>{{ labels?.autoCashOut ?? 'Auto cash out' }} <select :value="target ?? ''" :disabled="busy" @change="choose"><option value="">Off</option><option v-for="amount in gameTargets" :key="amount" :value="amount">{{ amount }}×</option></select></label>
      <button type="button" class="primary" :disabled="phase === 'starting' || (phase === 'running' && cashed !== null && !canSkip)" @click="act">{{ phase === 'starting' ? 'Starting…' : phase === 'running' ? cashed === null ? labels?.cashOut ?? 'Cash out' : labels?.skip ?? 'Skip' : labels?.start ?? 'Start' }}</button>
    </div><div v-if="history.length" class="history" aria-label="Recent rounds"><span v-for="round in history" :key="round.id">{{ formatMultiplier(round.point) }}</span></div><p class="sr-game" role="status">{{ announcement }}</p>
  </section>
</template>

<style src="./game.css"></style>
<style scoped>
.stage { position: relative; overflow: hidden; border-radius: 10px; background: linear-gradient(170deg,#8971d013,#b6a8ff0a); }
.reading { position: absolute; left: 12px; top: 10px; display: flex; flex-direction: column; }.reading small { font-size: 11px; opacity: .72; }.reading strong { font: 650 30px/1.2 system-ui; font-variant-numeric: tabular-nums; }
</style>
