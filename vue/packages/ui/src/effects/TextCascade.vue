<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed } from 'vue'
import { easeOut, swapSpring } from '../core/motion'
import { useMountedMedia } from '../core/mounted-media'

/**
 * Letter-by-letter slot roll for standalone text: the old letters drop away as the new ones land, left to right.
 * Same motion as the action-swap cascade variant.
 */
const { text } = defineProps<{ text: string }>()
const reduce = useMountedMedia('(prefers-reduced-motion: reduce)')
const letters = computed(() => Array.from(text))
const ROLL_BLUR = 'blur(3px)'
// The leaving and landing strings overlap as independent layers, so proportional glyph widths never jitter.
// Exits cascade at half the enter stagger so the tail of the old label lingers briefly.
const CASCADE_STAGGER = 0.025
</script>

<template>
  <span class="cascade">
    <span class="size" :aria-hidden="reduce ? undefined : true"><template v-if="reduce">{{ text }}</template><template v-else><span v-for="(letter, index) in letters" :key="index" class="char">{{ letter }}</span></template></span>
    <template v-if="!reduce">
      <!-- Letters are decorative fragments; readers get the whole label. -->
      <span class="accessible">{{ text }}</span>
      <AnimatePresence :initial="false">
        <motion.span :key="`cascade-${text}`" class="layer" aria-hidden="true">
          <motion.span v-for="(letter, index) in letters" :key="index" class="char" :initial="{ opacity: 0, y: '105%', filter: ROLL_BLUR }"
            :animate="{ opacity: 1, y: '0%', filter: 'blur(0px)', transition: { ...swapSpring, delay: index * CASCADE_STAGGER } }"
            :exit="{ opacity: 0, y: '-105%', filter: ROLL_BLUR, transition: { duration: 0.16, ease: easeOut, delay: index * CASCADE_STAGGER * 0.5 } }">{{ letter }}</motion.span>
        </motion.span>
      </AnimatePresence>
    </template>
  </span>
</template>

<style scoped>
.cascade { position: relative; display: inline-block; max-width: 100%; margin-block: -.08em; padding-block: .08em; white-space: nowrap; vertical-align: bottom; clip-path: inset(0 -999px); }
.size { display: inline-block; white-space: nowrap; }
.size[aria-hidden='true'] { visibility: hidden; }
.layer { position: absolute; left: 0; top: .08em; display: inline-block; white-space: pre; will-change: opacity, filter, transform; }
.char { display: inline-block; white-space: pre; }
.accessible { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>
