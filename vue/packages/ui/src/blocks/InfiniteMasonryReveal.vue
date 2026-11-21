<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { onMounted } from 'vue'
import { easeOut, panelSpring } from '../core/motion'

/**
 * Reveals one masonry item the first time it mounts after the initial fill.
 * `revealedKeys` lives outside the component so a recycled item — one that
 * scrolled out of the window and back in — does not replay the entrance.
 */
const props = defineProps<{
  itemKey: string
  lane: number
  revealedKeys: Set<string>
  animate: boolean
}>()

const reduce = useReducedMotion()
// Resolved once, at mount: an item that is already known stays put.
const initialReveal = props.animate && !props.revealedKeys.has(props.itemKey)
const delay = Math.min(props.lane, 3) * 0.04
const transition = {
  y: { ...panelSpring, delay },
  opacity: { duration: 0.2, ease: easeOut, delay },
}

onMounted(() => { props.revealedKeys.add(props.itemKey) })
</script>

<template>
  <motion.div class="masonry-reveal"
    :initial="initialReveal && !reduce ? { opacity: 0, y: 12 } : false"
    :animate="initialReveal && !reduce ? { opacity: 1, y: 0 } : undefined"
    :transition="reduce ? { duration: 0 } : transition">
    <slot />
  </motion.div>
</template>

<style scoped>
.masonry-reveal { will-change: transform, opacity; }
</style>
