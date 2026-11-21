<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import Tooltip from '../controls/Tooltip.vue'
import { easeOut, swapSpring } from '../core/motion'
import GameIcon from './GameIcon.vue'
import type { GameIconName } from './game-icons'
import './game-parts.css'

/** An icon button that shows and toggles one on/off setting (sound, peg flash): a 40px secondary round button with a tooltip. */
defineProps<{ on: boolean; label: string; onIcon: GameIconName; offIcon: GameIconName }>()
const emit = defineEmits<{ toggle: [] }>()
const reduce = useReducedMotion()
const exit = { duration: 0.14, ease: easeOut }
</script>

<template>
  <span class="gp-toggle" :data-on="on">
    <Tooltip toolbar side="top" :content="label" :label="label" :pressed="on" @activate="emit('toggle')">
      <span class="gp-sound-icon">
        <AnimatePresence mode="popLayout" :initial="false">
          <motion.span :key="on ? 'on' : 'off'" aria-hidden="true" :initial="reduce ? false : { opacity: 0, y: 12, filter: 'blur(3px)' }"
            :animate="reduce ? { opacity: 1, filter: 'blur(0px)', y: 0 } : { opacity: 1, y: 0, filter: 'blur(0px)', transition: swapSpring }"
            :exit="reduce ? undefined : { opacity: 0, y: -12, filter: 'blur(3px)', transition: exit }">
            <GameIcon :name="on ? onIcon : offIcon" :size="16" />
          </motion.span>
        </AnimatePresence>
      </span>
    </Tooltip>
  </span>
</template>
