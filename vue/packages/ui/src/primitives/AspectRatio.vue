<script setup lang="ts">
import { motion, mountedStates } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, provide, useTemplateRef, watch } from 'vue'
import { aspectKey, layoutSpring } from './state'

const props = withDefaults(defineProps<{ ratio?: number, animated?: boolean, contentClassName?: string }>(), { ratio: 1, animated: true })
const reduce = useReducedMotion()
const animated = computed(() => props.animated && !reduce.value)
const ratio = computed(() => {
  if (!Number.isFinite(props.ratio) || props.ratio <= 0) throw new RangeError('AspectRatio: ratio must be a finite, positive number.')
  return props.ratio
})
provide(aspectKey, { ratio, animated })

// Vue patches this frame's aspect-ratio before the images inside it re-render,
// and an image snapshots its layout in its own onBeforeUpdate, so it would only
// ever see the resized frame and jump. React measures every layout element
// before any DOM commit; match that by snapshotting the images first.
const frame = useTemplateRef<{ $el: HTMLElement }>('frame')
watch(ratio, () => {
  if (!animated.value) return
  const root = frame.value?.$el
  if (!root?.querySelectorAll) return
  for (const node of root.querySelectorAll<HTMLElement>('.be-aspect-image')) mountedStates.get(node)?.beforeUpdate()
}, { flush: 'pre' })
</script>

<template>
  <motion.div ref="frame" class="be-aspect" :layout="animated" :transition="layoutSpring" :style="{ aspectRatio: ratio }">
    <div class="be-aspect-layer" :class="contentClassName"><slot /></div>
  </motion.div>
</template>

<style scoped>
.be-aspect { position: relative; width: 100%; min-width: 0; overflow: hidden; }
.be-aspect-layer { position: absolute; inset: 0; }
</style>
