<script setup lang="ts">
import { motion, useMotionValue, type MotionValue } from 'motion-v'
import { computed, onBeforeUnmount, watch } from 'vue'
import { formatMultiplier } from './game-parts'
import { CARD_HEIGHT, CARD_WIDTH, CENTER_SCALE, FADE_STEP, LOCK, MAX_TURN, MIN_FADE, MIN_SCALE, PITCH, SCALE_STEP, TURN_STEP, face } from './slide-reel'

/**
 * One card. Its turn, size and fade follow its distance from the center, read straight off the
 * reel's offset.
 */
const props = defineProps<{
  multiplier: number
  /** The card's center along the strip, in px. */
  center: number
  x: MotionValue<number>
  wins: boolean
  landed: boolean
  dim: boolean
  reduce: boolean
}>()

function geometry() {
  const distance = (props.x.get() + props.center) / PITCH
  return {
    scale: Math.max(MIN_SCALE, CENTER_SCALE - SCALE_STEP * Math.abs(distance)),
    rotateY: Math.max(-MAX_TURN, Math.min(MAX_TURN, distance * TURN_STEP)),
    opacity: Math.max(MIN_FADE, 1 - FADE_STEP * Math.abs(distance)),
  }
}
const initial = geometry()
const scale = useMotionValue(initial.scale)
const rotateY = useMotionValue(initial.rotateY)
const opacity = useMotionValue(initial.opacity)
function apply() {
  const next = geometry()
  scale.set(next.scale)
  rotateY.set(next.rotateY)
  opacity.set(next.opacity)
}
const stop = props.x.on('change', apply)
// A new round renumbers kept cards; follow the new center without waiting for the next frame of the slide.
watch(() => props.center, apply)
onBeforeUnmount(stop)

const parts = computed(() => {
  const [whole = '', decimals = ''] = formatMultiplier(props.multiplier).replace('×', '').split('.')
  return { whole, decimals }
})
</script>

<template>
  <motion.div class="slide-card-slot" :style="{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px`, scale, rotateY, opacity }">
    <motion.div class="slide-card" :data-face="face(multiplier)" :data-dim="dim || undefined"
      :animate="landed && !reduce ? { scale: [1, 1.08, 1] } : { scale: 1 }" :transition="LOCK">
      <!-- Four or more whole digits (1000x, 12.5K x) drop a size to stay inside the card. -->
      <span class="slide-card-value" :data-long="parts.whole.length >= 4 || undefined">{{ parts.whole }}<span v-if="parts.decimals" class="slide-card-decimals">.{{ parts.decimals }}</span><span class="slide-card-times">×</span></span>
      <span v-if="wins" class="slide-card-pip" />
    </motion.div>
  </motion.div>
</template>

<style scoped>
.slide-card-slot { flex: none; }
.slide-card { position: relative; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; border-radius: 12px; font-variant-numeric: tabular-nums;
  /* A flat face: a hairline, one lit top edge and a soft drop give it depth. */
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / .12), inset 0 1px 0 rgb(255 255 255 / .3), 0 12px 24px -10px rgb(0 0 0 / .6); transition: opacity .2s cubic-bezier(0, 0, .2, 1); }
.slide-card[data-dim] { opacity: .55; }
/* Cards are physical objects, so they keep their colours in both themes. */
.slide-card[data-face='cool'] { background: #3f3f46; color: #fff; }
.slide-card[data-face='warm'] { background: var(--beui-primary); color: var(--beui-primary-foreground); }
.slide-card[data-face='hot'] { background: #fbbf24; color: #451a03; }
.slide-card[data-face='jackpot'] { background: #c026d3; color: #fff; }
.slide-card-value { font-size: 20px; line-height: 1; font-weight: 700; letter-spacing: -.025em; }
.slide-card-value[data-long] { font-size: 16px; }
.slide-card-decimals, .slide-card-times { font-size: .7em; }
.slide-card-times { margin-left: 2px; opacity: .7; }
.slide-card-pip { position: absolute; bottom: 10px; width: 20px; height: 4px; border-radius: 999px; background: currentColor; opacity: .6; }
</style>
