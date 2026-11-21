<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { onBeforeUnmount, onMounted, provide, shallowRef, toRef, useSlots, useTemplateRef } from 'vue'
import IslandSlot from './IslandSlot.vue'
import { viewKey } from './island-view'

const props = defineProps<{
  /** Active view id. `null` shows the compact pill. */
  view: string | null
  /** Compact pill content, shown when no view is active (or use the `compact` slot). */
  compact?: string
  className?: string
}>()

defineSlots<{
  compact?(): unknown
  default?(props: { view: string | null }): unknown
}>()

// Shell physics in Apple's duration/bounce form: one long perceptual glide with
// barely-there bounce, identical in both directions. The shell animates real
// width/height (not transforms), so slots are never scale-distorted.
const SHELL_SPRING = { type: 'spring', duration: 0.8, bounce: 0.2 } as const
// Constant radius — never animated. The browser clamps it to half the shell
// height, so the pill-to-rounded-rect morph falls out of the resize for free.
const RADIUS = 32
// iPhone pill dimensions; also the shell's pre-measure target, so a view that is
// already active in the first commit blooms from the pill.
const PILL_WIDTH = 126
const PILL_HEIGHT = 37

provide(viewKey, toRef(() => props.view))
const reduce = useReducedMotion()
const slots = useSlots()
const sizer = useTemplateRef<HTMLDivElement>('sizer')
const size = shallowRef<{ width: number; height: number } | null>(null)

let observer: ResizeObserver | undefined
function measure() {
  const element = sizer.value
  if (element) size.value = { width: element.offsetWidth, height: element.offsetHeight }
}
// Synchronous mount measure: the shell must own explicit dimensions before the
// first interaction; the observer only follows later changes.
onMounted(() => {
  measure()
  if (sizer.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(sizer.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <motion.div
    role="status"
    aria-live="polite"
    class="be-island"
    :class="className"
    :initial="false"
    :animate="size ? { width: size.width, height: size.height } : { width: PILL_WIDTH, height: PILL_HEIGHT }"
    :transition="reduce ? { duration: 0 } : SHELL_SPRING"
    :style="{ borderRadius: `${RADIUS}px` }">
    <!-- max-content keeps this at the natural size of the active content; the shell springs toward it. -->
    <div ref="sizer" class="be-island-sizer">
      <AnimatePresence mode="popLayout" :initial="false">
        <IslandSlot v-if="view === null && (slots.compact || compact)" key="compact" class="be-island-compact">
          <slot name="compact">{{ compact }}</slot>
        </IslandSlot>
      </AnimatePresence>
      <slot :view="view" />
    </div>
  </motion.div>
</template>

<style scoped>
/* items-start pins content to the top edge while the shell springs, so expansion
   reads as unfurling downward out of the pill. */
.be-island { position: relative; display: inline-flex; box-sizing: border-box; align-items: flex-start; justify-content: center; overflow: hidden; background: var(--beui-foreground); color: var(--beui-background); box-shadow: 0 25px 50px -12px rgb(0 0 0 / .25); font-size: 1rem; line-height: 1.5; }
.be-island-sizer { width: max-content; }
.be-island-compact { box-sizing: border-box; min-width: 126px; min-height: 37px; gap: .5rem; padding: .375rem 1rem; font-size: .75rem; line-height: 1.33333; font-weight: 500; }
.be-island :deep(.be-island-view) { box-sizing: border-box; padding: 1rem 1.5rem; }
</style>
