<script setup lang="ts">
import { animate, useReducedMotion } from 'motion-v'
import { computed, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useVisibility } from './in-view'

const { prefix, words, colors, foregroundColor = 'var(--beui-foreground)', duration = 1.2, delay = 0, pauseDuration = .8, loop = true, startOnView = true, once = true, inViewMargin, paused = false } = defineProps<{
  prefix: string; words: readonly string[]; colors?: readonly string[]; foregroundColor?: string; duration?: number; delay?: number
  pauseDuration?: number; loop?: boolean; startOnView?: boolean; once?: boolean; inViewMargin?: string; paused?: boolean
}>()
const root = useTemplateRef('root')
const word = useTemplateRef('word')
const index = shallowRef(0)
const reduce = useReducedMotion()
const entered = useVisibility(root, () => ({ once, amount: .4, margin: inViewMargin }))
const active = computed(() => words[index.value % words.length] ?? '')
const sizing = computed(() => [...new Set(words)])
const gradient = computed(() => {
  const palette = colors?.length ? colors : ['#60a5fa', '#818cf8', '#c084fc', '#fb7185', '#fbbf24']
  const stops = palette.map((color, step) => {
    const offset = palette.length === 1 ? 0 : -14 + 28 * step / (palette.length - 1)
    return `${color} calc(var(--sweep) ${offset < 0 ? '-' : '+'} ${Math.abs(offset)}%)`
  })
  return `linear-gradient(90deg, ${foregroundColor} 0%, ${foregroundColor} calc(var(--sweep) - 14%), ${stops.join(', ')}, transparent calc(var(--sweep) + 14%), transparent 100%)`
})
onMounted(() => {
  watch([word, active, reduce, entered, () => [startOnView, paused, delay, duration, pauseDuration, loop, words.length]], (_, __, cleanup) => {
    const element = word.value
    if (!element) return
    if (reduce.value || paused) { element.style.setProperty('--sweep', '114%'); return }
    element.style.setProperty('--sweep', '-14%')
    if (startOnView && !entered.value) return
    let timer: number | undefined
    const animation = animate(-14, 114, {
      duration: Math.max(0, duration), delay: Math.max(0, delay), ease: [.77, 0, .175, 1],
      onUpdate: position => element.style.setProperty('--sweep', `${position}%`),
      onComplete: () => {
        if (words.length > 1 && (loop || index.value < words.length - 1)) {
          timer = window.setTimeout(() => { index.value = (index.value + 1) % words.length }, Math.max(0, pauseDuration) * 1000)
        }
      },
    })
    cleanup(() => { animation.stop(); window.clearTimeout(timer) })
  }, { immediate: true, flush: 'post' })
})
</script>
<template>
  <span ref="root" class="chromatic"><span>{{ prefix }}{{ words.length ? '\u00a0' : '' }}</span>
    <span v-if="words.length" class="sizer"><span v-for="size in sizing" :key="size" class="measure" aria-hidden="true">{{ size }}</span>
      <span :key="index" ref="word" class="word" :style="{ backgroundImage: gradient, '--ink': foregroundColor }">{{ active }}</span>
    </span>
  </span>
</template>
<style scoped>
.chromatic { display: inline-flex; align-items: baseline; white-space: nowrap; } .sizer { display: inline-grid; }
.measure, .word { grid-area: 1 / 1; } .measure { visibility: hidden; }
.word { --sweep: 114%; background-clip: text; background-repeat: no-repeat; color: transparent; contain: paint; }
@media (prefers-reduced-motion: no-preference) { .word { animation: chromatic-in .36s cubic-bezier(.16,1,.3,1); } }
@keyframes chromatic-in { from { transform: translateY(5px); filter: blur(6px); opacity: .56; } }
@media (forced-colors: active) { .word { color: CanvasText; } }
</style>
