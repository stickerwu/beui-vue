<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { shallowRef } from 'vue'
import { useMountedMedia } from '../core/mounted-media'
import { easeOut, layoutSpring, pressSpring } from '../core/motion'

const props = defineProps<{
  disabled?: boolean
  className?: string
  accentClassName?: string
  labelClassName?: string
}>()

// Arrow glyphs fade down the row: the accent chip fills with repeated dotted
// chevrons that are nearly opaque at the left and fade out to the right.
const ARROW_OPACITY = [1, .78, .54, .32, .16] as const
const reduce = useReducedMotion()
// Touch devices fire a sticky phantom hover; only a real pointer may expand it.
const canHover = useMountedMedia('(hover: hover) and (pointer: fine)')
const hovered = shallowRef(false)
const focused = shallowRef(false)
const active = () => !props.disabled && ((canHover.value && hovered.value) || focused.value)
</script>

<template>
  <motion.button
    type="button"
    :disabled="disabled"
    class="be-arrow-button"
    :class="className"
    :while-press="reduce || disabled ? undefined : { scale: .97 }"
    :transition="pressSpring"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focus="focused = true"
    @blur="focused = false"
  >
    <!-- The accent pill grows from a 52px chip to fill the button. Layout size
         keeps the corners and the inner row registered while it stretches. -->
    <motion.span
      layout="size"
      aria-hidden="true"
      class="be-arrow-accent"
      :class="accentClassName"
      :style="{ width: active() ? 'calc(100% - 12px)' : '52px', borderRadius: '16px' }"
      :transition="reduce ? { duration: 0 } : layoutSpring"
    >
      <motion.span
        class="be-arrow-glyph"
        :animate="{ opacity: active() ? 0 : 1 }"
        :transition="{ duration: reduce ? 0 : .1, ease: easeOut }"
      >
        <svg viewBox="0 0 20 28" fill="none" aria-hidden="true" class="be-arrow-chevron">
          <circle cx="4" cy="4" r="2" fill="currentColor" /><circle cx="10" cy="9" r="2" fill="currentColor" />
          <circle cx="16" cy="14" r="2" fill="currentColor" /><circle cx="10" cy="19" r="2" fill="currentColor" />
          <circle cx="4" cy="24" r="2" fill="currentColor" />
        </svg>
      </motion.span>
      <span class="be-arrow-row">
        <motion.span
          v-for="(opacity, index) in ARROW_OPACITY"
          :key="opacity"
          class="be-arrow-cell"
          :animate="{ opacity: active() ? 1 : 0, transform: active() && !reduce ? 'translateX(0px)' : 'translateX(-6px)' }"
          :transition="{
            duration: reduce ? 0 : .18,
            delay: active() && !reduce ? .04 + index * .025 : 0,
            ease: easeOut,
          }"
          :style="{ color: `rgb(10 10 10 / ${opacity})` }"
        >
          <svg viewBox="0 0 20 28" fill="none" aria-hidden="true" class="be-arrow-chevron">
            <circle cx="4" cy="4" r="2" fill="currentColor" /><circle cx="10" cy="9" r="2" fill="currentColor" />
            <circle cx="16" cy="14" r="2" fill="currentColor" /><circle cx="10" cy="19" r="2" fill="currentColor" />
            <circle cx="4" cy="24" r="2" fill="currentColor" />
          </svg>
        </motion.span>
      </span>
    </motion.span>
    <motion.span
      class="be-arrow-label"
      :class="labelClassName"
      :animate="{ opacity: active() ? 0 : 1, transform: active() && !reduce ? 'translateX(6px)' : 'translateX(0px)' }"
      :transition="{ duration: reduce ? 0 : .12, ease: easeOut }"
    >
      <slot />
    </motion.span>
  </motion.button>
</template>

<style scoped>
.be-arrow-button {
  position: relative; display: inline-flex; align-items: center; box-sizing: border-box;
  height: 4rem; min-width: 18rem; overflow: hidden; border: 0; border-radius: 22px; padding: .375rem;
  background: #0a0a0a; color: #fff; font: inherit; cursor: pointer; user-select: none; outline: none;
}
.be-arrow-button:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px #bef264; }
.be-arrow-button:disabled { pointer-events: none; opacity: .5; }
.be-arrow-accent {
  position: absolute; inset-block: .375rem; inset-inline-start: .375rem; z-index: 10;
  overflow: hidden; background: #bef264; color: #0a0a0a;
}
.be-arrow-glyph { position: absolute; inset: 0; display: grid; place-items: center; }
.be-arrow-row { position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-around; padding-inline: .75rem; }
.be-arrow-cell { display: inline-grid; place-items: center; }
.be-arrow-chevron { width: 1.25rem; height: 1.75rem; }
.be-arrow-label {
  position: relative; z-index: 0; margin-inline-start: 76px; margin-inline-end: 1.25rem;
  white-space: nowrap; font-size: 1.125rem; font-weight: 500; letter-spacing: -.02em;
}
</style>
