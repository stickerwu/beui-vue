<script setup lang="ts">
import { motion } from 'motion-v'
import NumberTicker from '../numeric/NumberTicker.vue'
import { easeOut } from '../core/motion'
import { formatMultiplier, formatOdds } from './game-parts'
import type { MinesTranslate } from './mines-messages'

/** A ticket stub, notched at a dashed tear line: the end-of-round summary. */
defineProps<{
  outcome: 'cashed' | 'busted'
  multiplier: number
  gems: number
  safeTiles: number
  mines: number
  size: number
  picked: number[]
  mineSet: ReadonlySet<number>
  reduce: boolean
  t: MinesTranslate
}>()

// The ticket's tear line sits this far down; the side notches are cut there.
const TEAR = 104
const NOTCH_MASK = `radial-gradient(circle 9px at 0 ${TEAR}px, transparent 98%, black), radial-gradient(circle 9px at 100% ${TEAR}px, transparent 98%, black)`
// Inside the ticket, chunks arrive in reading order: outcome, multiplier, stats, then the run replays on the mini map in pick order.
const STAGE = { duration: 0.25, ease: easeOut } as const
const REPLAY_START = 0.3
const REPLAY_STEP = 0.05
// Mini map cells pop in with a small overshoot: each is 8px, so a bounce reads as a cell landing rather than a wobble.
const CELL_SPRING = { type: 'spring', duration: 0.3, bounce: 0.3 } as const
</script>

<template>
  <div class="ticket" :style="{ WebkitMaskImage: NOTCH_MASK, WebkitMaskComposite: 'source-in', maskImage: NOTCH_MASK, maskComposite: 'intersect' }">
    <div class="top" :data-outcome="outcome" :style="{ height: `${TEAR}px` }">
      <motion.div :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ ...STAGE, delay: reduce ? 0 : 0.05 }">
        <p class="mt-outcome" :class="{ lost: outcome === 'busted' }">{{ t(outcome === 'cashed' ? 'cashedOut' : 'mineHit') }}</p>
      </motion.div>
      <motion.div :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ ...STAGE, delay: reduce ? 0 : 0.1 }">
        <p class="payout" :class="{ lost: outcome === 'busted' }">
          <NumberTicker v-if="outcome === 'cashed'" :value="multiplier" :decimals="2" :format="formatOdds" suffix="×" :start-on-view="false" :duration="0.6" :stagger="0.05" />
          <span v-else class="plain">{{ formatMultiplier(multiplier) }}</span>
        </p>
      </motion.div>
    </div>
    <div aria-hidden="true" class="tear" />
    <div class="bottom">
      <motion.div class="stats" :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ ...STAGE, delay: reduce ? 0 : 0.18 }">
        <dl>
          <div class="row"><dt>{{ t('gems') }}</dt><dd>{{ t('gemsOf', { gems, total: safeTiles }) }}</dd></div>
          <div class="row"><dt>{{ t('mines') }}</dt><dd>{{ mines }}</dd></div>
          <div class="row">
            <dt>{{ t(outcome === 'cashed' ? 'oddsBeaten' : 'lostOnPick') }}</dt>
            <dd>{{ outcome === 'cashed' ? t('oddsBeatenValue', { odds: formatOdds(multiplier) }) : picked.length }}</dd>
          </div>
        </dl>
      </motion.div>
      <!-- A narrow ticket keeps the stats on one line each and drops the map. -->
      <motion.div class="map-stage" :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ ...STAGE, delay: reduce ? 0 : 0.24 }">
        <!-- 8px cells 3px apart, kept within 88px so big boards leave the stats room. -->
        <div aria-hidden="true" class="map" :style="{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gap: `${size > 10 ? 1 : 3}px`, width: `${Math.min(88, size * 8 + (size - 1) * (size > 10 ? 1 : 3))}px` }">
          <motion.span v-for="(_, tile) in size * size" :key="tile" class="cell"
            :class="{ gem: picked.includes(tile) && !mineSet.has(tile), hit: picked.includes(tile) && mineSet.has(tile) && tile === picked.at(-1), mine: !picked.includes(tile) && mineSet.has(tile), idle: !picked.includes(tile) && !mineSet.has(tile) }"
            :initial="picked.includes(tile) && !reduce ? { opacity: 0, scale: 0.4 } : false" :animate="{ opacity: 1, scale: 1 }"
            :transition="{ ...CELL_SPRING, delay: REPLAY_START + picked.indexOf(tile) * REPLAY_STEP }" />
        </div>
      </motion.div>
    </div>
  </div>
</template>

<style scoped>
.ticket { container-type: inline-size; width: 100%; border-radius: 16px; background: var(--beui-card); color: var(--beui-foreground); }
.top { box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 0 20px; border-radius: 16px 16px 0 0; text-align: center; }
.top[data-outcome='cashed'] { background: color-mix(in srgb, var(--beui-primary) 10%, transparent); }
.top[data-outcome='busted'] { background: rgb(244 63 94 / 10%); }
p { margin: 0; }
.mt-outcome { font-size: 12px; line-height: 16px; font-weight: 500; letter-spacing: .025em; text-transform: uppercase; color: var(--beui-primary); }
.mt-outcome.lost { color: #e11d48; }
:global(.dark .mt-outcome.lost) { color: #fb7185; }
.payout { font-size: 30px; line-height: 36px; font-weight: 600; color: var(--beui-foreground); }
.payout.lost { color: var(--beui-muted-foreground); text-decoration: line-through; text-decoration-thickness: 2px; }
.plain { font-variant-numeric: tabular-nums; }
.tear { margin: 0 16px; border-top: 2px dashed var(--beui-border); }
.bottom { display: flex; align-items: center; gap: 16px; padding: 16px 20px 20px; }
.stats { flex: 1; }
dl { display: grid; gap: 6px; margin: 0; font-size: 12px; line-height: 16px; }
.row { display: flex; justify-content: space-between; gap: 8px; white-space: nowrap; }
dt { color: var(--beui-muted-foreground); }
dd { margin: 0; font-weight: 500; font-variant-numeric: tabular-nums; }
.map { display: grid; flex: none; }
.cell { aspect-ratio: 1; border-radius: 2px; }
.cell.gem { background: var(--beui-primary); }
.cell.hit { background: #f43f5e; }
.cell.mine { box-shadow: inset 0 0 0 1px rgb(244 63 94 / 60%); }
.cell.idle { background: color-mix(in srgb, var(--beui-foreground) 10%, transparent); }
@container (max-width: 15rem) { .map-stage { display: none; } }
</style>
