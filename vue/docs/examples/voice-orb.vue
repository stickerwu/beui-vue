<script setup lang="ts">
import { VoiceOrb } from 'beui-vue'
import { useAnimationFrame, useMotionValue, useReducedMotion } from 'motion-v'
const activity = useMotionValue(0)
const reduce = useReducedMotion()
useAnimationFrame(time => {
  const seconds = time / 1000
  const syllable = Math.max(0, Math.sin(seconds * 9.3 + Math.sin(seconds * 2.1)))
  activity.set(reduce.value ? 0 : Math.max(0, Math.sin(seconds * .85)) * (.12 + syllable ** 2 * .72))
})
</script>
<template><VoiceOrb :activity="activity" aria-label="Voice visualization" /></template>
