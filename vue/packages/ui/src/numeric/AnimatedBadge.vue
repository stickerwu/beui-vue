<script lang="ts">
export type AnimatedBadgeStatus = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'loading'
export type AnimatedBadgeSize = 'sm' | 'md'

/** English defaults for `AnimatedBadge`. Only the loading spinner is announced. */
export const animatedBadgeMessages = {
  loading: 'Loading',
  status: '{status}',
}
export type AnimatedBadgeMessages = typeof animatedBadgeMessages
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, useSlots } from 'vue'
import { easeOut, layoutSpring, swapSpring } from '../core/motion'

const props = withDefaults(defineProps<{
  status?: AnimatedBadgeStatus
  size?: AnimatedBadgeSize
  icon?: string
  showIcon?: boolean
  pulse?: boolean
  contentKey?: string | number
  className?: string
  labels?: Partial<AnimatedBadgeMessages>
}>(), { status: 'neutral', size: 'md', showIcon: true, pulse: undefined })
const slots = useSlots()
const reduce = useReducedMotion()
const status = computed(() => props.status)
const pulse = computed(() => props.pulse ?? status.value === 'loading')
// `0` is a real label; booleans and "" from conditional callers are not and
// must not reserve the gap and an empty slot.
const hasLabel = computed(() => Boolean(slots.default))
const resolvedContentKey = computed(() => props.contentKey ?? status.value)

// Lucide glyphs, one entry per element so they match the upstream icons exactly
// ('circle' is the r=10 outline used by neutral and info).
const ICONS: Record<AnimatedBadgeStatus, string[]> = {
  neutral: ['circle'],
  info: ['circle', 'M12 16v-4', 'M12 8h.01'],
  success: ['M20 6 9 17l-5-5'],
  warning: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
  danger: ['M18 6 6 18', 'm6 6 12 12'],
  loading: ['M21 12a9 9 0 1 1-6.219-8.56'],
}

// Status swaps roll like the action-swap primitives: leaving glyphs slide up and
// out while the next ones slide in from below. Both fade from fully transparent
// through a light blur so the label never reads as a solid smudge on the badge,
// and the exit outruns the entry.
const ROLL_EXIT_TRANSITION = { duration: .14, ease: easeOut }
const ROLL_BLUR = 'blur(3px)'
const iconRoll = {
  initial: { opacity: 0, y: 12, filter: ROLL_BLUR },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: swapSpring },
  exit: { opacity: 0, y: -12, filter: ROLL_BLUR, transition: ROLL_EXIT_TRANSITION },
}
const textRoll = {
  initial: { opacity: 0, y: '90%', filter: ROLL_BLUR },
  animate: { opacity: 1, y: '0%', filter: 'blur(0px)', transition: swapSpring },
  exit: { opacity: 0, y: '-90%', filter: ROLL_BLUR, transition: ROLL_EXIT_TRANSITION },
}
// Reduced motion swaps in place: the next content lands at rest and the leaving
// content hides on its first frame instead of overlapping it.
const REST = { opacity: 1, y: 0, filter: 'blur(0px)' }
const REST_EXIT = { opacity: 0, transition: { duration: 0 } }
const slotLayout = computed(() => (reduce.value ? false : 'position'))

const iconMotion = computed(() => (reduce.value
  ? { initial: false, animate: REST, exit: REST_EXIT }
  : { initial: 'initial', animate: 'animate', exit: 'exit' }))
const textMotion = computed(() => iconMotion.value)
</script>

<template>
  <motion.span
    class="be-animated-badge"
    :class="[`be-animated-badge-${size}`, className]"
    :data-status="status"
    :layout="!reduce"
    :transition="reduce ? undefined : layoutSpring"
  >
    <!-- The pulse breathes through opacity alone. Scaling this layer would
         shrink it inside the pill and open a ring between fill and border. -->
    <motion.span
      v-if="pulse && !reduce"
      aria-hidden="true"
      class="be-animated-badge-pulse"
      :initial="{ opacity: .06 }"
      :animate="{ opacity: [.06, .18, .06] }"
      :transition="{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }"
    />
    <!-- The badge animates its width with a scale transform. Slots opt into
         position-only layout so motion counter-scales them and the glyphs keep
         their shape while the pill stretches around them. -->
    <motion.span
      v-if="showIcon"
      class="be-animated-badge-icon"
      :layout="slotLayout"
      :transition="reduce ? undefined : layoutSpring"
    >
      <AnimatePresence mode="popLayout" :initial="false">
        <motion.span
          :key="status"
          v-bind="iconMotion"
          :variants="iconRoll"
          class="be-animated-badge-glyph"
        >
          <span class="be-animated-badge-spoken">{{ status === 'loading' ? labels?.loading ?? animatedBadgeMessages.loading : '' }}</span>
          <template v-if="status === 'loading'">
            <motion.span
              v-if="!icon && !reduce"
              class="be-animated-badge-spinner"
              :animate="{ rotate: 360 }"
              :transition="{ duration: 1, repeat: Infinity, ease: 'linear' }"
            >
              <svg viewBox="0 0 24 24" class="be-animated-badge-svg" aria-hidden="true"><path :d="ICONS.loading[0]" /></svg>
            </motion.span>
            <template v-else>
              <slot name="icon"><svg viewBox="0 0 24 24" class="be-animated-badge-svg" aria-hidden="true"><path v-if="icon" :d="icon" /><path v-else :d="ICONS.loading[0]" /></svg></slot>
            </template>
          </template>
          <template v-else>
            <slot name="icon">
              <svg viewBox="0 0 24 24" class="be-animated-badge-svg" aria-hidden="true">
                <path v-if="icon" :d="icon" />
                <template v-else><template v-for="part in ICONS[status]" :key="part"><circle v-if="part === 'circle'" cx="12" cy="12" r="10" /><path v-else :d="part" /></template></template>
              </svg>
            </slot>
          </template>
        </motion.span>
      </AnimatePresence>
    </motion.span>
    <motion.span
      v-if="hasLabel"
      class="be-animated-badge-label"
      :layout="slotLayout"
      :transition="reduce ? undefined : layoutSpring"
    >
      <AnimatePresence mode="popLayout" :initial="false">
        <motion.span :key="resolvedContentKey" v-bind="textMotion" :variants="textRoll" class="be-animated-badge-label-text">
          <slot />
        </motion.span>
      </AnimatePresence>
    </motion.span>
  </motion.span>
</template>

<style scoped>
.be-animated-badge {
  position: relative; display: inline-flex; flex-shrink: 0; align-items: center; overflow: hidden;
  white-space: nowrap; border-radius: 999px; border: 1px solid var(--beui-border);
  background: var(--beui-card); color: var(--beui-muted-foreground);
  font-weight: 500; font-variant-numeric: tabular-nums;
  transition: color .3s, background-color .3s, border-color .3s;
}
.be-animated-badge-sm { height: 1.5rem; gap: .375rem; padding: 0 .5rem; font-size: 11px; }
.be-animated-badge-md { height: 2rem; gap: .5rem; padding: 0 .75rem; font-size: .75rem; }
.be-animated-badge[data-status=info], .be-animated-badge[data-status=loading] { border-color: color-mix(in srgb, var(--beui-primary) 30%, transparent); background: var(--beui-muted); color: var(--beui-primary); }
/* Tailwind v4 emerald / amber / the site's danger token, as the upstream classes resolve them. */
.be-animated-badge[data-status=success] { border-color: oklch(.696 .17 162.48 / .3); background: oklch(.696 .17 162.48 / .1); color: oklch(.596 .145 163.225); }
.be-animated-badge[data-status=warning] { border-color: oklch(.769 .188 70.08 / .3); background: oklch(.769 .188 70.08 / .1); color: oklch(.666 .179 58.318); }
.be-animated-badge[data-status=danger] { border-color: oklch(.62 .22 25 / .3); background: oklch(.62 .22 25 / .1); color: oklch(.62 .22 25); }
:global(.dark .be-animated-badge[data-status=success]) { color: oklch(.765 .177 163.223); }
:global(.dark .be-animated-badge[data-status=warning]) { color: oklch(.828 .189 84.429); }
.be-animated-badge-pulse { position: absolute; inset: 0; border-radius: 999px; background: currentColor; pointer-events: none; }
.be-animated-badge-icon { position: relative; z-index: 10; display: inline-grid; flex-shrink: 0; place-items: center; overflow: hidden; }
.be-animated-badge-spoken { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.be-animated-badge-glyph { position: relative; grid-column-start: 1; grid-row-start: 1; display: inline-flex; align-items: center; justify-content: center; }
.be-animated-badge-spinner { display: inline-flex; }
.be-animated-badge-svg { width: .875rem; height: .875rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.be-animated-badge-sm .be-animated-badge-svg { width: .75rem; height: .75rem; }
.be-animated-badge-label { position: relative; z-index: 10; display: inline-flex; clip-path: inset(0 -999px); }
.be-animated-badge-label-text { display: inline-block; }
@media (prefers-reduced-motion: reduce) { .be-animated-badge { transition: none; } }
</style>
