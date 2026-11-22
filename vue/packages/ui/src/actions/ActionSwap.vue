<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, shallowRef, useSlots } from 'vue'
import { easeOut, layoutSpring, pressSpring, swapSpring } from '../core/motion'

export type ActionSwapItem = { id: string; label: string; ariaLabel?: string }

export interface ActionSwapProps {
  items: readonly ActionSwapItem[]
  modelValue?: string
  defaultValue?: string
  animation?: 'blur' | 'roll' | 'cascade'
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  cycle?: boolean
  iconOnly?: boolean
  disabled?: boolean
}
const props = withDefaults(defineProps<ActionSwapProps>(), { animation: 'blur', variant: 'secondary', size: 'md', cycle: true, iconOnly: undefined, disabled: false })
const emit = defineEmits<{ 'update:modelValue': [value: string]; valueChange: [value: string, item: ActionSwapItem] }>()
const slots = useSlots()

const reduce = useReducedMotion()
const internal = shallowRef(props.defaultValue ?? props.items[0]?.id)
const activeIndex = computed(() => Math.max(0, props.items.findIndex(item => item.id === (props.modelValue ?? internal.value))))
const current = computed(() => props.items[activeIndex.value] ?? props.items[0])
const next = computed(() => (props.cycle && props.items.length > 0 ? props.items[(activeIndex.value + 1) % props.items.length] : undefined))
const hasIcon = computed(() => Boolean(slots.icon))
const iconOnly = computed(() => props.iconOnly ?? props.size === 'icon')
const label = computed(() => current.value?.ariaLabel ?? (iconOnly.value ? current.value?.label : undefined))

// The arriving layer springs in, so a second press mid-swap bends it toward the
// new target instead of restarting. The leaving layer is a little quicker, still
// long enough to cross the arrival so the swap reads as one morph.
const blurExit = { duration: 0.16, ease: easeOut } as const
const rollExit = { duration: 0.14, ease: easeOut } as const
// A light blur softens the crossing without smearing small glyphs.
const SWAP_BLUR = 'blur(2px)'
const ROLL_BLUR = 'blur(3px)'
// Cascade rolls the label one letter at a time; exits cascade at half the enter
// stagger so the tail of the old label lingers briefly.
const CASCADE_STAGGER = 0.025

// Cascade needs a plain string to split into letters; reduced motion falls back
// to the closest single-element animation, exactly as the original does.
const cascade = computed(() => props.animation === 'cascade' && !reduce.value)
const core = computed<'blur' | 'roll'>(() => (props.animation === 'cascade' ? 'roll' : props.animation))
const letters = computed(() => Array.from(current.value?.label ?? ''))

const textMotion = computed(() => core.value === 'blur'
  ? {
      initial: { opacity: 0, scale: 0.9, filter: SWAP_BLUR },
      animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: swapSpring },
      exit: { opacity: 0, scale: 0.96, filter: SWAP_BLUR, transition: blurExit },
    }
  : {
      initial: { opacity: 0, y: '90%', filter: ROLL_BLUR },
      animate: { opacity: 1, y: '0%', filter: 'blur(0px)', transition: swapSpring },
      exit: { opacity: 0, y: '-90%', filter: ROLL_BLUR, transition: rollExit },
    })
const iconMotion = computed(() => core.value === 'blur'
  ? {
      initial: { opacity: 0, scale: 0.25, filter: SWAP_BLUR },
      animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: swapSpring },
      exit: { opacity: 0, scale: 0.25, filter: SWAP_BLUR, transition: blurExit },
    }
  : {
      initial: { opacity: 0, y: 12, filter: ROLL_BLUR },
      animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: swapSpring },
      exit: { opacity: 0, y: -12, filter: ROLL_BLUR, transition: rollExit },
    })
const settled = { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }
const layoutTransition = computed(() => (reduce.value ? { duration: 0 } : layoutSpring))

function activate() {
  const item = next.value
  if (props.disabled || !props.cycle || !item) return
  if (props.modelValue === undefined) internal.value = item.id
  emit('update:modelValue', item.id)
  emit('valueChange', item.id, item)
}
</script>

<template>
  <!-- A label of a different length resizes the button: glide the width on the soft
       layout spring, and only when the value changes, so unrelated page reflow never
       animates the button. -->
  <motion.button
    v-if="current"
    type="button"
    class="be-swap"
    :data-variant="variant"
    :data-size="size"
    :disabled="disabled"
    :aria-label="label"
    layout
    :layout-dependency="current.id"
    :while-press="reduce || disabled ? undefined : { scale: 0.97 }"
    :transition="{ ...pressSpring, layout: layoutTransition }"
    :style="{ borderRadius: '9999px' }"
    @click="activate"
  >
    <!-- Position-only layout keeps the contents from stretching with the button while its width glides. -->
    <motion.span v-if="hasIcon" layout="position" :layout-dependency="current.id" :transition="layoutTransition" class="be-swap-slot">
      <span class="be-swap-icon">
        <AnimatePresence mode="popLayout" :initial="false">
          <motion.span
            :key="`${animation}-${current.id}`"
            aria-hidden="true"
            class="be-swap-glyph"
            :initial="reduce ? false : iconMotion.initial"
            :animate="reduce ? settled : iconMotion.animate"
            :exit="reduce ? undefined : iconMotion.exit"
          ><slot name="icon" :item="current" /></motion.span>
        </AnimatePresence>
      </span>
    </motion.span>
    <motion.span v-if="!iconOnly" layout="position" :layout-dependency="current.id" :transition="layoutTransition" class="be-swap-slot be-swap-text-slot">
      <span class="be-swap-text">
        <span aria-hidden="true" class="be-swap-sizer">
          <template v-if="cascade"><span v-for="(char, index) in letters" :key="index" class="be-swap-char">{{ char }}</span></template>
          <slot v-else :item="current">{{ current.label }}</slot>
        </span>
        <template v-if="cascade">
          <!-- Letters are decorative fragments; readers get the whole label. -->
          <span class="be-swap-sr">{{ current.label }}</span>
          <AnimatePresence :initial="false">
            <motion.span :key="`cascade-${current.id}`" aria-hidden="true" class="be-swap-layer be-swap-cascade">
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
            :key="`${animation}-${current.id}`"
            class="be-swap-layer"
            :initial="reduce ? false : textMotion.initial"
            :animate="reduce ? settled : textMotion.animate"
            :exit="reduce ? undefined : textMotion.exit"
          ><slot :item="current">{{ current.label }}</slot></motion.span>
        </AnimatePresence>
      </span>
    </motion.span>
  </motion.button>
</template>

<style scoped>
.be-swap { box-sizing: border-box; display: inline-flex; flex: none; align-items: center; justify-content: center; height: 2.5rem; gap: .5rem; padding: 0 1rem; overflow: hidden; border: 0; font: inherit; font-size: .875rem; line-height: 1.25rem; font-weight: 500; white-space: nowrap; user-select: none; cursor: pointer; transition: background-color .15s, color .15s, border-color .15s; }
.be-swap:disabled { pointer-events: none; opacity: .5; }
.be-swap[data-variant=primary] { background: var(--beui-primary); color: var(--beui-primary-foreground); }
.be-swap[data-variant=secondary] { background: var(--beui-card); color: var(--beui-foreground); border: 1px solid var(--beui-border); }
.be-swap[data-variant=outline] { background: transparent; color: var(--beui-foreground); border: 1px solid var(--beui-border); }
.be-swap[data-variant=ghost] { background: transparent; color: var(--beui-muted-foreground); }
.be-swap[data-size=sm] { height: 2rem; gap: .375rem; padding: 0 .75rem; font-size: .75rem; line-height: 1rem; }
.be-swap[data-size=lg] { height: 3rem; gap: .625rem; padding: 0 1.25rem; font-size: 1rem; line-height: 1.5rem; }
.be-swap[data-size=icon] { width: 2.5rem; padding: 0; }
@media (hover: hover) {
  .be-swap[data-variant=primary]:hover { background: color-mix(in srgb, var(--beui-primary) 90%, transparent); }
  .be-swap:is([data-variant=ghost], [data-variant=outline]):hover { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); }
  .be-swap[data-variant=ghost]:hover { color: var(--beui-foreground); }
}
.be-swap-slot { display: inline-flex; flex: none; }
.be-swap-text-slot { min-width: 0; max-width: 100%; }
.be-swap-icon { position: relative; display: inline-grid; flex: none; place-items: center; width: 1rem; height: 1rem; overflow: hidden; }
.be-swap-glyph { grid-area: 1 / 1; display: inline-flex; align-items: center; justify-content: center; will-change: opacity, filter, transform; }
.be-swap-glyph :deep(svg) { width: 1rem; height: 1rem; flex: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
/* The sizer reserves the width of the current label; layers sit over it absolutely. */
.be-swap-text { position: relative; display: inline-block; max-width: 100%; margin-block: -.08em; padding-block: .08em; white-space: nowrap; vertical-align: bottom; clip-path: inset(0 -999px); }
.be-swap-sizer { display: inline-block; white-space: nowrap; visibility: hidden; }
.be-swap-layer { position: absolute; left: 0; top: .08em; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; will-change: opacity, filter, transform; }
.be-swap-cascade { overflow: visible; white-space: pre; }
.be-swap-char { display: inline-block; white-space: pre; }
.be-swap-letter { will-change: opacity, filter, transform; }
.be-swap-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>
