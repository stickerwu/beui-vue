<script setup lang="ts">
import { motion } from 'motion-v'
import { computed } from 'vue'
import NumberTicker from '../numeric/NumberTicker.vue'
import { CARD_IN, CARD_OUT, CHUNK, TEAR, type CrashMiniatureProps } from './crash-parts'
import { formatMultiplier, formatShort } from './game-parts'
import type { CrashGameState } from './crash-round'

/**
 * The end-of-round receipt over a dimmed stage: a stub notched at a dashed tear line, the outcome above, the
 * round's figures and a miniature of the flight below. It has no buttons: the main action already says Play again.
 */
const { game } = defineProps<{ game: CrashGameState }>()
defineSlots<{ miniature?: (props: CrashMiniatureProps) => unknown }>()

const won = computed(() => game.cashed !== null)
const reduce = computed(() => game.reduce)
const chunk = (delay: number) => ({ ...CHUNK, delay: reduce.value ? 0 : delay })
const chunkInitial = computed(() => (reduce.value ? { opacity: 0 } : { opacity: 0, y: 6 }))
const miniatureProps = computed<CrashMiniatureProps>(() => ({
  crash: game.multiplier, cashed: game.cashed, cashedT: game.cashedT, target: won.value ? null : game.roundAuto, reduce: reduce.value,
}))
</script>

<template>
  <motion.div role="group" :aria-label="game.text('result')" class="crash-ticket-wrap"
    :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
    :exit="reduce ? { opacity: 0, transition: CARD_OUT } : { opacity: 0, y: 8, scale: 0.98, transition: CARD_OUT }" :transition="reduce ? { duration: 0.2 } : CARD_IN">
    <div class="crash-ticket">
      <div class="crash-ticket-top" :data-won="won" :style="{ height: `${TEAR}px` }">
        <motion.div :initial="chunkInitial" :animate="{ opacity: 1, y: 0 }" :transition="chunk(0.05)">
          <p class="crash-ticket-state">{{ game.text(won ? 'stateCashedOut' : 'stateCrashed') }}</p>
        </motion.div>
        <motion.div :initial="chunkInitial" :animate="{ opacity: 1, y: 0 }" :transition="chunk(0.1)">
          <p class="crash-ticket-value" :data-won="won">
            <NumberTicker v-if="game.cashed !== null" :value="game.cashed" :decimals="2" :format="(value: number) => formatMultiplier(value).slice(0, -1)" suffix="×" :start-on-view="false" :duration="0.6" :stagger="0.05" />
            <!-- The multiplier is lost: struck through, as Mines does. A plain span, since a line-through skips the ticker's inline-block digits. -->
            <span v-else class="crash-ticket-lost">{{ formatMultiplier(game.multiplier) }}</span>
          </p>
        </motion.div>
      </div>
      <div class="crash-ticket-tear" aria-hidden="true" />
      <div class="crash-ticket-bottom">
        <motion.div class="crash-ticket-figures" :initial="chunkInitial" :animate="{ opacity: 1, y: 0 }" :transition="chunk(0.18)">
          <dl>
            <div class="crash-row"><dt>{{ game.text('crashedAt') }}</dt><dd>{{ formatMultiplier(game.multiplier) }}</dd></div>
            <div class="crash-row"><dt>{{ game.text('flight') }}</dt><dd>{{ game.text('seconds', { seconds: game.t.toFixed(1) }) }}</dd></div>
            <!-- The built-in round reaches m with a chance of 1 in m; a custom crash point makes no such promise. -->
            <div v-if="game.cashed !== null && game.fair" class="crash-row"><dt>{{ game.text('oddsBeaten') }}</dt><dd>{{ game.text('odds', { odds: formatMultiplier(game.cashed).slice(0, -1) }) }}</dd></div>
            <div v-else-if="game.cashed !== null" class="crash-row"><dt>{{ game.text('leftAt') }}</dt><dd>{{ formatMultiplier(game.cashed) }}</dd></div>
            <div v-else class="crash-row"><dt>{{ game.text('autoTarget') }}</dt><dd>{{ game.roundAuto === null ? game.text('autoOff') : formatShort(game.roundAuto) }}</dd></div>
          </dl>
        </motion.div>
        <!-- A narrow ticket keeps the figures on one line each and drops the miniature. -->
        <motion.div v-if="$slots.miniature" class="crash-ticket-mini" :initial="chunkInitial" :animate="{ opacity: 1, y: 0 }" :transition="chunk(0.24)">
          <slot name="miniature" v-bind="miniatureProps" />
        </motion.div>
      </div>
    </div>
  </motion.div>
</template>

<style scoped>
.crash-ticket-wrap { width: 100%; max-width: 17rem; pointer-events: auto; filter: drop-shadow(0 1px 1px rgb(0 0 0 / .12)) drop-shadow(0 12px 16px rgb(0 0 0 / .3)); }
.crash-ticket { container-type: inline-size; width: 100%; border-radius: 16px; background: var(--beui-card); color: var(--beui-foreground); font-size: 12px; line-height: 16px;
  -webkit-mask-image: radial-gradient(circle 9px at 0 104px, transparent 98%, black), radial-gradient(circle 9px at 100% 104px, transparent 98%, black); -webkit-mask-composite: source-in;
  mask-image: radial-gradient(circle 9px at 0 104px, transparent 98%, black), radial-gradient(circle 9px at 100% 104px, transparent 98%, black); mask-composite: intersect; }
@container (max-width: 17rem) { .crash-ticket { scale: .72; } }
@container (min-width: 17rem) and (max-width: 21rem) { .crash-ticket { scale: .85; } }
.crash-ticket-top { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 0 20px; border-radius: 16px 16px 0 0; text-align: center; background: rgb(244 63 94 / .1); }
.crash-ticket-top[data-won='true'] { background: color-mix(in srgb, var(--beui-primary) 10%, transparent); }
.crash-ticket-state { margin: 0; font-size: 12px; line-height: 16px; font-weight: 500; letter-spacing: .025em; text-transform: uppercase; color: #be123c; }
.crash-ticket-top[data-won='true'] .crash-ticket-state { color: color-mix(in oklab, var(--beui-primary) 75%, black); }
:global(.dark .crash-ticket-state) { color: #fb7185; }
:global(.dark .crash-ticket-top[data-won='true'] .crash-ticket-state) { color: color-mix(in oklab, var(--beui-primary) 80%, white); }
:global([data-beui-theme='dark'] .crash-ticket-state) { color: #fb7185; }
:global([data-beui-theme='dark'] .crash-ticket-top[data-won='true'] .crash-ticket-state) { color: color-mix(in oklab, var(--beui-primary) 80%, white); }
.crash-ticket-value { margin: 0; font-size: 30px; line-height: 36px; font-weight: 600; color: var(--beui-foreground); }
.crash-ticket-value[data-won='false'] { color: var(--beui-muted-foreground); text-decoration: line-through; text-decoration-thickness: 2px; }
.crash-ticket-lost { font-variant-numeric: tabular-nums; }
.crash-ticket-tear { margin: 0 16px; border-top: 2px dashed var(--beui-border); }
.crash-ticket-bottom { display: flex; align-items: center; gap: 16px; padding: 16px 20px 20px; }
.crash-ticket-figures { flex: 1; }
.crash-ticket-figures dl { display: grid; gap: 6px; margin: 0; }
.crash-row { display: flex; justify-content: space-between; gap: 8px; white-space: nowrap; }
.crash-row dt { color: var(--beui-muted-foreground); }
.crash-row dd { margin: 0; font-weight: 500; font-variant-numeric: tabular-nums; }
.crash-ticket-mini { display: flex; flex: none; }
@container (max-width: 15rem) { .crash-ticket-mini { display: none; } }
</style>
