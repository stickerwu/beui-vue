<script setup lang="ts">
import { useReducedMotion } from 'motion-v'
import { onMounted, shallowRef, watch } from 'vue'

const { text, duration, glyphs = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$?/' } = defineProps<{ text: string; duration?: number; glyphs?: string }>()
const reduce = useReducedMotion()
const display = shallowRef(text)
onMounted(() => {
  watch([() => text, () => duration, () => glyphs, reduce], (_, __, onCleanup) => {
    const letters = Array.from(text)
    const alphabet = Array.from(glyphs)
    const time = duration ?? Math.min(760, Math.max(420, letters.length * 32))
    if (reduce.value || !alphabet.length || !(time > 0)) { display.value = text; return }
    const start = performance.now()
    let previous = 0
    let frame = requestAnimationFrame(tick)
    function tick(now: number) {
      const progress = (now - start) / time
      if (progress >= 1) { display.value = text; return }
      if (now - previous >= 40) {
        previous = now
        const settled = Math.floor(progress * letters.length)
        display.value = letters.map((letter, index) => index < settled || /\s/.test(letter) ? letter : alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
      }
      frame = requestAnimationFrame(tick)
    }
    onCleanup(() => cancelAnimationFrame(frame))
  })
})
</script>

<template><span class="scramble"><span class="accessible">{{ text }}</span><span aria-hidden="true" data-scramble-output>{{ reduce ? text : display }}</span></span></template>

<style scoped>
.scramble { display: inline-block; white-space: pre; }
.accessible { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
