<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue'
import { useReducedMotion } from 'motion-v'
import type { Labels } from './shared'
const props = withDefaults(defineProps<{ phrases?: string[], variant?: 'cascade' | 'swap' | 'scramble', interval?: number, shimmerDuration?: number, labels?: Labels }>(), { variant: 'cascade', interval: 2400, shimmerDuration: 1.8 })
const reduce = useReducedMotion()
const index = shallowRef(0)
const scramble = shallowRef('')
const phrases = computed(() => props.phrases?.length ? props.phrases : [props.labels?.phraseThinking ?? 'Thinking', props.labels?.phraseReading ?? 'Reading the context', props.labels?.phraseConnecting ?? 'Connecting the details', props.labels?.phraseForming ?? 'Forming a response'])
const phrase = computed(() => `${phrases.value[index.value % phrases.value.length]}…`)
onMounted(() => {
  watch(() => [props.interval, phrases.value] as const, (_, __, clean) => {
    index.value = 0
    const timer = setInterval(() => { index.value = (index.value + 1) % phrases.value.length }, Math.max(250, props.interval))
    clean(() => clearInterval(timer))
  }, { immediate: true })
  watch([phrase, () => props.variant, reduce], ([target, variant, reduced], _, clean) => {
    if (variant !== 'scramble' || reduced) { scramble.value = target; return }
    let revealed = 0
    const glyphs = '░▒/+≡<>*'
    const timer = setInterval(() => {
      revealed += 2
      scramble.value = Array.from(target, (char, position) => position < revealed || char === ' ' ? char : glyphs[(position + revealed) % glyphs.length]).join('')
      if (revealed >= target.length) clearInterval(timer)
    }, 26)
    clean(() => clearInterval(timer))
  }, { immediate: true })
})
</script>
<template><span class="be-reason" role="status" :aria-label="labels?.reasoning ?? 'Reasoning'" :style="{ '--be-shimmer-time': `${shimmerDuration}s` }"><span class="be-reason-mark" aria-hidden="true"><slot name="indicator">✳</slot></span><span :key="phrase" aria-hidden="true" :class="`be-reason-${variant}`"><template v-if="variant === 'cascade'"><i v-for="(char, position) in [...phrase]" :key="position" :style="{ animationDelay: `${position * 14}ms` }">{{ char }}</i></template><template v-else>{{ variant === 'scramble' ? (scramble || phrase) : phrase }}</template></span></span></template>
<style scoped>.be-reason{display:inline-flex;align-items:center;gap:.55rem;color:var(--beui-muted-foreground);font:500 .875rem/1.5 system-ui}.be-reason-mark{animation:be-reason-spin var(--be-shimmer-time) linear infinite}.be-reason-cascade i{display:inline-block;white-space:pre;font-style:normal;animation:be-reason-rise .26s ease-out both}.be-reason-swap{animation:be-reason-rise .28s ease-out}.be-reason-scramble{font-family:ui-monospace,monospace}@keyframes be-reason-rise{from{opacity:0;transform:translateY(4px)}}@keyframes be-reason-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.be-reason :is(i,span){animation:none}}</style>
