<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { easeOut, layoutSpring, swapSpring } from '../../core/motion'
import { useComboContext } from './combo-context'
import './combo.css'

/** The chosen options as removable chips, or the placeholder while nothing is chosen. */
defineProps<{
  placeholder?: string
  /** Class for each chip. */
  chipClassName?: string
}>()
defineSlots<{
  /** Chip label. */
  default?(props: { value: string; label: string }): unknown
  /** Placeholder content while nothing is chosen. */
  placeholder?(): unknown
}>()
const INSTANT = { duration: 0 } as const
const context = useComboContext('MultiSelectValue')
const reduce = context.reduce
</script>

<template>
  <div class="be-combo-contents">
    <AnimatePresence :initial="false" mode="popLayout">
      <span v-if="context.values.value.length === 0 && !context.open.value" key="multi-select-placeholder" class="be-combo-placeholder">
        <slot name="placeholder">{{ placeholder ?? context.t('valuePlaceholder') }}</slot>
      </span>
      <motion.span
        v-for="v in context.values.value" :key="`multi-select-value-${v}`" class="be-combo-chip" :class="chipClassName" :layout="reduce ? false : 'position'"
        :initial="{ opacity: 0, clipPath: 'inset(0 0 0 0% round 0.5rem)', transform: reduce ? 'translateY(0px) scale(1)' : 'translateY(6px) scale(0.92)' }"
        :animate="{ opacity: 1, clipPath: 'inset(0 0 0 0% round 0.5rem)', transform: 'translateY(0px) scale(1)' }"
        :exit="{ opacity: 1, clipPath: reduce ? 'inset(0 0 0 0% round 0.5rem)' : 'inset(0 0 0 100% round 0.5rem)', transform: 'translateY(0px) scale(1)', transition: { clipPath: reduce ? INSTANT : { duration: 0.16, ease: easeOut }, transform: INSTANT } }"
        :transition="reduce ? { layout: INSTANT, opacity: { duration: 0.15, ease: easeOut }, transform: INSTANT } : { layout: layoutSpring, opacity: { duration: 0.18, ease: easeOut }, transform: swapSpring }"
      >
        <span class="be-combo-chip-label"><slot :value="v" :label="context.labelFor(v) ?? v">{{ context.labelFor(v) ?? v }}</slot></span>
        <button
          type="button" data-multi-select-remove="" class="be-combo-remove" :aria-label="context.t('removeValue', { label: context.labelFor(v) ?? v })" :disabled="context.disabled.value"
          @pointerdown.stop @click.stop="context.remove(v); context.inputEl.value?.focus({ preventScroll: true })"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </motion.span>
    </AnimatePresence>
  </div>
</template>
