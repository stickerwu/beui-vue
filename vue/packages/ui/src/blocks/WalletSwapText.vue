<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed } from 'vue'
import { easeOut, swapSpring } from '../core/motion'

/**
 * Text that swaps with a per-letter cascade (`ActionSwapText` with `animation="cascade"` in the
 * original): the leaving and landing strings overlap as independent layers, so proportional
 * glyph widths never jitter. Reduced motion falls back to a single roll.
 */
const props = defineProps<{ value: string, text: string }>()
const reduce = useReducedMotion()
const letters = computed(() => Array.from(props.text))
const CASCADE_STAGGER = 0.025
const settled = { opacity: 1, filter: 'blur(0px)', y: 0 }
</script>

<template>
  <span class="be-swaptext">
    <span aria-hidden="true" class="be-swaptext-sizer"><span v-for="(char, index) in letters" :key="index" class="be-swaptext-char">{{ char }}</span></span>
    <template v-if="!reduce">
      <!-- Letters are decorative fragments; readers get the whole label. -->
      <span class="be-swaptext-sr">{{ text }}</span>
      <AnimatePresence :initial="false">
        <motion.span :key="`cascade-${value}`" aria-hidden="true" class="be-swaptext-layer">
          <motion.span
            v-for="(char, index) in letters" :key="index" class="be-swaptext-char be-swaptext-letter"
            :initial="{ opacity: 0, y: '105%', filter: 'blur(3px)' }"
            :animate="{ opacity: 1, y: '0%', filter: 'blur(0px)', transition: { ...swapSpring, delay: index * CASCADE_STAGGER } }"
            :exit="{ opacity: 0, y: '-105%', filter: 'blur(3px)', transition: { duration: 0.16, ease: easeOut, delay: index * CASCADE_STAGGER * 0.5 } }"
          >{{ char }}</motion.span>
        </motion.span>
      </AnimatePresence>
    </template>
    <AnimatePresence v-else :initial="false">
      <motion.span :key="`roll-${value}`" aria-hidden="true" class="be-swaptext-layer" :initial="false" :animate="settled">{{ text }}</motion.span>
    </AnimatePresence>
  </span>
</template>

<style scoped>
.be-swaptext { position: relative; display: inline-block; max-width: 100%; margin-block: -.08em; padding-block: .08em; white-space: nowrap; vertical-align: bottom; clip-path: inset(0 -999px); }
.be-swaptext-sizer { display: inline-block; visibility: hidden; white-space: nowrap; }
.be-swaptext-char { display: inline-block; white-space: pre; }
.be-swaptext-layer { position: absolute; top: .08em; left: 0; display: inline-block; white-space: pre; }
.be-swaptext-letter { will-change: opacity, filter, transform; }
.be-swaptext-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
