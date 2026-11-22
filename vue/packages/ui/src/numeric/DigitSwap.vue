<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed } from 'vue'
import { easeOut } from '../core/motion'

export type DigitSwapDirection = 'up' | 'down'

const props = defineProps<{
  /** Numeric or masked value rendered in fixed character slots. */
  value: string | number
  /** Replays every glyph when the value itself contains unchanged characters. */
  animationKey?: string | number
  /** Direction the next glyph enters from. */
  direction?: DigitSwapDirection
  /** Per-glyph transition duration in seconds. */
  duration?: number
  /** Delay in seconds between neighbouring glyphs. */
  stagger?: number
  /** Number of final characters that receive `suffixClassName`. */
  suffixLength?: number
  className?: string
  glyphClassName?: string
  suffixClassName?: string
}>()
const { duration = .18, stagger = .006, suffixLength = 0 } = props
const reduceMotion = useReducedMotion() ?? computed(() => false)
const reduce = computed(() => Boolean(reduceMotion.value))

const text = computed(() => String(props.value))
const suffixStart = computed(() => Math.max(0, text.value.length - Math.max(0, suffixLength)))

const glyphs = computed(() =>
  Array.from(text.value, (character, position) => ({ character, id: `glyph-${position}`, position })),
)

/**
 * The slots clip with `clip-path`, which — unlike `overflow: hidden` — leaves
 * the text baseline alone. An invisible in-flow copy of each character gives
 * the slot its natural width (punctuation) or a fixed 1ch cell (digits).
 */
type GlyphMotionContext = { direction: DigitSwapDirection; reduceMotion: boolean }
// The leaving glyph is kept from its last render, so its direction travels as `custom`: the exit
// then follows the direction at the time of the change, not the one it was rendered with.
const GLYPH_VARIANTS = {
  enter: ({ direction, reduceMotion }: GlyphMotionContext) => ({
    opacity: 0,
    transform: reduceMotion ? 'none' : `translateY(${direction === 'up' ? '45%' : '-45%'})`,
  }),
  visible: { opacity: 1, transform: 'translateY(0%)' },
  exit: ({ direction, reduceMotion }: GlyphMotionContext) => ({
    opacity: 0,
    transform: reduceMotion ? 'none' : `translateY(${direction === 'up' ? '-45%' : '45%'})`,
  }),
}
const motionContext = computed<GlyphMotionContext>(() => ({ direction: props.direction ?? 'up', reduceMotion: reduce.value }))

function glyphKey(glyph: { id: string; character: string }) {
  return props.animationKey === undefined ? `${glyph.id}-${glyph.character}` : `${glyph.id}-${glyph.character}-${props.animationKey}`
}
function glyphTransition(glyph: { position: number }) {
  return {
    duration: reduce.value ? Math.min(duration, .12) : duration,
    delay: reduce.value ? 0 : glyph.position * stagger,
    ease: easeOut,
  }
}
</script>

<template>
  <span class="be-digit-swap" :class="className" :data-direction="direction ?? 'up'">
    <span class="be-digit-swap-spoken">{{ text }}</span>
    <span aria-hidden="true" class="be-digit-swap-row">
      <template v-for="glyph in glyphs" :key="glyph.id">
        <span v-if="glyph.character === ' '" class="be-digit-swap-space" />
        <span
          v-else
          class="be-digit-swap-glyph"
          :class="/\d/.test(glyph.character) && 'be-digit-swap-digit'"
        >
          <span class="be-digit-swap-reserve">{{ glyph.character }}</span>
          <AnimatePresence :initial="false" :custom="motionContext">
            <motion.span
              :key="glyphKey(glyph)"
              class="be-digit-swap-glyph-text"
              :class="[glyphClassName, glyph.position >= suffixStart ? suffixClassName : undefined]"
              :custom="motionContext"
              :variants="GLYPH_VARIANTS"
              initial="enter"
              animate="visible"
              exit="exit"
              :transition="glyphTransition(glyph)"
            >
              {{ glyph.character }}
            </motion.span>
          </AnimatePresence>
        </span>
      </template>
    </span>
  </span>
</template>

<style scoped>
.be-digit-swap { display: inline-flex; align-items: baseline; white-space: nowrap; }
.be-digit-swap-spoken { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.be-digit-swap-row { display: inline-flex; align-items: baseline; }
.be-digit-swap-space { display: inline-block; width: .7ch; }
.be-digit-swap-glyph { position: relative; display: inline-block; height: 1.1em; flex: none; line-height: 1.1em; clip-path: inset(0); }
.be-digit-swap-digit { width: 1ch; text-align: center; }
.be-digit-swap-reserve { visibility: hidden; }
.be-digit-swap-glyph-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; line-height: 1; }
</style>
