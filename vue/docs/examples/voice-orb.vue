<script setup lang="ts">
import { VoiceOrb, useReducedMotion } from 'beui-vue'
import { useAnimationFrame, useMotionValue } from 'motion-v'

const activity = useMotionValue(0)
const reduce = useReducedMotion()
useAnimationFrame(time => {
  if (reduce.value) { activity.set(0); return }
  // Simulated syllables and pauses demonstrate activity without opening audio.
  const t = time / 1000
  const phrase = Math.max(0, Math.sin(t * 0.85))
  const syllable = Math.max(0, Math.sin(t * 9.3 + Math.sin(t * 2.1)))
  activity.set(phrase * (0.12 + syllable ** 2 * 0.72))
})
</script>

<template>
  <VoiceOrb :activity="activity" aria-label="Voice visualization" class="voice-orb-demo" />
</template>

<style scoped>
.voice-orb-demo.voice-orb-demo { width: 16rem; }
@media (min-width: 640px) { .voice-orb-demo.voice-orb-demo { width: 18rem; } }
</style>
