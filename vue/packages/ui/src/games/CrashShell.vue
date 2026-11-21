<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import ButtonBase from '../ButtonBase.vue'
import Select from '../controls/choice/Select.vue'
import PresenceGate from '../layout/PresenceGate.vue'
import CrashTicket from './CrashTicket.vue'
import GameEyebrow from './GameEyebrow.vue'
import GameHistory from './GameHistory.vue'
import GameIcon from './GameIcon.vue'
import SoundToggle from './SoundToggle.vue'
import { CARD_OUT, STAGE_W, TICKET_DELAY, type CrashMiniatureProps } from './crash-parts'
import { EXIT, SHAKE, SWAP, PULSE, formatMultiplier, formatShort, heat } from './game-parts'
import { easeOut } from '../core/motion'
import { growth, type CrashGameState } from './crash-round'
import './game-parts.css'

/**
 * The frame every design sits in: one card holding the recent rounds and sound, the stage with the readout
 * pinned top left, and the controls. Each design draws only its stage, which must keep the top-left corner clear.
 */
const { game, label } = defineProps<{ game: CrashGameState; label: string }>()
defineSlots<{ default?: () => unknown; miniature?: (props: CrashMiniatureProps) => unknown }>()

const main = useTemplateRef<{ $el: HTMLElement }>('main')
const stage = useTemplateRef<HTMLElement>('stage')
// Written straight to the style, so a resize doesn't re-render the game.
let observer: ResizeObserver | undefined
onMounted(() => {
  const node = stage.value
  if (!node) return
  const measure = () => {
    const width = node.clientWidth
    if (width > 0) node.style.setProperty('--crash-label', `${Math.max(10, (10 * STAGE_W) / width)}px`)
  }
  measure()
  observer = new ResizeObserver(measure)
  observer.observe(node)
})
onBeforeUnmount(() => observer?.disconnect())

// The ticket opens per round once the crash has played; tapping the stage or Escape puts it away, and the next round clears it.
const openRound = shallowRef<number | null>(null)
const resultShown = computed(() => game.crashed && openRound.value === game.round)
let timer: ReturnType<typeof setTimeout> | undefined
watch(() => [game.crashed, game.round] as const, ([crashed, round]) => {
  clearTimeout(timer)
  if (!crashed) return
  // A timer, not an animation callback, so a cut-short animation can't keep it shut. Focus stays where it is.
  timer = setTimeout(() => { openRound.value = round }, (game.reduce ? 0.15 : TICKET_DELAY) * 1000)
}, { immediate: true })
onBeforeUnmount(() => clearTimeout(timer))
function closeResult() {
  openRound.value = null
  main.value?.$el?.focus()
}
function keydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !resultShown.value) return
  // An open Auto menu takes this Escape.
  if (event.target instanceof Element && event.target.closest('[role="listbox"],[aria-expanded="true"]')) return
  event.stopPropagation()
  closeResult()
}

// After a crash you cashed out of, the number that counts is yours.
const final = computed(() => game.crashed && game.cashed !== null)
const shown = computed(() => formatMultiplier(final.value && game.cashed !== null ? game.cashed : game.multiplier))
const spanInitial = computed(() => game.reduce
  ? (final.value ? { opacity: 0 } : false)
  : final.value ? { opacity: 0, scale: 0.96, filter: 'blur(4px)' } : game.pulse > 0 ? { scale: 1.08 } : false)
const eyebrowState = computed(() => game.crashed ? (game.lost ? 'lost' : 'won') : game.running && game.cashed === null ? 'live' : 'idle')

const options = computed(() => [{ value: 'off', label: game.text('autoOff') }, ...game.autoOptions.map((step) => ({ value: String(step), label: formatShort(step) }))])
const autoValue = computed(() => (game.auto === null ? 'off' : String(game.auto)))
// Progress toward the auto target, on the same log scale the multiplier grows on, so it fills at a steady pace.
const progress = computed(() => (game.running && game.target !== null ? Math.min(1, Math.log(growth(game.t)) / Math.log(game.target)).toFixed(4) : null))
function repeatGuard(event: KeyboardEvent) { if (event.repeat && event.key === 'Enter') event.preventDefault() }
</script>

<template>
  <!-- Focusable by script and click only: a tap on the stage keeps focus in the game, so Escape still reaches the ticket. -->
  <section class="crash-shell" :aria-label="label" tabindex="-1" @keydown="keydown">
    <div class="crash-card">
      <div class="crash-head">
        <GameIcon name="History" :size="14" class="crash-head-icon" />
        <GameHistory class="crash-history" :history="game.history" :reduce="game.reduce" :label="game.text('recentCrashes')" :empty-label="game.text('recentEmpty')" />
        <SoundToggle :on="game.soundOn" :label="game.text('sound')" @toggle="game.toggleSound" />
      </div>
      <!-- A 10:7 stage in every design, so switching between them never jumps. A container: its width also fixes its height. -->
      <div ref="stage" class="crash-stage">
        <slot />
        <div class="crash-readout">
          <GameEyebrow :label="game.eyebrow" :state="eyebrowState" :reduce="game.reduce" />
          <motion.p :key="game.round" class="crash-multiplier" :data-tone="game.lost ? 'lost' : final ? 'final' : 'heat'" :data-heat="heat(game.multiplier)"
            :animate="game.lost && !game.reduce ? { x: [0, -6, 6, -3, 3, 0] } : { x: 0 }" :transition="SHAKE">
            <!-- Remounts per milestone for a quick swell, and once more when the crash hands the readout your cash out, which blurs in. -->
            <motion.span :key="final ? 'final' : game.pulse" class="crash-multiplier-value" :initial="spanInitial" :animate="{ opacity: 1, scale: 1, filter: 'blur(0px)' }" :transition="final ? SWAP : PULSE">{{ shown }}</motion.span>
          </motion.p>
          <div class="crash-status">
            <AnimatePresence :initial="false" mode="popLayout">
              <motion.p v-if="game.cashed !== null && !game.crashed" key="cashed" class="crash-badge"
                :initial="game.reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: 'blur(4px)' }" :animate="{ opacity: 1, scale: 1, filter: 'blur(0px)' }" :exit="{ opacity: 0, transition: EXIT }" :transition="SWAP">
                <GameIcon name="Check" :size="14" :stroke-width="2.5" />{{ game.text('cashedBadge', { multiplier: formatMultiplier(game.cashed) }) }}
              </motion.p>
              <motion.p v-else :key="game.status" class="crash-hint"
                :initial="game.reduce ? { opacity: 0 } : { opacity: 0, y: 4, filter: 'blur(4px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }" :exit="{ opacity: 0, transition: EXIT }" :transition="SWAP">{{ game.status }}</motion.p>
            </AnimatePresence>
          </div>
        </div>
        <AnimatePresence>
          <PresenceGate v-if="resultShown" key="scrim" v-slot="{ gate }">
            <motion.button type="button" class="crash-scrim" :aria-label="game.text('hideResult')" :inert="gate.inert" :style="gate.style"
              :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0, transition: CARD_OUT }" :transition="{ duration: 0.2, ease: easeOut }" @click="closeResult" />
          </PresenceGate>
          <PresenceGate v-if="resultShown" key="ticket" v-slot="{ gate }">
            <div class="crash-ticket-layer" :inert="gate.inert">
              <CrashTicket :game="game">
                <template v-if="$slots.miniature" #miniature="miniature"><slot name="miniature" v-bind="miniature" /></template>
              </CrashTicket>
            </div>
          </PresenceGate>
        </AnimatePresence>
      </div>
      <!-- The Auto menu and the main action, in one 40px row with 12px corners. -->
      <div class="crash-controls">
        <Select class="crash-auto" :options="options" :model-value="autoValue" :label="game.text('auto')" :disabled="game.running || game.starting" @update:model-value="(value) => game.setAuto(String(value))">
          <template #value="{ option }"><span class="crash-auto-value"><span class="crash-auto-label">{{ game.text('auto') }}</span><span>{{ option?.label ?? (game.auto === null ? game.text('autoOff') : formatShort(game.auto)) }}</span></span></template>
        </Select>
        <ButtonBase ref="main" class="crash-main" :aria-disabled="game.actionBusy || undefined" :aria-busy="game.starting || undefined" :press-scale="game.actionBusy ? 1 : 0.96"
          @click="game.act()" @keydown="repeatGuard">
          {{ game.actionLabel }}
          <span v-if="progress !== null" class="crash-progress" aria-hidden="true" :style="{ transform: `scaleX(${progress})` }" />
        </ButtonBase>
      </div>
    </div>
    <!-- The polite live region for starts, milestones, cash outs and crashes. -->
    <p class="crash-sr" role="status" aria-live="polite">{{ game.announcement }}</p>
  </section>
</template>

<style scoped>
.crash-shell { width: 100%; max-width: 28rem; outline: none; box-sizing: border-box; color: var(--beui-foreground); font: inherit; }
.crash-shell *, .crash-shell *::before, .crash-shell *::after { box-sizing: border-box; }
/* 24px card corners = 12px stage and control corners + 12px padding. */
.crash-card { display: flex; flex-direction: column; gap: 12px; border: 1px solid var(--beui-border); border-radius: 24px; padding: 12px; }
.crash-head { display: flex; align-items: center; gap: 8px; height: 32px; padding-left: 4px; }
.crash-head-icon { flex: none; color: var(--beui-muted-foreground); }
.crash-history { min-width: 0; flex: 1; }
.crash-stage { container-type: inline-size; position: relative; aspect-ratio: 10 / 7; overflow: hidden; border-radius: 12px; background: color-mix(in srgb, var(--beui-muted) 40%, transparent); }
.crash-readout { position: absolute; top: 16px; left: 16px; pointer-events: none; }
.crash-multiplier { margin: 4px 0 0; font-size: 30px; line-height: 36px; font-weight: 600; letter-spacing: -0.025em; font-variant-numeric: tabular-nums; transition: color .15s; color: var(--beui-foreground); }
@container (min-width: 20rem) { .crash-multiplier { font-size: 36px; line-height: 40px; } }
.crash-multiplier[data-tone='heat'][data-heat='warm'] { color: var(--beui-primary); }
.crash-multiplier[data-tone='heat'][data-heat='hot'] { color: #b45309; }
.crash-multiplier[data-tone='final'] { color: var(--beui-primary); }
.crash-multiplier[data-tone='lost'] { color: #e11d48; }
:global(.dark .crash-multiplier[data-tone='heat'][data-heat='hot']) { color: #fbbf24; }
:global(.dark .crash-multiplier[data-tone='lost']) { color: #fb7185; }
:global([data-beui-theme='dark'] .crash-multiplier[data-tone='heat'][data-heat='hot']) { color: #fbbf24; }
:global([data-beui-theme='dark'] .crash-multiplier[data-tone='lost']) { color: #fb7185; }
.crash-multiplier-value { display: inline-block; transform-origin: left; }
.crash-status { display: flex; align-items: center; height: 24px; margin-top: 8px; }
.crash-hint { margin: 0; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); font-variant-numeric: tabular-nums; }
.crash-badge { display: inline-flex; align-items: center; gap: 4px; height: 24px; margin: 0; padding: 0 10px 0 8px; border-radius: 999px; background: var(--beui-primary); color: var(--beui-primary-foreground); font-size: 12px; line-height: 16px; font-weight: 500; font-variant-numeric: tabular-nums; }
.crash-scrim { position: absolute; inset: 0; z-index: 20; display: block; width: 100%; height: 100%; padding: 0; border: 0; border-radius: 0; cursor: default; outline: none; background: color-mix(in srgb, var(--beui-background) 55%, transparent); -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
.crash-scrim:focus-visible { box-shadow: inset 0 0 0 2px var(--beui-primary); }
.crash-ticket-layer { position: absolute; inset: 0; z-index: 20; display: grid; place-items: center; padding: 16px; pointer-events: none; }
.crash-controls { display: flex; align-items: center; gap: 8px; }
/* Upstream: <Select className="w-32 shrink-0"> with <SelectTrigger className="h-10 tabular-nums">. */
.crash-controls .crash-auto { width: 128px; flex: none; }
.crash-auto :deep(.be-select-trigger) { height: 40px; font-variant-numeric: tabular-nums; }
.crash-auto-value { display: flex; align-items: baseline; gap: 6px; }
.crash-auto-label { font-size: 12px; color: var(--beui-muted-foreground); }
.crash-controls .crash-main.crash-main { position: relative; flex: 1; height: 40px; overflow: hidden; border-radius: 12px; font-variant-numeric: tabular-nums; }
.crash-main[aria-disabled='true'] { cursor: wait; opacity: .6; }
.crash-progress { position: absolute; inset-inline: 0; bottom: 0; height: 3px; transform-origin: left; pointer-events: none; background: color-mix(in srgb, var(--beui-primary-foreground) 45%, transparent); }
.crash-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
</style>
