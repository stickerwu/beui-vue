<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const slideGameMessages = {
  label: 'Slide',
  betAmount: 'Bet amount',
  halveBet: 'Halve bet',
  doubleBet: 'Double bet',
  target: 'Target',
  winChance: 'Win chance',
  profitOnWin: 'Profit on win',
  slide: 'Slide',
  starting: 'Starting…',
  sliding: 'Sliding…',
  enterBet: 'Enter a bet',
  slideAgain: 'Slide again',
  recentSlides: 'Recent slides',
  recentEmpty: 'Recent rounds show here',
  sound: 'Sound',
  stateStarting: 'Starting',
  stateSliding: 'Sliding · needs {target}',
  stateWon: 'Won · beat {target}',
  stateMissed: 'Missed · needed {target}',
  stateIdle: '{chance} chance of {target} · marked cards win',
  announceSliding: 'Sliding. Target {target}.',
  announceFailed: "Couldn't start the round. Try again.",
  announceWin: 'Landed on {result}. Win, target {target}.',
  announceLoss: 'Landed on {result}. Loss, target {target}.',
}
export type SlideGameMessages = typeof slideGameMessages

// Round numbers, unique on the page.
let rounds = 0
</script>

<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, watch } from 'vue'
import ButtonBase from '../ButtonBase.vue'
import Select from '../controls/choice/Select.vue'
import GameEyebrow from './GameEyebrow.vue'
import GameHistory from './GameHistory.vue'
import GameIcon from './GameIcon.vue'
import SlideReel from './SlideReel.vue'
import SoundToggle from './SoundToggle.vue'
import { createTickPlayer, type TickPlayer } from '../core/tick-sound'
import { useReducedMotion } from '../core/reduced-motion'
import { createGameSounds, type GameSounds } from './game-sounds'
import { gameTargets, slideResult } from './game-math'
import { floor2, formatMultiplier, formatShort, PRESS_GUARD, type GameHistoryEntry } from './game-parts'
import { face, type Round } from './slide-reel'
import './game-parts.css'

const props = withDefaults(defineProps<{
  /** Target multiplier (controlled). A result at or above it wins. Applies from the next round. Values below 1.01x play as 1.01x. */
  target?: number
  /** Initial target when uncontrolled. Default 2. */
  defaultTarget?: number
  /** Targets offered in the menu. Values below 1.01x are left out. */
  targets?: readonly number[]
  /** Bet amount (controlled), used for the profit readout and passed to `result`. */
  bet?: number
  /** Initial bet when uncontrolled. Default 1. */
  defaultBet?: number
  /** Currency symbol shown before the bet and the profit. Default "$". */
  currency?: string
  /** Formats the profit. Default the currency symbol and two decimals ($1.50). */
  formatAmount?: (amount: number) => string
  /**
   * Decides each round's result, called once when the round starts. Return a number, or a Promise
   * for one (a server round): the button shows Starting… until it settles, and a rejection cancels
   * the round. Values below 1 or not finite play as 1. Default `slideResult()`.
   */
  getResult?: () => number | Promise<number>
  /** Slide length in seconds. Default 4. */
  duration?: number
  /** Play synthesized sounds (controlled): a tick per card into the center and a chime on a win. */
  sound?: boolean
  /** Initial sound state when uncontrolled. Default false. */
  defaultSound?: boolean
  /** Overrides for the built-in text, e.g. for another language. */
  labels?: Partial<SlideGameMessages>
}>(), { defaultTarget: 2, targets: () => gameTargets, defaultBet: 1, currency: '$', duration: 4, sound: undefined, defaultSound: false })
const emit = defineEmits<{
  /** Called when the reel stops, with the result, the round's target and its bet. The round wins when result >= target. */
  result: [value: number, target: number, bet: number]
  'update:target': [value: number]; targetChange: [value: number]
  'update:bet': [value: number]; betChange: [value: number]
  'update:sound': [value: boolean]; soundChange: [value: boolean]
}>()

// Results never land below 1x, so a lower target would always win and pay nothing.
const MIN_TARGET = 1.01
// The ½ and 2× buttons stop here, so the field never fills with exponent notation.
const MAX_BET = 1_000_000_000
const HISTORY = 12
type Phase = 'idle' | 'starting' | 'sliding' | 'settled'

// Grouped, two decimals, never exponent notation: $1,234,567.50.
const AMOUNT = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const settleValue = (value: number) => (Number.isFinite(value) ? Math.max(1, floor2(value)) : 1)
const parseBet = (text: string) => {
  const value = Number.parseFloat(text)
  return Number.isFinite(value) && value > 0 ? value : 0
}

const t = (key: keyof SlideGameMessages, vars: Record<string, string> = {}) =>
  (props.labels?.[key] ?? slideGameMessages[key]).replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? `{${name}}`)

const reducedMotion = useReducedMotion()
const reduce = computed(() => reducedMotion.value ?? false)
const betId = useId()
const internalTarget = shallowRef(props.defaultTarget)
const target = computed(() => {
  const raw = props.target ?? internalTarget.value
  return Number.isFinite(raw) ? Math.max(MIN_TARGET, raw) : MIN_TARGET
})
// The field keeps what the player typed ("1." mid-edit); a controlled bet that disagrees with it replaces it.
const draft = shallowRef(String(props.bet ?? props.defaultBet))
watch(() => props.bet, (value) => {
  // The string check stops the loop for a bet the field can't hold (-1, NaN).
  if (value !== undefined && value !== parseBet(draft.value) && String(value) !== draft.value) draft.value = String(value)
})
const bet = computed(() => props.bet ?? parseBet(draft.value))
const internalSound = shallowRef(props.defaultSound)
const soundOn = computed(() => props.sound ?? internalSound.value)
const phase = shallowRef<Phase>('idle')
const round = shallowRef<Round | null>(null)
const history = shallowRef<GameHistoryEntry[]>([])
const announcement = shallowRef('')
let pending = 0
let endedAt = Number.NEGATIVE_INFINITY
let lastTick = 0
let tick: TickPlayer | undefined
let game: GameSounds | undefined

onMounted(() => { tick = createTickPlayer(); game = createGameSounds() })
onBeforeUnmount(() => { tick?.dispose(); game?.dispose(); tick = game = undefined; pending = 0 })

const busy = computed(() => phase.value === 'starting' || phase.value === 'sliding')
// An empty or zero bet can't start a round.
const noBet = computed(() => bet.value <= 0)
const blocked = computed(() => busy.value || noBet.value)
const options = computed(() => {
  const valid = props.targets.filter(step => step >= MIN_TARGET)
  const list = valid.includes(target.value) ? [...valid] : [...valid, target.value].sort((a, b) => a - b)
  return list.map(step => ({ value: String(step), label: formatShort(step) }))
})
const settled = computed(() => phase.value === 'settled' && round.value !== null)
const won = computed(() => (settled.value && round.value ? round.value.result >= round.value.target : undefined))

function prepareSounds() { tick?.prepare(); game?.prepare() }

function play() {
  if (blocked.value || performance.now() - endedAt < PRESS_GUARD) return
  // Audio unlocks inside the click.
  if (soundOn.value) prepareSounds()
  const id = ++rounds
  const roundTarget = target.value
  const roundBet = bet.value
  const before = phase.value
  pending = id
  phase.value = 'starting'
  announcement.value = ''
  Promise.resolve()
    .then(() => (props.getResult ?? (() => slideResult()))())
    .then(
      (value) => {
        if (pending !== id) return
        round.value = { id, result: settleValue(value), target: roundTarget, bet: roundBet }
        phase.value = 'sliding'
        announcement.value = t('announceSliding', { target: formatShort(roundTarget) })
      },
      () => {
        if (pending !== id) return
        phase.value = before
        announcement.value = t('announceFailed')
      },
    )
}

function settle(ended: Round) {
  const win = ended.result >= ended.target
  endedAt = performance.now()
  phase.value = 'settled'
  history.value = [{ id: ended.id, value: ended.result }, ...history.value].slice(0, HISTORY)
  announcement.value = t(win ? 'announceWin' : 'announceLoss', { result: formatMultiplier(ended.result), target: formatShort(ended.target) })
  if (win && soundOn.value) game?.cashOut()
  emit('result', ended.result, ended.target, ended.bet)
}

// A tick per card reaching the center, at most one per 40ms: the opening rush reads as a whirr and
// the last few cards click one by one.
function cross() {
  if (!soundOn.value) return
  const now = performance.now()
  if (now - lastTick < 40) return
  lastTick = now
  tick?.play()
}

function changeBet(text: string) {
  draft.value = text
  const next = parseBet(text)
  emit('update:bet', next); emit('betChange', next)
}
function scaleBet(factor: number) {
  const next = Math.min(MAX_BET, Math.max(0.01, Math.round(bet.value * factor * 100) / 100))
  draft.value = next.toFixed(2)
  emit('update:bet', next); emit('betChange', next)
}
function changeTarget(value: string | string[] | undefined) {
  const next = Number(value)
  if (!Number.isFinite(next)) return
  if (props.target === undefined) internalTarget.value = next
  emit('update:target', next); emit('targetChange', next)
}
function toggleSound() {
  const next = !soundOn.value
  if (next) prepareSounds()
  if (props.sound === undefined) internalSound.value = next
  emit('update:sound', next); emit('soundChange', next)
}
function keydown(event: KeyboardEvent) {
  // A held Enter repeats clicks; it would start rounds on its own.
  if (event.repeat && event.key === 'Enter') event.preventDefault()
}

const roundTarget = computed(() => formatShort(round.value?.target ?? target.value))
// Matches slideResult's default 1% edge.
const chance = computed(() => { const odds = 99 / target.value; return odds < 0.01 ? '<0.01%' : `${odds.toFixed(2)}%` })
const profit = computed(() => bet.value * (target.value - 1))
const profitText = computed(() => props.formatAmount ? props.formatAmount(profit.value) : `${props.currency}${AMOUNT.format(profit.value)}`)
const buttonText = computed(() => t(phase.value === 'starting' ? 'starting' : phase.value === 'sliding' ? 'sliding' : noBet.value ? 'enterBet' : settled.value ? 'slideAgain' : 'slide'))
const eyebrow = computed(() => phase.value === 'starting' ? t('stateStarting')
  : phase.value === 'sliding' ? t('stateSliding', { target: roundTarget.value })
  : won.value === true ? t('stateWon', { target: roundTarget.value })
  : won.value === false ? t('stateMissed', { target: roundTarget.value })
  : t('stateIdle', { chance: chance.value, target: formatShort(target.value) }))
const eyebrowState = computed(() => busy.value ? 'live' : won.value === true ? 'won' : won.value === false ? 'lost' : 'idle')
</script>

<template>
  <section class="slide-game" data-slot="slide-game" :data-phase="phase" :aria-label="t('label')">
    <!-- 24px card corners = 12px panel and stage corners + 12px padding. Under 36rem the stage stacks over the controls; at 36rem it keeps ~350px beside them. -->
    <div class="slide-card-frame">
      <div class="slide-panel">
        <div class="slide-fields">
          <div class="slide-field">
            <label :for="betId" class="slide-label">{{ t('betAmount') }}</label>
            <div class="slide-bet" :data-invalid="noBet || undefined">
              <span v-if="currency" class="slide-currency" aria-hidden="true">{{ currency }}</span>
              <input :id="betId" class="slide-bet-input" :aria-invalid="noBet || undefined" inputmode="decimal" autocomplete="off" :value="draft" :disabled="busy"
                @input="changeBet(($event.target as HTMLInputElement).value)">
              <ButtonBase class="slide-scale" variant="ghost" size="sm" :press-scale="0.96" :disabled="busy" :aria-label="t('halveBet')" @click="scaleBet(0.5)">½</ButtonBase>
              <ButtonBase class="slide-scale" variant="ghost" size="sm" :press-scale="0.96" :disabled="busy" :aria-label="t('doubleBet')" @click="scaleBet(2)">2×</ButtonBase>
            </div>
          </div>
          <div class="slide-field">
            <span class="slide-label" aria-hidden="true">{{ t('target') }}</span>
            <Select class="slide-target" :model-value="String(target)" :options="options" :label="t('target')" :disabled="busy" @update:model-value="changeTarget" />
          </div>
        </div>

        <dl class="slide-stats">
          <div><dt>{{ t('winChance') }}</dt><dd>{{ chance }}</dd></div>
          <div><dt>{{ t('profitOnWin') }}</dt><dd>{{ profitText }}</dd></div>
        </dl>

        <!-- aria-disabled, not disabled: the button keeps keyboard focus through the round. -->
        <motion.button type="button" class="slide-play" :data-busy="busy || undefined" :aria-disabled="blocked || undefined" :aria-busy="busy || undefined"
          :while-press="!blocked && !reduce ? { scale: 0.96 } : undefined" :while-hover="!blocked && !reduce ? { scale: 1.02 } : undefined" :transition="{ type: 'spring', stiffness: 500, damping: 30, mass: 0.6 }" @click="play" @keydown="keydown">{{ buttonText }}</motion.button>
      </div>

      <div class="slide-stage">
        <div class="slide-top">
          <GameIcon name="History" :size="14" :stroke-width="1.75" class="slide-history-icon" />
          <GameHistory class="slide-history" :history="history" :reduce="reduce" :tier="face" :label="t('recentSlides')" :empty-label="t('recentEmpty')" />
          <SoundToggle :on="soundOn" :label="t('sound')" @toggle="toggleSound" />
        </div>
        <!-- The stage is the reel alone, so the edge tabs can hang from its edges. Pips mark the sliding round's target, and the next one otherwise. -->
        <SlideReel :round="round" :goal="phase === 'sliding' && round ? round.target : target" :duration="duration" :reduce="reduce" :busy="busy" :settled="settled" :won="won" @cross="cross" @settle="settle" />
        <div class="slide-bottom"><GameEyebrow :label="eyebrow" :state="eyebrowState" :reduce="reduce" /></div>
      </div>
    </div>
    <p class="slide-sr" role="status">{{ announcement }}</p>
  </section>
</template>

<style scoped>
.slide-game { container-type: inline-size; width: 100%; max-width: 48rem; font-family: inherit; color: var(--beui-foreground); --slide-border-strong: oklch(15% 0 0 / .12); }
:global(:is(.dark, [data-beui-theme='dark']) .slide-game) { --slide-border-strong: rgb(255 255 255 / .1); }
.slide-card-frame { display: flex; flex-direction: column-reverse; gap: 12px; padding: 12px; border: 1px solid var(--beui-border); border-radius: 24px; box-sizing: border-box; }
.slide-panel { display: flex; flex: none; flex-direction: column; gap: 12px; }
.slide-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.slide-field { display: flex; min-width: 0; flex-direction: column; gap: 6px; }
.slide-label { font-size: 12px; line-height: 16px; font-weight: 500; color: var(--beui-muted-foreground); }
.slide-bet { display: flex; align-items: center; gap: 2px; box-sizing: border-box; height: 40px; padding: 0 4px 0 12px; border: 1px solid var(--beui-border); border-radius: 12px; background: var(--beui-background); transition: border-color .15s, box-shadow .15s; }
.slide-bet:hover { border-color: var(--slide-border-strong); }
.slide-bet:focus-within { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 20%, transparent); }
.slide-bet[data-invalid] { border-color: rgb(244 63 94 / .6); }
.slide-currency { padding-right: 2px; font-size: 14px; line-height: 20px; font-weight: 500; color: var(--beui-muted-foreground); }
.slide-bet-input { width: 100%; min-width: 0; padding: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 14px; line-height: 20px; font-weight: 500; font-variant-numeric: tabular-nums; color: var(--beui-foreground); }
.slide-bet-input:disabled { opacity: .5; }
.slide-game .slide-bet .slide-scale.be-button { height: 32px; padding: 0 10px; border-radius: 8px; font-variant-numeric: tabular-nums; }
.slide-game .slide-target { min-width: 0; max-width: none; min-height: 40px; }
/* Upstream: <SelectTrigger className="h-10 rounded-xl tabular-nums">. */
.slide-target :deep(.be-select-trigger) { height: 40px; font-variant-numeric: tabular-nums; }
.slide-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 0; padding: 10px 12px; border-radius: 12px; background: color-mix(in srgb, var(--beui-muted) 40%, transparent); font-size: 12px; line-height: 16px; }
.slide-stats div { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.slide-stats dt { color: var(--beui-muted-foreground); }
.slide-stats dd { margin: 0; font-weight: 500; font-variant-numeric: tabular-nums; }
.slide-play { box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; width: 100%; height: 48px; padding: 0 20px; border: 1px solid transparent; border-radius: 12px; background: var(--beui-primary); color: var(--beui-primary-foreground); font: inherit; font-size: 16px; line-height: 24px; font-weight: 500; font-variant-numeric: tabular-nums; cursor: pointer; user-select: none; transition: background-color .15s, opacity .15s; }
.slide-play:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 3px; }
.slide-play[aria-disabled='true'] { opacity: .6; cursor: not-allowed; }
.slide-play[data-busy] { cursor: wait; }
.slide-stage { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 8px; }
.slide-top { display: flex; align-items: center; gap: 8px; height: 32px; padding-left: 4px; }
.slide-history-icon { flex: none; color: var(--beui-muted-foreground); }
.slide-history { min-width: 0; flex: 1; }
.slide-bottom { display: flex; align-items: center; justify-content: center; height: 32px; }
.slide-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@container (min-width: 36rem) {
  .slide-card-frame { flex-direction: row; }
  .slide-panel { width: 14rem; }
  .slide-fields { grid-template-columns: minmax(0, 1fr); }
  .slide-stats { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .slide-play { margin-top: auto; }
}
</style>
