<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, inject, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { easeOut, layoutSpring } from '../core/motion'
import { breadcrumbOverflowKey } from './breadcrumb-context'

/** One path entry. Give it a stable route `key` so entering and leaving routes animate; put its optional separator inside. */
defineSlots<{ default?: () => unknown }>()

const reduce = useReducedMotion()
const inOverflow = inject(breadcrumbOverflowKey, false)
const item = shallowRef<{ $el?: unknown } | HTMLElement | null>(null)
function bindItem(element: unknown) { item.value = element as typeof item.value }
const node = computed(() => {
  const value = item.value
  const el = value && '$el' in value ? value.$el : value
  return el instanceof HTMLElement ? el : null
})

// popLayout snapshots offsetWidth (integer pixels). Retain the exact width so a
// fractional-pixel loss cannot wrap the final character of a leaving crumb.
let observer: ResizeObserver | undefined
onMounted(() => {
  const element = node.value
  if (!element || inOverflow) return
  const measure = () => element.style.setProperty('--breadcrumb-exit-width', `${element.getBoundingClientRect().width}px`)
  measure()
  observer = new ResizeObserver(measure)
  observer.observe(element)
})
onBeforeUnmount(() => observer?.disconnect())

const hidden = computed(() => (reduce.value ? { opacity: 0 } : { opacity: 0, y: 6 }))
const shown = { opacity: 1, y: 0 }
const transition = { duration: 0.2, ease: easeOut, layout: layoutSpring }
</script>

<template>
  <li v-if="inOverflow" class="be-crumb-item be-crumb-hidden"><slot /></li>
  <motion.li
    v-else :ref="bindItem"
    :layout="reduce ? false : 'position'" :initial="hidden" :animate="shown" :exit="hidden"
    :transition="transition" class="be-crumb-item">
    <slot />
  </motion.li>
</template>

<style>
.be-crumb-item { position: relative; display: inline-flex; min-width: 0; max-width: 100%; align-items: center; gap: .25rem; }
.be-crumb-item[inert] { pointer-events: none; }
</style>
