<script setup lang="ts">
import { motion, usePresence } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { easeOut, layoutSpring } from '../core/motion'
import { useAlert } from './state'

/**
 * The animated alert surface. It reads presence from the alert's context
 * instead of taking it as a prop, because `AnimatePresence` retains the leaving
 * vnode: bindings on a retained vnode are frozen, while this component's own
 * render still runs, so the gate flips in the same commit the exit starts.
 */
const { open, variant, isPresent, surfaceId, dismiss, setOpen } = useAlert()
const reduce = useReducedMotion()
const contentClass = defineProps<{ contentClassName?: string }>()
</script>

<template>
  <motion.div
    class="be-alert"
    data-slot="alert"
    :data-alert-id="surfaceId"
    :role="variant === 'warning' || variant === 'destructive' ? 'alert' : 'status'"
    :data-variant="variant"
    :data-state="isPresent ? 'open' : 'closed'"
    :inert="isPresent ? undefined : true"
    :aria-hidden="isPresent ? undefined : 'true'"
    :initial="{ opacity: 0, transform: reduce ? 'none' : 'translateY(-6px)' }"
    :animate="{ opacity: 1, transform: 'none' }"
    :exit="{ opacity: 0, transform: reduce ? 'none' : 'translateY(-6px)', transition: { duration: .12, ease: easeOut } }"
    :layout="!reduce"
    :transition="{ opacity: { duration: .18, ease: easeOut }, transform: { duration: .2, ease: easeOut }, layout: layoutSpring }"
    :style="{ pointerEvents: isPresent ? 'auto' : 'none', transformOrigin: '50% 0' }"
  >
    <motion.div class="be-alert-row" :class="contentClass" :layout="reduce ? false : 'position'" :transition="{ layout: layoutSpring }">
      <slot :open="open" :variant="variant" :dismiss="dismiss" :set-open="setOpen" />
    </motion.div>
  </motion.div>
</template>
