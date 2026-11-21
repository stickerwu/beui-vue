<script setup lang="ts">
import { motion } from 'motion-v'
import { easeOut } from '../core/motion'

/** Centres the result ticket over the board. Never takes pointer events itself, so a tap anywhere reaches the scrim below. */
defineProps<{ label: string; reduce: boolean; gate: { inert: boolean } }>()
// Rises with a little settle (a rare, end-of-round moment), leaves quickly.
const CARD_IN = { type: 'spring', duration: 0.4, bounce: 0.15 } as const
const CARD_OUT = { duration: 0.15, ease: easeOut } as const
</script>

<template>
  <motion.div class="layer" :inert="gate.inert || undefined"
    :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
    :exit="reduce ? { opacity: 0, transition: CARD_OUT } : { opacity: 0, y: 8, scale: 0.98, transition: CARD_OUT }" :transition="reduce ? { duration: 0.2 } : CARD_IN">
    <div role="group" :aria-label="label" class="ticket-wrap"><slot /></div>
  </motion.div>
</template>

<style scoped>
.layer { position: absolute; inset: 0; z-index: 20; display: grid; place-items: center; padding: 16px; pointer-events: none; }
/* A drop-shadow on the ticket's wrapper: the notch mask would clip a box-shadow on the ticket itself. */
.ticket-wrap { width: 100%; max-width: 17rem; filter: drop-shadow(0 1px 1px rgb(0 0 0 / .12)) drop-shadow(0 12px 16px rgb(0 0 0 / .3)); }
</style>
