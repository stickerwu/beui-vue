<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed } from 'vue'
import GameIcon from './GameIcon.vue'
import { EXIT, SWAP, type EyebrowState } from './game-parts'
import './game-parts.css'

/** The small uppercase state label over a readout, with a live dot while a round plays and a check or cross once it ends. */
const { label, state, reduce = false } = defineProps<{
  label: string
  /** `live` shows the dot; `won` and `lost` show a check or cross and tint the label. */
  state: EyebrowState
  reduce?: boolean
}>()
const icon = computed(() => (state === 'idle' ? null : state))
</script>

<template>
  <p class="gp-eyebrow" :data-state="state">
    <AnimatePresence :initial="false" mode="popLayout">
      <motion.span v-if="icon" :key="icon" class="gp-eyebrow-icon" aria-hidden="true"
        :initial="reduce ? { opacity: 0 } : { opacity: 0, scale: 0.25, filter: 'blur(4px)' }" :animate="{ opacity: 1, scale: 1, filter: 'blur(0px)' }" :exit="{ opacity: 0, transition: EXIT }" :transition="SWAP">
        <span v-if="icon === 'live'" class="gp-eyebrow-dot" />
        <GameIcon v-else-if="icon === 'won'" name="Check" :size="14" :stroke-width="3" />
        <GameIcon v-else name="X" :size="14" :stroke-width="3" />
      </motion.span>
    </AnimatePresence>
    <span class="gp-eyebrow-text">{{ label }}</span>
  </p>
</template>
