<script setup lang="ts">
import { AnimatePresence, motion, useReducedMotion } from 'motion-v'
import { easeOut } from '../core/motion'

const { text } = defineProps<{ text: string }>()
const reduce = useReducedMotion()
const letters = {
  initial: { y: '-85%', opacity: 0, filter: 'blur(3px)' },
  shown: { y: '0%', opacity: 1, filter: 'blur(0px)' },
  exit: { y: '85%', opacity: 0, filter: 'blur(3px)' },
}
</script>
<template>
  <span class="cascade"><span class="size" :aria-hidden="reduce ? undefined : true">{{ text }}</span>
    <template v-if="!reduce"><span class="accessible">{{ text }}</span>
      <AnimatePresence :initial="false"><motion.span :key="text" class="layer" aria-hidden="true" initial="initial" animate="shown" exit="exit"
        :variants="{ initial: {}, shown: { transition: { staggerChildren: .025 } }, exit: { transition: { staggerChildren: .0125 } } }">
        <motion.span v-for="(letter, index) of Array.from(text)" :key="index" class="letter" :variants="letters" :transition="{ duration: .28, ease: easeOut }">{{ letter }}</motion.span>
      </motion.span></AnimatePresence>
    </template>
  </span>
</template>
<style scoped>
.cascade { position: relative; display: inline-grid; overflow: hidden; vertical-align: bottom; white-space: pre; } .size,.layer { grid-area: 1 / 1; } .size[aria-hidden=true] { visibility: hidden; } .layer { position: absolute; inset: 0 auto auto 0; } .letter { display: inline-block; white-space: pre; }
.accessible { position: absolute; width: 1px; height: 1px; clip-path: inset(50%); overflow: hidden; }
</style>
