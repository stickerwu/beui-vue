<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import CrashTowerMark from './CrashTowerMark.vue'
import { clamp01, easeIn } from './crash-parts'
import { GROWTH, type CrashGameState } from './crash-round'
import { SWAP, formatShort } from './game-parts'
import { easeOut } from '../core/motion'
import { STEP, BASE, BLOCK_H, PITCH, blockAt, blockOf, markRise, offset, width, crack } from './crash-tower'

/**
 * A crash game drawn as a tower: a block stacks on at every +8% and the tower sways harder the taller it gets, until
 * the crash topples it. Cash out before it does; your block keeps a flag as the tower carries on without you.
 */
const { game } = defineProps<{ game: CrashGameState }>()

const PER_SECOND = GROWTH / Math.log(STEP)
// The stage is 10:7, so its height scales with width. The camera follow threshold comes from the measured height,
// keeping the top block 24px under the stage edge. Before measuring it assumes the smallest stage.
const TOP_ROOM = 24
const MIN_STAGE_H = 200
const followFor = (stageH: number) => Math.max(4, Math.floor((stageH - BASE - TOP_ROOM - BLOCK_H) / PITCH))
// Sway grows with height up to this many degrees.
const MAX_SWAY = 4
const SWAY_RATE = 2.2
// A block lands with a little give, which reads as stacked by hand.
const DROP = { type: 'spring', duration: 0.35, bounce: 0.25 } as const

const stage = useTemplateRef<HTMLElement>('stage')
const stageH = shallowRef(MIN_STAGE_H)
let observer: ResizeObserver | undefined
onMounted(() => {
  const node = stage.value
  if (!node) return
  const measure = () => { stageH.value = node.clientHeight }
  measure()
  observer = new ResizeObserver(measure)
  observer.observe(node)
})
onBeforeUnmount(() => observer?.disconnect())

const view = computed(() => {
  const { t, crashed, round, reduce, target, ghost } = game
  const follow = followFor(stageH.value)
  const b = t * PER_SECOND
  const top = Math.floor(b + 1e-9)
  // Continuous, so the stack sinks smoothly between landings.
  const cam = Math.max(0, b - follow)
  // Blocks below this are past the stage bottom.
  const lowest = Math.max(0, Math.floor(cam) - 3)
  // Cracks need some height first, then spread up from the base.
  const strain = clamp01((b - 8) / 12)
  const amp = reduce ? 0 : Math.min(MAX_SWAY, b * 0.22)
  const phase = t * SWAY_RATE
  const angle = amp * (0.8 * Math.sin(phase) + 0.2 * Math.sin(phase * 1.7 + 1))
  // The upper blocks lag the sway a little, so the tower bends rather than pivots.
  const bend = amp * 1.5 * Math.sin(phase - 0.9)
  // From the cash-out time, not the value: the value is floored to two decimals and can fall just below the block that was on top.
  const cashK = game.cashedT === null ? null : blockAt(game.cashedT)
  // A mark's line sits on top of its block, so the labels of that block and the next would print over the mark's own.
  const marked = [ghost, target].flatMap((m) => (m === null ? [] : [blockOf(m)]))
  // The crash breaks the top few blocks off, tipping the way the tower leans.
  const breakK = Math.max(0, top - 4 - (round % 3))
  const dir = angle < 0 ? -1 : 1
  // Marks above the view pin to the top edge with a caret, so a far target stays readable.
  const ceiling = stageH.value - BASE - 10
  const blocks = Array.from({ length: top - lowest + 1 }, (_, i) => {
    const k = lowest + i
    const rise = k - cam
    const lift = rise / follow
    const w = width(k)
    const falling = crashed && k >= breakK
    return {
      k, w, falling, n: k - breakK,
      x: offset(k) + bend * lift * lift - w / 2,
      y: -rise * PITCH - BLOCK_H,
      load: clamp01((top - k - 4) / 10) * strain,
      labelled: k > 0 && k % 5 === 0 && !marked.some((g) => k === g || k === g + 1),
      kind: k === cashK ? 'cash' : falling ? (game.lost ? 'lost' : 'fallen') : k % 2 ? 'odd' : 'even',
    }
  })
  const showGhost = ghost !== null && (target === null || Math.abs(Math.min(markRise(ghost, cam), ceiling) - Math.min(markRise(target, cam), ceiling)) >= 12)
  return { cam, top, angle, breakK, dir, blocks, cashK, ceiling, showGhost, ghostRise: ghost === null ? 0 : markRise(ghost, cam), targetRise: target === null ? 0 : markRise(target, cam) }
})
</script>

<template>
  <div ref="stage" aria-hidden="true" class="tower-stage">
    <!-- Ground and slab sink with the camera but never sway. -->
    <div class="tower-ground" :style="{ height: `${BASE}px`, transform: `translateY(${(view.cam * PITCH).toFixed(2)}px)` }">
      <div class="tower-line" />
      <div class="tower-slab" />
    </div>

    <AnimatePresence :initial="false">
      <!-- Dropped when it would print over the target's label (both pinned at the top, or within 12px). -->
      <CrashTowerMark v-if="view.showGhost && game.ghost !== null" key="ghost" :rise="view.ghostRise" :ceiling="view.ceiling" :label="game.text('lastMark', { multiplier: formatShort(game.ghost) })" tone="ghost" />
      <CrashTowerMark v-if="game.target !== null" key="target" :rise="view.targetRise" :ceiling="view.ceiling" :label="game.text('targetMarkTower', { multiplier: formatShort(game.target) })" tone="target" />
    </AnimatePresence>

    <!-- A zero-size anchor on the baseline, so the sway pivots there. -->
    <div class="tower-column" :style="{ bottom: `${BASE}px`, transform: `rotate(${view.angle.toFixed(3)}deg)` }">
      <div v-for="block in view.blocks" :key="`${game.round}-${block.k}`" class="tower-slot" :style="{ width: `${block.w}px`, height: `${BLOCK_H}px`, transform: `translate(${block.x.toFixed(2)}px,${block.y.toFixed(2)}px)` }">
        <motion.div class="tower-block" :data-kind="block.kind"
          :initial="game.round === 0 || game.skipping ? false : game.reduce ? { opacity: 0 } : { opacity: 0, y: -24 }"
          :animate="block.falling && !game.reduce
            ? { x: view.dir * (20 + block.n * 12), y: 160 + block.n * 6, rotate: view.dir * (50 + block.n * 18 + (block.k % 3) * 12), opacity: [1, 1, 0] }
            : { x: 0, y: 0, rotate: 0, opacity: block.falling ? 0.35 : 1 }"
          :transition="block.falling && !game.reduce
            ? { duration: 0.6, ease: easeIn, delay: (view.top - block.k) * 0.025, opacity: { duration: 0.6, times: [0, 0.7, 1], delay: (view.top - block.k) * 0.025 } }
            : game.reduce ? { duration: 0.15, ease: easeOut } : DROP">
          <!-- The load on this block, read straight from the height: no motion of its own. -->
          <svg v-if="block.load > 0" aria-hidden="true" viewBox="0 0 100 13" preserveAspectRatio="none" class="tower-crack" :style="{ opacity: block.load }">
            <path :d="crack(block.k)" fill="none" stroke-width="1" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
          </svg>
          <span v-if="block.labelled" class="tower-label" :class="{ cash: block.kind === 'cash' }">{{ formatShort(STEP ** block.k) }}</span>
          <!-- Where you bailed: a pennant off your block's right side, clear of the blocks above. -->
          <motion.span v-if="block.kind === 'cash'" :key="`flag-${game.round}`" class="tower-flag" :initial="game.reduce ? { opacity: 0 } : { opacity: 0, scale: 0.25 }" :animate="{ opacity: 1, scale: 1 }" :transition="SWAP" />
        </motion.div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tower-stage { position: absolute; inset: 0; overflow: hidden; }
.tower-ground { position: absolute; inset-inline: 0; bottom: 0; }
.tower-line { position: absolute; inset-inline: 0; top: 8px; border-top: 1px solid var(--beui-border); }
.tower-slab { position: absolute; top: 0; left: 72%; width: 112px; height: 8px; translate: -50% 0; border-radius: 3px; background: color-mix(in oklab, var(--beui-foreground) 20%, transparent); }
.tower-column { position: absolute; left: 72%; }
.tower-slot { position: absolute; top: 0; left: 0; }
.tower-block { position: relative; width: 100%; height: 100%; border-radius: 4px; transition: background-color .15s; background: color-mix(in oklab, var(--beui-foreground) 10%, transparent); }
.tower-block[data-kind='odd'] { background: color-mix(in oklab, var(--beui-foreground) 15%, transparent); }
.tower-block[data-kind='cash'] { background: var(--beui-primary); }
.tower-block[data-kind='lost'] { background: #f43f5e; }
.tower-block[data-kind='fallen'] { background: color-mix(in oklab, var(--beui-muted-foreground) 40%, transparent); }
.tower-crack { position: absolute; inset: 0; width: 100%; height: 100%; }
.tower-crack path { stroke: color-mix(in oklab, var(--beui-foreground) 35%, transparent); }
.tower-label { position: absolute; top: 50%; left: 100%; translate: 0 -50%; margin-left: 8px; font-size: 10px; line-height: 1; color: var(--beui-muted-foreground); font-variant-numeric: tabular-nums; }
.tower-label.cash { margin-left: 24px; }
.tower-flag { position: absolute; top: 50%; left: 100%; width: 14px; height: 10px; margin-left: 2px; translate: 0 -50%; transform-origin: left; background: var(--beui-primary); clip-path: polygon(0 0, 0 100%, 100% 50%); }
</style>
