<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { formatMultiplier, EXIT, heat, type GameHistoryEntry, type Heat } from './game-parts'
import { layoutSpring } from '../core/motion'
import './game-parts.css'

/** Recent rounds, newest first, sliding in from the left and coloured by heat. */
const { history, reduce = false, tier = heat, label, emptyLabel } = defineProps<{
  history: GameHistoryEntry[]
  reduce?: boolean
  /** Pill colour per value. Default `heat`; return "jackpot" to mark a top tier. */
  tier?: (value: number) => Heat | 'jackpot'
  /** Accessible name of the list. */
  label: string
  /** Shown before the first round, e.g. "Recent rounds show here". */
  emptyLabel: string
}>()
</script>

<template>
  <ul class="gp-history" :aria-label="label">
    <AnimatePresence :initial="false" mode="popLayout">
      <motion.li v-if="history.length === 0" key="empty" class="gp-history-empty" :initial="false" :animate="{ opacity: 1 }" :exit="{ opacity: 0, transition: EXIT }">{{ emptyLabel }}</motion.li>
      <motion.li v-for="entry in history" v-else :key="entry.id" class="gp-pill" :data-tier="tier(entry.value)" :layout="!reduce"
        :initial="reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, x: -8 }" :animate="{ opacity: 1, scale: 1, x: 0 }" :exit="{ opacity: 0, transition: EXIT }"
        :transition="reduce ? { duration: 0.15 } : layoutSpring">{{ formatMultiplier(entry.value) }}</motion.li>
    </AnimatePresence>
  </ul>
</template>
