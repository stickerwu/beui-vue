<script setup lang="ts">
/** The roll text swap (upstream `ActionSwapRollText`): the old label rolls up and out, the new one rolls in. */
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed } from 'vue'
import { easeOut, swapSpring } from '../core/motion'
const props = defineProps<{ value: string | number }>()
const reduce = useReducedMotion()
const BLUR = 'blur(3px)'
const initial = computed(() => reduce.value ? false : { opacity: 0, y: '90%', filter: BLUR })
const animate = computed(() => ({ opacity: 1, y: '0%', filter: 'blur(0px)', transition: reduce.value ? { duration: 0 } : swapSpring }))
const exit = computed(() => reduce.value ? undefined : { opacity: 0, y: '-90%', filter: BLUR, transition: { duration: 0.14, ease: easeOut } })
</script>
<template>
  <span class="be-roll"><span aria-hidden="true" class="be-roll-ghost"><slot /></span><AnimatePresence :initial="false"><motion.span :key="`roll-${props.value}`" class="be-roll-layer" :initial="initial" :animate="animate" :exit="exit"><slot /></motion.span></AnimatePresence></span>
</template>
<style scoped>
.be-roll { position: relative; display: inline-block; max-width: 100%; margin-block: -0.08em; padding-block: 0.08em; white-space: nowrap; vertical-align: bottom; clip-path: inset(0 -999px); }
.be-roll-ghost { visibility: hidden; display: inline-block; white-space: nowrap; }
.be-roll-layer { position: absolute; left: 0; top: 0.08em; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; will-change: opacity, filter, transform; }
</style>
