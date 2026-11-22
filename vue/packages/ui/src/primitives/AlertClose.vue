<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { pressSpring } from '../core/motion'
import { useAlert } from './state'

const { dismiss, dismissLabel } = useAlert()
const reduce = useReducedMotion()
const emit = defineEmits<{ click: [event: MouseEvent] }>()

function activate(event: MouseEvent) {
  emit('click', event)
  if (!event.defaultPrevented) dismiss()
}
</script>

<template>
  <motion.button
    class="be-alert-close"
    data-slot="alert-close"
    type="button"
    :aria-label="dismissLabel"
    :layout="reduce ? false : 'position'"
    :transition="pressSpring"
    :while-press="reduce ? undefined : { scale: .94 }"
    @click="activate"
  >
    <slot>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
    </slot>
  </motion.button>
</template>

<style scoped>
.be-alert-close {
  display: inline-flex; flex: none; align-items: center; justify-content: center; width: 2rem; height: 2rem;
  margin: -.375rem; padding: 0; border: 0; border-radius: .5rem; background: transparent;
  color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1);
}
.be-alert-close:focus-visible { outline: 2px solid var(--beui-ring); }
.be-alert-close:disabled { pointer-events: none; opacity: .5; }
@media (hover: hover) { .be-alert-close:hover { background: color-mix(in oklab, var(--beui-foreground) 5%, transparent); color: var(--beui-foreground); } }
</style>
