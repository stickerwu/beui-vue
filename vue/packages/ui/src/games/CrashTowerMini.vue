<script setup lang="ts">
import { motion } from 'motion-v'
import { computed } from 'vue'
import { MINI, MINI_REPLAY, easeIn, type CrashMiniatureProps } from './crash-parts'
import { SWAP } from './game-parts'
import { blockAt, blockOf, offset, width } from './crash-tower'

/**
 * The round as a tiny tower, rebuilt row by row: a row stands for one or more blocks so any height fits, your
 * cash-out row is blue with a pennant, a missed target is a dashed line, and the top rows topple off at the crash.
 */
const props = defineProps<CrashMiniatureProps>()

// The mini stack's rows pop on with a small overshoot, like Mines' mini map cells.
const MINI_LAND = { type: 'spring', duration: 0.3, bounce: 0.3 } as const
const MINI_ROWS = 10
const cx = 40
const base = MINI.height - 4
const rowY = (r: number) => base - 4 * (r + 1)

const geo = computed(() => {
  const blocks = blockOf(props.crash) + 1
  const per = Math.ceil(blocks / MINI_ROWS)
  const rows = Math.ceil(blocks / per)
  const rowOf = (block: number) => Math.min(rows - 1, Math.floor(block / per))
  const cashRow = props.cashedT === null ? null : rowOf(blockAt(props.cashedT))
  const fallen = rows > 1 ? Math.min(3, rows - 1) : 0
  // Rows land over at most 0.5s however tall the tower got.
  const step = Math.min(0.05, 0.5 / rows)
  const built = props.reduce ? 0 : MINI_REPLAY.delay + rows * step
  const lost = props.cashed === null
  const targetY = props.target === null ? 0 : Math.max(2, Math.min(rowY(Math.floor(blockOf(props.target) / per)), rowY(rows - 1) - 3))
  const list = Array.from({ length: rows }, (_, r) => {
    const w = (width(r) / 72) * 28
    const topple = r >= rows - fallen
    // Fallen rows land in a pile beside the tower: the lowest falls first and lies at the bottom.
    const pile = r - (rows - fallen)
    return { r, w, x: cx + offset(r) * 0.4 - w / 2, topple, pile, isCash: r === cashRow, kind: r === cashRow ? 'cash' : topple ? (lost ? 'lost' : 'fallen') : 'row' }
  })
  return { rows, step, built, list, targetY }
})
</script>

<template>
  <svg aria-hidden="true" :viewBox="`0 0 ${MINI.width} ${MINI.height}`" :width="MINI.width" :height="MINI.height" class="mini">
    <rect :x="cx - 16" :y="base" width="32" height="2" rx="1" class="ground" />
    <!-- A missed target sits above the top row even when it falls in that row's blocks, and one far above the tower pins to the top edge. -->
    <line v-if="target !== null" x1="6" :x2="MINI.width - 6" :y1="geo.targetY" :y2="geo.targetY" stroke-dasharray="2 3" class="dim" />
    <g v-for="row in geo.list" :key="row.r">
      <motion.g :style="{ transformBox: 'fill-box', transformOrigin: 'center' }" :initial="reduce ? { opacity: 0 } : { opacity: 0, y: -4 }"
        :animate="row.topple && !reduce
          ? { opacity: [0, 1, 1, 0.7], y: [-4, 0, 0, base - 3 - row.pile * 3.5 - rowY(row.r)], x: [0, 0, 0, 33 + row.pile * 2], rotate: [0, 0, 0, row.pile % 2 ? -3 : 4] }
          : { opacity: 1, y: 0 }"
        :transition="row.topple && !reduce
          ? { duration: 0.3 + 0.45, times: [0, 0.4, 0.5, 1], ease: easeIn, delay: MINI_REPLAY.delay + row.r * geo.step }
          : { ...MINI_LAND, delay: reduce ? 0 : MINI_REPLAY.delay + row.r * geo.step }">
        <!-- Your cash-out row stays blue even when it is among the rows that topple, as it does on the big tower. -->
        <rect :x="row.x" :y="rowY(row.r)" :width="row.w" height="3" rx="1" :class="`row-${row.kind}`" />
        <!-- Inside the row's group, so the pennant falls with it. -->
        <motion.path v-if="row.isCash" :d="`M${row.x - 1},${rowY(row.r) + 1.5}l-6,-3v6z`" class="row-cash" :initial="reduce ? { opacity: 0 } : { opacity: 0, scale: 0.25 }" :animate="{ opacity: 1, scale: 1 }"
          :style="{ transformBox: 'fill-box', transformOrigin: 'right center' }" :transition="{ ...SWAP, delay: geo.built }" />
      </motion.g>
    </g>
  </svg>
</template>

<style scoped>
.mini { flex: none; overflow: visible; }
.ground { fill: color-mix(in oklab, var(--beui-foreground) 30%, transparent); }
.dim { stroke: color-mix(in oklab, var(--beui-muted-foreground) 60%, transparent); }
.row-row { fill: color-mix(in oklab, var(--beui-foreground) 25%, transparent); }
.row-cash { fill: var(--beui-primary); }
.row-lost { fill: #f43f5e; }
.row-fallen { fill: color-mix(in oklab, var(--beui-muted-foreground) 60%, transparent); }
</style>
