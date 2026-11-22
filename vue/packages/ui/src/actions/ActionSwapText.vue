<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { Comment, computed, Text, useSlots, type VNode } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { easeOut, swapSpring } from '../core/motion'

/**
 * The label half of `ActionSwap`: swaps its content when `value` changes. A plain-text default slot
 * can cascade letter by letter; other content and reduced motion fall back to the closest
 * single-element animation (roll for cascade).
 */
const props = withDefaults(defineProps<{
  /** Identity of the current content. Changing it plays the swap. */
  value: string
  animation?: 'blur' | 'roll' | 'cascade'
}>(), { animation: 'blur' })
defineSlots<{
  /** The label. Plain text can cascade letter by letter. */
  default?(): unknown
}>()
const slots = useSlots()
const reduce = useReducedMotion()

// A cascade needs a plain string to split into letters.
function plainLabel(): string | null {
  const nodes = (slots.default?.() ?? []) as VNode[]
  const texts = nodes.filter(node => node.type !== Comment)
  return texts.length > 0 && texts.every(node => node.type === Text) ? texts.map(node => String(node.children ?? '')).join('') : null
}
const label = computed(() => (slots.default ? plainLabel() : null))
const cascade = computed(() => props.animation === 'cascade' && label.value !== null && !reduce.value)
const letters = computed(() => Array.from(label.value ?? ''))
const core = computed<'blur' | 'roll'>(() => (props.animation === 'cascade' ? 'roll' : props.animation))

const SWAP_BLUR = 'blur(2px)'
const ROLL_BLUR = 'blur(3px)'
// Exits cascade at half the enter stagger so the tail of the old label lingers briefly.
const CASCADE_STAGGER = 0.025
const motionFor = computed(() => core.value === 'blur'
  ? {
      initial: { opacity: 0, scale: 0.9, filter: SWAP_BLUR },
      animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: swapSpring },
      exit: { opacity: 0, scale: 0.96, filter: SWAP_BLUR, transition: { duration: 0.16, ease: easeOut } },
    }
  : {
      initial: { opacity: 0, y: '90%', filter: ROLL_BLUR },
      animate: { opacity: 1, y: '0%', filter: 'blur(0px)', transition: swapSpring },
      exit: { opacity: 0, y: '-90%', filter: ROLL_BLUR, transition: { duration: 0.14, ease: easeOut } },
    })
const settled = { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }
</script>

<template>
  <span class="be-swap-text">
    <!-- The sizer reserves the width of the current label; layers sit over it absolutely. -->
    <span aria-hidden="true" class="be-swap-sizer">
      <template v-if="cascade"><span v-for="(char, index) in letters" :key="index" class="be-swap-char">{{ char }}</span></template>
      <slot v-else />
    </span>
    <template v-if="cascade">
      <!-- Letters are decorative fragments; readers get the whole label. -->
      <span class="be-swap-sr">{{ label }}</span>
      <AnimatePresence :initial="false">
        <motion.span :key="`cascade-${value}`" aria-hidden="true" class="be-swap-layer be-swap-cascade">
          <motion.span
            v-for="(char, index) in letters"
            :key="index"
            class="be-swap-char be-swap-letter"
            :initial="{ opacity: 0, y: '105%', filter: ROLL_BLUR }"
            :animate="{ opacity: 1, y: '0%', filter: 'blur(0px)', transition: { ...swapSpring, delay: index * CASCADE_STAGGER } }"
            :exit="{ opacity: 0, y: '-105%', filter: ROLL_BLUR, transition: { duration: 0.16, ease: easeOut, delay: index * CASCADE_STAGGER * 0.5 } }"
          >{{ char }}</motion.span>
        </motion.span>
      </AnimatePresence>
    </template>
    <AnimatePresence v-else :initial="false">
      <motion.span
        :key="`${animation}-${value}`"
        class="be-swap-layer"
        :initial="reduce ? false : motionFor.initial"
        :animate="reduce ? settled : motionFor.animate"
        :exit="reduce ? undefined : motionFor.exit"
      ><slot /></motion.span>
    </AnimatePresence>
  </span>
</template>

<style scoped>
.be-swap-text { position: relative; display: inline-block; max-width: 100%; margin-block: -.08em; padding-block: .08em; white-space: nowrap; vertical-align: bottom; clip-path: inset(0 -999px); }
.be-swap-sizer { display: inline-block; white-space: nowrap; visibility: hidden; }
.be-swap-layer { position: absolute; left: 0; top: .08em; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; will-change: opacity, filter, transform; }
.be-swap-cascade { overflow: visible; white-space: pre; }
.be-swap-char { display: inline-block; white-space: pre; }
.be-swap-letter { will-change: opacity, filter, transform; }
.be-swap-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>
