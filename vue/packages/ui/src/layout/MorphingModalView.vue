<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { easeOut } from '../core/motion'
import PresenceGate from './PresenceGate.vue'

/**
 * One view of a `MorphingModal`. The view id is a prop, so the instance that
 * `AnimatePresence` keeps for the exit still renders the view it was made for
 * while the next one comes in.
 */
defineProps<{ view: string }>()
const reduce = useReducedMotion()
</script>

<template>
  <!-- The motion element is the direct child so popLayout can lift the outgoing
       view out of flow; otherwise both views stack for the exit and the panel
       briefly grows to their combined height. -->
  <PresenceGate v-slot="{ isPresent }">
    <motion.div :data-view="view"
      :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(4px)' }"
      :animate="reduce
        ? { opacity: 1, transition: { duration: 0.18, ease: easeOut } }
        : { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.24, ease: easeOut } }"
      :exit="reduce
        ? { opacity: 0, transition: { duration: 0.14, ease: easeOut } }
        : { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.16, ease: easeOut } }">
      <!-- The outgoing view stays for its exit; inert keeps the trap and assistive
           technology on the incoming one. -->
      <div :inert="!isPresent"><slot :view="view" /></div>
    </motion.div>
  </PresenceGate>
</template>
