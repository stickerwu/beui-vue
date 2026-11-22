<script lang="ts">
export { minesMessages } from './mines-messages'
export type { MinesMessages } from './mines-messages'
export type MinesTile = 'gem' | 'mine'
</script>

<script setup lang="ts">
import { animate, AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch, watchEffect } from 'vue'
import ButtonBase from '../ButtonBase.vue'
import AdaptiveStepper from '../layout/AdaptiveStepper.vue'
import NumberTicker from '../numeric/NumberTicker.vue'
import { easeOut } from '../core/motion'
import GameIcon from './GameIcon.vue'
import GameToggleButton from './GameToggleButton.vue'
import MineIcon from './MineIcon.vue'
import PresenceGate from '../layout/PresenceGate.vue'
import MinesOddsRing from './MinesOddsRing.vue'
import MinesScrim from './MinesScrim.vue'
import MinesTicket from './MinesTicket.vue'
import MinesTicketLayer from './MinesTicketLayer.vue'
import { createGameSounds, type GameSounds } from './game-sounds'
import { formatMultiplier, formatOdds } from './game-parts'
import { minesMultiplier } from './game-math'
import { fillMessage, minesMessages, type MinesMessages } from './mines-messages'
import './game-parts.css'

type Phase = 'idle' | 'playing' | 'busted' | 'cashed'
type Tile = 'gem' | 'mine'

const props = withDefaults(defineProps<{
  /** Tiles per side, rounded, at least 2. Default 5 (a 5 × 5 board). Changing it ends the round. */
  size?: number
  /** Mines on the board (controlled), rounded and kept between 1 and tiles − 1. Takes effect from the next round. */
  mines?: number
  /** Initial mine count when uncontrolled. Default 3. */
  defaultMines?: number
  /** Play synthesized sounds (controlled): gem chimes, a mine blast and a cash-out arpeggio. */
  sound?: boolean
  defaultSound?: boolean
  /** Show the result card when a round ends. Default true. */
  showResult?: boolean
  labels?: Partial<MinesMessages>
  /** Injectable random source for the mine layout, for reproducible rounds. */
  random?: () => number
}>(), { size: 5, defaultMines: 3, showResult: true, random: () => Math.random(), sound: undefined, defaultSound: false })
const emit = defineEmits<{
  'update:mines': [count: number]; minesChange: [count: number]
  reveal: [tile: number, kind: Tile, multiplier: number]
  cashOut: [multiplier: number, gems: number]
  'update:sound': [value: boolean]; soundChange: [value: boolean]
}>()

const messages = computed(() => ({ ...minesMessages, ...props.labels }))
const t = (key: keyof MinesMessages, values?: Record<string, string | number>) => fillMessage(messages.value[key], values)
const mineCount = (count: number) => t(count === 1 ? 'mineOne' : 'mineMany', { count })
const reduce = useReducedMotion()

// Revealed icons arrive from a quarter size, transparent and blurred, on a spring with no bounce. A round's closing
// reveal ripples outward from the last pick, one ring of tiles every 25ms.
const ICON_SPRING = { type: 'spring', duration: 0.3, bounce: 0 } as const
const RIPPLE_STEP = 0.025
// A mine shakes once, quickly: 300ms, settling to rest.
const SHAKE = { duration: 0.3, ease: easeOut } as const
// A found gem's tile springs back from a slight squash.
const GEM_POP = { type: 'spring', duration: 0.35, bounce: 0.4 } as const
// The cash-out pulse runs through the picked gems 40ms apart over 350ms, in seconds.
const PULSE_STEP = 0.04
const PULSE_TIME = 0.35
// Exits are shorter than entrances.
const EXIT = { duration: 0.12, ease: easeOut } as const

const size = computed(() => Math.max(2, Math.round(props.size) || 2))
const tiles = computed(() => size.value * size.value)
const internalMines = shallowRef(props.defaultMines)
const chosenMines = computed(() => Math.min(Math.max(1, Math.round(props.mines ?? internalMines.value) || 1), tiles.value - 1))
const phase = shallowRef<Phase>('idle')
const mineSet = shallowRef<ReadonlySet<number>>(new Set())
const picked = shallowRef<number[]>([])
const cursor = shallowRef(0)
const announcement = shallowRef('')
const resultOpen = shallowRef(false)
const section = useTemplateRef<HTMLElement>('section')
const board = useTemplateRef<HTMLElement>('board')
const mainButton = useTemplateRef<{ $el: HTMLElement }>('mainButton')

function resetBoard() {
  phase.value = 'idle'
  picked.value = []
  mineSet.value = new Set()
  resultOpen.value = false
}
// A new size renumbers every tile, so the mines placed for the old board no longer match it.
watch(size, () => { resetBoard(); cursor.value = 0 }, { flush: 'sync' })

// Once a round starts, its payout follows the mines actually on the board, even if a controlled `mines` changes before the next round.
const mines = computed(() => (phase.value === 'idle' ? chosenMines.value : mineSet.value.size))
const gems = computed(() => picked.value.filter(tile => !mineSet.value.has(tile)).length)
const multiplier = computed(() => minesMultiplier(tiles.value, mines.value, gems.value))
const next = computed(() => minesMultiplier(tiles.value, mines.value, gems.value + 1))
const over = computed(() => phase.value === 'busted' || phase.value === 'cashed')
// Chance the next pick is a gem.
const safe = computed(() => (tiles.value - mines.value - gems.value) / (tiles.value - gems.value))
const lastPick = computed(() => picked.value.at(-1) ?? Math.floor(tiles.value / 2))
// Turning showResult off hides an open ticket too.
const resultShown = computed(() => resultOpen.value && props.showResult && over.value)

const internalSound = shallowRef(props.defaultSound)
const soundOn = computed(() => props.sound ?? internalSound.value)
let player: GameSounds | null = null
const getPlayer = () => (player ??= createGameSounds())
onBeforeUnmount(() => { player?.dispose(); player = null })

function setMines(value: number) {
  // A finished board shows the old count's mines; clear it for the new one.
  if (over.value) resetBoard()
  if (props.mines === undefined) internalMines.value = value
  emit('update:mines', value); emit('minesChange', value)
}
function closeResult() {
  resultOpen.value = false
  mainButton.value?.$el.focus()
}
const tileEl = (index: number) => board.value?.querySelector<HTMLElement>(`[data-tile="${index}"]`) ?? null

function start() {
  resetBoard()
  // Mines are placed when the round starts, never on the server.
  const order = Array.from({ length: tiles.value }, (_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(Math.max(0, props.random()) * (i + 1)))
    ;[order[i], order[j]] = [order[j]!, order[i]!]
  }
  mineSet.value = new Set(order.slice(0, chosenMines.value))
  phase.value = 'playing'
  if (!reduce.value) {
    for (let index = 0; index < tiles.value; index++) {
      const node = tileEl(index)
      if (!node) continue
      const wave = Math.floor(index / size.value) + (index % size.value)
      void animate(node, { scale: [0.94, 1], opacity: [0.5, 1] }, { duration: 0.2, delay: wave * 0.025, ease: easeOut })
    }
  }
  announcement.value = t('roundStarted', { mines: mineCount(chosenMines.value) })
  if (soundOn.value) getPlayer().prepare()
}

function cashOut(finalGems = gems.value) {
  if (phase.value !== 'playing' || finalGems === 0) return
  const value = minesMultiplier(tiles.value, mines.value, finalGems)
  phase.value = 'cashed'
  announcement.value = t('cashedOutAt', { multiplier: formatMultiplier(value) })
  if (soundOn.value) getPlayer().cashOut()
  emit('cashOut', value, finalGems)
}

function pick(tile: number) {
  if (phase.value !== 'playing' || picked.value.includes(tile)) return
  picked.value = [...picked.value, tile]
  if (mineSet.value.has(tile)) {
    phase.value = 'busted'
    announcement.value = t('mineFound')
    if (soundOn.value) getPlayer().mine()
    emit('reveal', tile, 'mine', 0)
    return
  }
  const found = gems.value
  const node = tileEl(tile)
  if (node && !reduce.value) void animate(node, { scale: [0.92, 1] }, GEM_POP)
  const value = minesMultiplier(tiles.value, mines.value, found)
  if (soundOn.value) getPlayer().gem(found)
  emit('reveal', tile, 'gem', value)
  if (found === tiles.value - mines.value) { cashOut(found); return }
  announcement.value = t('gemFound', { multiplier: formatMultiplier(value) })
}

function onKeyDown(event: KeyboardEvent, tile: number) {
  const n = size.value
  const row = Math.floor(tile / n)
  const col = tile % n
  const target = ({
    ArrowRight: row * n + Math.min(n - 1, col + 1),
    ArrowLeft: row * n + Math.max(0, col - 1),
    ArrowDown: Math.min(n - 1, row + 1) * n + col,
    ArrowUp: Math.max(0, row - 1) * n + col,
    Home: row * n,
    End: row * n + n - 1,
  } as Record<string, number>)[event.key]
  if (target === undefined) return
  event.preventDefault()
  cursor.value = target
  tileEl(target)?.focus()
}

/** Rings between two tiles: 0 for the same tile, 1 for its neighbours. */
function ringFrom(from: number, tile: number) {
  const n = size.value
  return Math.max(Math.abs(Math.floor(tile / n) - Math.floor(from / n)), Math.abs((tile % n) - (from % n)))
}

// When the board's closing animation ends, in seconds: unpicked tiles reveal in a ripple from the last pick,
// and picked gems pulse on a cash out.
const closingEnd = computed(() => {
  if (!over.value) return 0
  let end = 0
  for (let tile = 0; tile < tiles.value; tile++) {
    const order = picked.value.indexOf(tile)
    const value = order === -1
      ? ringFrom(lastPick.value, tile) * RIPPLE_STEP + ICON_SPRING.duration
      : phase.value === 'cashed' && !reduce.value ? order * PULSE_STEP + PULSE_TIME : 0
    end = Math.max(end, value)
  }
  return end
})

// The ticket rises once the closing animation has played. A timer, not an animation callback, so a cut-short
// animation can't keep it shut; a new round or a reset clears it.
watchEffect(onCleanup => {
  if (!over.value || !props.showResult) return
  const id = setTimeout(() => {
    // The main button already says Play again, so a player still on the board lands there. Focus elsewhere stays put.
    if (section.value?.contains(document.activeElement)) mainButton.value?.$el.focus({ preventScroll: true })
    resultOpen.value = true
  }, closingEnd.value * 1000)
  onCleanup(() => clearTimeout(id))
})

function toggleSound() {
  const nextSound = !soundOn.value
  if (nextSound) getPlayer().prepare()
  if (props.sound === undefined) internalSound.value = nextSound
  emit('update:sound', nextSound); emit('soundChange', nextSound)
}

function tileState(content: Tile | null, isPicked: boolean, order: number) {
  if (!content) return t('tileHidden')
  if (!isPicked) return t(content === 'mine' ? 'tileMineNotPicked' : 'tileGemNotPicked')
  return content === 'mine' ? t('tileMineHit') : t('tileGemPicked', { pick: order + 1 })
}

const cells = computed(() => Array.from({ length: tiles.value }, (_, tile) => {
  const order = picked.value.indexOf(tile)
  const isPicked = order !== -1
  const isMine = mineSet.value.has(tile)
  const shown = isPicked || over.value
  const content: Tile | null = shown ? (isMine ? 'mine' : 'gem') : null
  const hit = isPicked && isMine
  const interactive = phase.value === 'playing' && !isPicked
  return {
    tile, order, isPicked, isMine, shown, content, hit, interactive,
    row: Math.floor(tile / size.value), col: tile % size.value,
    ripple: ringFrom(lastPick.value, tile),
    celebrate: phase.value === 'cashed' && isPicked && !reduce.value,
  }
}))
</script>

<template>
  <section ref="section" class="mines" data-slot="mines" :data-phase="phase" :aria-label="t('label')"
    @keydown.esc="event => { if (resultShown) { event.stopPropagation(); closeResult() } }">
    <div class="head">
      <AdaptiveStepper :model-value="chosenMines" :min="1" :max="tiles - 1" :disabled="phase === 'playing'" :format-value-text="mineCount" :label="t('mineCount')" @value-change="setMines">
        <template #value="{ value }"><span class="mine-value"><MineIcon class="mine-glyph" />{{ value }}</span></template>
      </AdaptiveStepper>

      <div class="readout">
        <div class="multiplier">
          <!-- The multiplier is lost: struck through, as on the ticket. A plain span, since a line-through skips the ticker's inline-block digits. -->
          <span v-if="phase === 'busted'" class="lost">{{ formatMultiplier(multiplier) }}</span>
          <NumberTicker v-else :value="multiplier" :decimals="2" :format="formatOdds" suffix="×" :start-on-view="false" :duration="0.35" />
        </div>
        <p class="odds">
          <template v-if="over">{{ t(phase === 'busted' ? 'multiplierLost' : 'multiplier') }}</template>
          <template v-else>
            <MinesOddsRing :safe="safe" :reduce="reduce" />
            {{ phase === 'playing' ? t('oddsNext', { percent: Math.round(safe * 100), multiplier: formatMultiplier(next) }) : t('oddsFirst', { percent: Math.round(safe * 100) }) }}
          </template>
        </p>
      </div>
    </div>

    <!-- Board panel: 12px tiles + 12px padding give the 24px outer radius. -->
    <div class="panel">
      <!-- Under the result card the tiles leave the tab order. -->
      <fieldset ref="board" class="grid" :inert="resultShown || undefined" :style="{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }">
        <legend class="sr-only">{{ t('tiles') }}</legend>
        <motion.button v-for="cell in cells" :key="cell.tile" type="button" class="tile" :data-tile="cell.tile"
          :data-interactive="cell.interactive" :data-content="cell.content ?? undefined" :data-picked="cell.isPicked" :data-hit="cell.hit" :data-shown="cell.shown"
          :tabindex="cell.tile === cursor ? 0 : -1" :aria-disabled="!cell.interactive"
          :aria-label="t('tile', { row: cell.row + 1, column: cell.col + 1, state: tileState(cell.content, cell.isPicked, cell.order) })"
          :animate="cell.hit && !reduce ? { x: [0, -5, 5, -3, 3, 0] } : { x: 0 }" :transition="SHAKE"
          @focus="cursor = cell.tile" @click="pick(cell.tile)" @keydown="onKeyDown($event, cell.tile)">
          <motion.span v-if="cell.hit && !reduce" aria-hidden="true" class="shock" :initial="{ scale: 1, opacity: 0.7 }" :animate="{ scale: 1.7, opacity: 0 }" :transition="{ duration: 0.45, ease: easeOut }" />
          <motion.span v-if="cell.isPicked && !cell.isMine" aria-hidden="true" class="order" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.15, ease: easeOut, delay: 0.1 }">{{ cell.order + 1 }}</motion.span>
          <AnimatePresence :initial="false">
            <motion.span v-if="cell.content" :key="cell.content" aria-hidden="true" class="icon" :data-kind="cell.content"
              :initial="reduce ? { opacity: 0 } : { opacity: 0, scale: 0.25, filter: 'blur(4px)' }"
              :animate="cell.celebrate ? { opacity: 1, scale: [1, 1.2, 1], filter: 'blur(0px)' } : { opacity: cell.isPicked ? 1 : 0.4, scale: 1, filter: 'blur(0px)' }"
              :exit="reduce ? { opacity: 0, transition: EXIT } : { opacity: 0, scale: 0.9, transition: EXIT }"
              :transition="cell.celebrate ? { duration: PULSE_TIME, ease: easeOut, delay: cell.order * PULSE_STEP } : { ...ICON_SPRING, delay: cell.isPicked ? 0 : cell.ripple * RIPPLE_STEP }">
              <GameIcon v-if="cell.content === 'gem'" name="Gem" class="glyph" :size="'45%'" />
              <MineIcon v-else class="glyph" />
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </fieldset>

      <AnimatePresence>
        <PresenceGate v-if="resultShown" key="scrim" v-slot="{ gate }"><MinesScrim :gate="gate" :label="t('hideResult')" @close="closeResult" /></PresenceGate>
        <PresenceGate v-if="resultShown" key="ticket" v-slot="{ gate }">
          <MinesTicketLayer :gate="gate" :label="t('roundResult')" :reduce="reduce">
          <MinesTicket :outcome="phase === 'cashed' ? 'cashed' : 'busted'" :multiplier="multiplier" :gems="gems" :safe-tiles="tiles - mines" :mines="mines" :size="size"
            :picked="picked" :mine-set="mineSet" :reduce="reduce" :t="t" />
          </MinesTicketLayer>
        </PresenceGate>
      </AnimatePresence>
    </div>

    <div class="actions">
      <!-- aria-disabled, not disabled: Start turns into this button, and a disabled button would drop the keyboard focus that pressed it. -->
      <ButtonBase ref="mainButton" class="main" :press-scale="0.96" :aria-disabled="(phase === 'playing' && gems === 0) || undefined" @click="phase === 'playing' ? cashOut() : start()">
        {{ phase === 'playing' ? t('cashOut', { multiplier: formatMultiplier(multiplier) }) : t(over ? 'playAgain' : 'start') }}
      </ButtonBase>
      <GameToggleButton :on="soundOn" :label="t('sound')" on-icon="Volume2" off-icon="VolumeX" @toggle="toggleSound" />
    </div>

    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </section>
</template>

<style scoped>
.mines { display: flex; width: 100%; max-width: 28rem; box-sizing: border-box; flex-direction: column; gap: 16px; color: var(--beui-foreground); font-family: inherit; }
.head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.mine-value { display: inline-flex; align-items: center; gap: 6px; }
.mine-glyph { width: 16px; height: 16px; color: var(--beui-muted-foreground); }
.readout { text-align: right; }
.multiplier { font-size: 24px; line-height: 32px; font-weight: 600; color: var(--beui-foreground); }
.lost { color: var(--beui-muted-foreground); font-variant-numeric: tabular-nums; text-decoration: line-through; text-decoration-thickness: 2px; }
.odds { display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin: 0; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); font-variant-numeric: tabular-nums; }

.panel { position: relative; border-radius: 24px; padding: 12px; background: color-mix(in srgb, var(--beui-muted) 40%, transparent); }
.grid { display: grid; min-width: 0; margin: 0; gap: 8px; border: 0; padding: 0; }
.tile {
  position: relative; display: grid; aspect-ratio: 1; place-items: center; padding: 0; border: 1px solid transparent; border-radius: 12px; outline: none; color: inherit; font: inherit;
  background: color-mix(in srgb, var(--beui-card) 60%, transparent); cursor: default;
  transition: translate .15s cubic-bezier(0, 0, .2, 1), scale .15s cubic-bezier(0, 0, .2, 1), background-color .15s cubic-bezier(0, 0, .2, 1), border-color .15s cubic-bezier(0, 0, .2, 1);
}
.tile:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.tile[data-interactive='true'] { cursor: pointer; border-color: var(--beui-border); background: var(--beui-card); }
.tile[data-interactive='true']:hover { translate: 0 -2px; border-color: var(--beui-border-strong, color-mix(in srgb, var(--beui-foreground) 12%, transparent)); }
.tile[data-interactive='true']:active { scale: .96; }
.tile[data-content='gem'] { background: color-mix(in srgb, var(--beui-card) 40%, transparent); }
.tile[data-content='gem'][data-picked='true'] { background: color-mix(in srgb, var(--beui-primary) 15%, transparent); }
.tile[data-content='mine'] { background: color-mix(in srgb, var(--beui-card) 40%, transparent); }
.tile[data-content='mine'][data-hit='true'] { background: rgb(244 63 94 / 20%); }
/* The mine's shockwave paints over its neighbours. */
.tile[data-hit='true'] { z-index: 10; }
.shock { position: absolute; inset: 0; border: 2px solid #f43f5e; border-radius: 12px; pointer-events: none; }
.order { position: absolute; top: 6px; left: 8px; font-size: 10px; line-height: 15px; font-weight: 500; color: color-mix(in srgb, var(--beui-primary) 70%, transparent); font-variant-numeric: tabular-nums; }
.icon { display: grid; place-items: center; }
.icon[data-kind='gem'] { color: var(--beui-primary); }
.icon[data-kind='mine'] { color: #f43f5e; }
:global(.dark .mines .icon[data-kind='mine']) { color: #fb7185; }
.glyph { width: 45%; height: 45%; min-width: 20px; min-height: 20px; }


.actions { display: flex; align-items: center; gap: 8px; }
.main { flex: 1; }
.main[aria-disabled='true'] { cursor: not-allowed; }
.sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
</style>
