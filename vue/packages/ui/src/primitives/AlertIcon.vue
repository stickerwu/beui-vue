<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { easeOut } from '../core/motion'
import { useAlert } from './state'

const { variant } = useAlert()
const reduce = useReducedMotion()
</script>

<template>
  <span class="be-alert-icon" aria-hidden="true" data-slot="alert-icon">
    <AnimatePresence :initial="false" mode="popLayout">
      <motion.span
        :key="variant"
        class="be-alert-glyph"
        :initial="{ opacity: 0, transform: reduce ? 'translateY(0px) scale(1)' : 'translateY(4px) scale(.9)' }"
        :animate="{ opacity: 1, transform: 'translateY(0px) scale(1)' }"
        :exit="{ opacity: 0, transform: reduce ? 'translateY(0px) scale(1)' : 'translateY(-4px) scale(.9)', transition: { duration: .1, ease: easeOut } }"
        :transition="{ duration: .18, ease: easeOut }"
      >
        <slot>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <template v-if="variant === 'success'">
              <path d="M21.8 10A10 10 0 1 1 17 3.34" /><path d="m9 11 3 3L22 4" />
            </template>
            <template v-else-if="variant === 'warning'">
              <path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3" />
              <path d="M12 9v4m0 4h.01" />
            </template>
            <template v-else-if="variant === 'destructive'">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
            </template>
            <template v-else>
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" />
            </template>
          </svg>
        </slot>
      </motion.span>
    </AnimatePresence>
  </span>
</template>

<style scoped>
.be-alert-icon { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 1rem; height: 1rem; margin-top: .125rem; }
.be-alert-glyph { display: inline-flex; }
.be-alert-glyph :deep(svg) { width: 1rem; height: 1rem; }
</style>
