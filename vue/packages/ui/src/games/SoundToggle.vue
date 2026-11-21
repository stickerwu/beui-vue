<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import Tooltip from '../controls/Tooltip.vue'
import GameIcon from './GameIcon.vue'
import { swapSpring } from '../core/motion'
import { easeOut } from '../core/motion'
import './game-parts.css'

/** The sound toggle: a quiet 32px icon button in a game card's header. */
defineProps<{ on: boolean; /** The button's name and tooltip, e.g. "Sound". */ label: string }>()
const emit = defineEmits<{ toggle: [] }>()
const reduce = useReducedMotion()
const exit = { duration: 0.14, ease: easeOut }
</script>

<template>
  <span class="gp-sound" :data-on="on">
    <Tooltip toolbar side="top" :content="label" :label="label" :pressed="on" @activate="emit('toggle')">
      <span class="gp-sound-icon">
        <AnimatePresence mode="popLayout" :initial="false">
          <motion.span :key="on ? 'on' : 'off'" aria-hidden="true" :initial="reduce ? false : { opacity: 0, y: 12, filter: 'blur(3px)' }"
            :animate="reduce ? { opacity: 1, filter: 'blur(0px)', y: 0 } : { opacity: 1, y: 0, filter: 'blur(0px)', transition: swapSpring }"
            :exit="reduce ? undefined : { opacity: 0, y: -12, filter: 'blur(3px)', transition: exit }">
            <GameIcon :name="on ? 'Volume2' : 'VolumeX'" :size="16" />
          </motion.span>
        </AnimatePresence>
      </span>
    </Tooltip>
  </span>
</template>
