<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onMounted, onBeforeUnmount, shallowRef, useId, watch } from 'vue'
import { easeOut, swapSpring } from '../core/motion'
import TextScramble from '../effects/TextScramble.vue'
import Loader from '../layout/Loader.vue'
import type { Labels } from './shared'

const CASCADE_STAGGER = 0.025
const props = withDefaults(defineProps<{ phrases?: string[], variant?: 'cascade' | 'swap' | 'scramble', interval?: number, shimmerDuration?: number, labels?: Labels }>(), { variant: 'cascade', interval: 1800, shimmerDuration: 2.2 })
const reduce = useReducedMotion()
const index = shallowRef(0)
const statusId = useId()
const safePhrases = computed(() => props.phrases?.length ? props.phrases : [props.labels?.phraseThinking ?? 'Thinking', props.labels?.phraseReading ?? 'Reading the context', props.labels?.phraseConnecting ?? 'Connecting the details', props.labels?.phraseForming ?? 'Forming a response'])
const phrase = computed(() => safePhrases.value[index.value % safePhrases.value.length])
const longest = computed(() => safePhrases.value.reduce((best, current) => current.length > best.length ? current : best))
const shimmerStyle = computed(() => ({ '--rt-dur': `${props.shimmerDuration}s` }))
const characters = computed(() => Array.from(`${phrase.value}…`))

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  watch([() => props.interval, () => safePhrases.value.length], ([interval, count], _, cleanup) => {
    if (count < 2) return
    timer = setInterval(() => { index.value = (index.value + 1) % count }, Math.max(600, interval))
    cleanup(() => clearInterval(timer))
  }, { immediate: true })
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <span class="rt" role="status" aria-live="polite" :aria-labelledby="statusId">
    <span aria-hidden="true" class="rt-indicator"><slot name="indicator"><Loader variant="ascii-line" :size="14" :speed="0.8" :label="labels?.reasoning ?? 'Reasoning'" /></slot></span>
    <span aria-hidden="true" class="rt-stage">
      <span class="rt-measure">{{ longest }}…</span>
      <template v-if="variant === 'cascade'">
        <span v-if="reduce" class="rt-phrase rt-shimmer" style="white-space:pre" :style="shimmerStyle">{{ phrase }}…</span>
        <AnimatePresence v-else :initial="false">
          <motion.span :key="phrase" class="rt-phrase" style="white-space:pre" initial="initial" animate="animate" exit="exit">
            <motion.span
              v-for="(character, position) in characters" :key="position" class="rt-char rt-shimmer" :style="shimmerStyle"
              :initial="{ opacity: 0, y: '100%' }"
              :animate="{ opacity: 1, y: '0%', transition: { ...swapSpring, delay: position * CASCADE_STAGGER } }"
              :exit="{ opacity: 0, y: '-100%', transition: { duration: 0.14, ease: easeOut, delay: position * CASCADE_STAGGER * 0.45 } }"
            >{{ character }}</motion.span>
          </motion.span>
        </AnimatePresence>
      </template>
      <TextScramble v-else-if="variant === 'scramble'" :text="`${phrase}…`" class="rt-phrase rt-shimmer rt-tabular" :style="shimmerStyle" />
      <AnimatePresence v-else :initial="false">
        <motion.span
          :key="phrase" class="rt-phrase rt-shimmer" style="white-space:nowrap" :style="shimmerStyle"
          :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 3 }" :animate="reduce ? { opacity: 1 } : { opacity: 1, y: 0 }" :exit="reduce ? { opacity: 0 } : { opacity: 0, y: -3 }"
          :transition="{ duration: reduce ? 0.12 : 0.2, ease: easeOut }"
        >{{ phrase }}…</motion.span>
      </AnimatePresence>
    </span>
    <span :id="statusId" class="rt-sr">{{ phrase }}</span>
  </span>
</template>

<style scoped>
.rt { display: inline-flex; align-items: center; gap: .5rem; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-muted-foreground); }
.rt-indicator { display: inline-flex; width: .75rem; height: .75rem; flex: none; align-items: center; justify-content: center; }
.rt-stage { display: grid; overflow: hidden; text-align: left; }
.rt-measure { visibility: hidden; grid-column: 1; grid-row: 1; white-space: nowrap; }
.rt-phrase { grid-column: 1; grid-row: 1; justify-self: start; display: inline-block; }
.rt-char { display: inline-block; white-space: pre; will-change: opacity, transform; }
.rt-tabular { font-variant-numeric: tabular-nums; }
.rt-shimmer { background-size: 200% 100%; background-clip: text; -webkit-background-clip: text; color: transparent; animation: rt-shimmer var(--rt-dur, 2.2s) linear infinite; background-image: linear-gradient(110deg, var(--beui-muted-foreground) 30%, var(--beui-foreground) 50%, var(--beui-muted-foreground) 70%); }
.rt-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
@keyframes rt-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .rt-shimmer { animation: none !important; } }
</style>
