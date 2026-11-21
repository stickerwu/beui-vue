<script setup lang="ts">
import { motion } from 'motion-v'
import { easeOut } from '../core/motion'

/** The dimmed layer over the board: tapping it puts the result ticket away. Interaction releases in the commit that starts the exit (PresenceGate's contract), while the fade keeps playing. */
defineProps<{ label: string; /** From PresenceGate: releases interaction in the commit that starts the exit. */ gate: { inert: boolean; style: { pointerEvents: string } } }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <motion.button type="button" class="scrim" :aria-label="label" :inert="gate.inert || undefined" :style="gate.style"
    :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0, transition: { duration: 0.15, ease: easeOut } }" :transition="{ duration: 0.2, ease: easeOut }" @click="emit('close')" />
</template>

<style scoped>
.scrim { position: absolute; inset: 0; z-index: 20; padding: 0; border: 0; border-radius: 24px; outline: none; cursor: default; background: color-mix(in srgb, var(--beui-background) 55%, transparent); backdrop-filter: blur(2px); }
.scrim:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
</style>
