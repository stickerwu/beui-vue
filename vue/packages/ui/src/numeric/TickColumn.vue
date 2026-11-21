<script setup lang="ts">
import { animate, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { easeOut } from '../core/motion'

/**
 * One digit cell of `NumberTicker`: a clipped column holding 0-9 that rolls to
 * the digit's place. The blur settle is a separate `animate()` call so it can
 * own the node's `filter` without fighting the transform animation.
 */
const props = defineProps<{
  digit: number
  delay?: number
  duration?: number
  blur?: boolean
}>()

const height = 1.1
const digits = Array.from({ length: 10 }, (_, n) => n)
const reduce = useReducedMotion()
const column = useTemplateRef<{ $el: HTMLElement }>('column')
let controls: ReturnType<typeof animate> | undefined

watch(
  () => [props.digit, props.delay, props.blur, props.duration, reduce.value] as const,
  () => {
    controls?.stop()
    const node = column.value?.$el
    if (reduce.value || !props.blur || !node || !Number.isFinite(props.digit)) return
    // A short settle on top of the roll, not a second full-length transition.
    controls = animate(node, { filter: ['blur(10px)', 'blur(0px)'] }, {
      duration: Math.min((props.duration ?? .9) * .75, .32),
      delay: props.delay ?? 0,
      ease: easeOut,
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  controls?.stop()
  const node = column.value?.$el
  if (node) node.style.filter = 'blur(0px)'
})
</script>

<template>
  <motion.span ref="column" class="be-ticker-column" :initial="{ y: 0 }"
    :animate="{ y: `-${props.digit * height}em` }"
    :transition="reduce ? { duration: 0 } : { duration: props.duration ?? .9, delay: props.delay ?? 0, ease: easeOut }">
    <span v-for="n in digits" :key="n" class="be-ticker-cell">{{ n }}</span>
  </motion.span>
</template>

<style scoped>
.be-ticker-column { position: absolute; inset-inline: 0; top: 0; display: flex; flex-direction: column; align-items: center; will-change: transform, filter; }
.be-ticker-cell { display: flex; height: 1.1em; align-items: center; justify-content: center; line-height: 1; }
</style>
