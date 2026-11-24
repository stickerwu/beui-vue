/**
 * Recipe source for the Motion guide, written for Vue 3 and motion-v with the
 * beui-vue tokens. Each mirrors the beui.dev recipe of the same key.
 */
export const recipeCode = {
  press: `import { motion } from 'motion-v'
import { pressSpring, useReducedMotion } from 'beui-vue'

const reduce = useReducedMotion()

<motion.button
  :while-press="reduce ? undefined : { scale: 0.97 }"
  :transition="pressSpring"
>
  Continue
</motion.button>`,
  icon: `const reduce = useReducedMotion()
const canHover = useMediaQuery('(hover: hover) and (pointer: fine)')

<motion.span
  :style="{ transformOrigin: 'top center' }"
  :animate="active && canHover && !reduce
    ? { rotate: [0, 12, -8, 4, 0] }
    : { rotate: 0 }"
  :transition="{ duration: 0.28, ease: easeOut }"
>
  <Bell />
</motion.span>`,
  reveal: `const reduce = useReducedMotion()

<motion.div
  :initial="{
    opacity: 0,
    transform: reduce ? 'none' : 'translateY(8px)',
    filter: reduce ? 'none' : 'blur(4px)',
  }"
  :animate="{
    opacity: 1,
    transform: 'translateY(0px)',
    filter: 'blur(0px)',
  }"
  :transition="{ duration: 0.22, ease: easeOut }"
/>`,
  layout: `<motion.div layout :transition="CONTINUITY_SPRING">
  <motion.button layout :transition="CONTINUITY_SPRING">
    <motion.span layout="position">
      <PanelTopOpen />
    </motion.span>

    <AnimatePresence mode="popLayout" :initial="false">
      <motion.span
        v-if="expanded"
        layout
        :variants="CONTINUITY_LABEL"
        initial="hidden"
        animate="visible"
        exit="exit"
        :transition="CONTINUITY_SPRING"
      >
        Open panel
      </motion.span>
    </AnimatePresence>
  </motion.button>
</motion.div>`,
  swap: `<AnimatePresence mode="wait" :initial="false">
  <motion.div
    :key="tab"
    :initial="{ opacity: 0, transform: 'translateY(4px)' }"
    :animate="{ opacity: 1, transform: 'translateY(0px)' }"
    :exit="{
      opacity: 0,
      transform: 'translateY(-4px)',
      transition: { duration: 0.12, ease: easeOut },
    }"
    :transition="{ duration: 0.18, ease: easeOut }"
  />
</AnimatePresence>`,
}

export const accessibilityCode = `const reduce = useReducedMotion()

const hidden = computed(() => ({
  opacity: 0,
  transform: reduce.value ? 'none' : 'translateY(8px)',
}))

const visible = {
  opacity: 1,
  transform: 'translateY(0px)',
}`
