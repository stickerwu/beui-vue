<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { easeOut, layoutSpring, pressSpring } from '../core/motion'

defineProps<{ type: 'radio' | 'checkbox', checked: boolean, label: string, name?: string, value?: string, description?: string, disabled?: boolean, group?: string }>()
const emit = defineEmits<{ change: [checked: boolean] }>()
const reduce = useReducedMotion()
</script>
<template>
  <label class="be-choice" :data-description="description ? '' : undefined" :data-disabled="disabled || undefined">
    <input class="be-choice-input" :type="type" :name="name" :value="value" :checked="checked" :disabled="disabled" @change="emit('change', ($event.target as HTMLInputElement).checked)" />
    <motion.span class="be-choice-box" :data-type="type" :data-checked="checked || undefined" aria-hidden="true" :while-press="reduce || disabled ? undefined : { scale: 0.92 }" :transition="pressSpring">
      <svg v-if="type === 'checkbox'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <motion.path tabindex="-1" d="M5 13l4 4L19 7" :initial="false" :animate="{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }" :transition="reduce ? { duration: 0 } : { duration: 0.3, ease: easeOut }" />
      </svg>
      <motion.span v-else-if="checked" class="be-choice-dot" :layout-id="reduce ? undefined : `${group}-dot`" :transition="reduce ? { duration: 0 } : layoutSpring" />
    </motion.span>
    <span class="be-choice-text">
      <span class="be-choice-label">{{ label }}</span>
      <span v-if="description" class="be-choice-desc">{{ description }}</span>
    </span>
  </label>
</template>
<style scoped>
.be-choice { position: relative; display: flex; box-sizing: border-box; min-height: 2.25rem; align-items: center; gap: 0.75rem; padding: 0.25rem 0.375rem; border-radius: 0.5rem; cursor: pointer; }
.be-choice[data-description] { align-items: flex-start; }
.be-choice[data-disabled] { cursor: not-allowed; }
.be-choice-input { position: absolute; width: 1px; height: 1px; margin: 0; opacity: 0; pointer-events: none; outline: none; }
.be-choice-box { position: relative; display: inline-flex; box-sizing: border-box; flex: none; width: 1.25rem; height: 1.25rem; align-items: center; justify-content: center; border: 2px solid color-mix(in srgb, var(--beui-muted-foreground) 50%, transparent); border-radius: 9999px; color: var(--beui-primary-foreground); transition: color 0.2s, background-color 0.2s, border-color 0.2s; }
.be-choice-box[data-type=checkbox] { border-radius: 0.375rem; background: var(--beui-background); }
.be-choice:hover .be-choice-box { border-color: var(--beui-muted-foreground); }
.be-choice .be-choice-box[data-checked] { border-color: var(--beui-primary); }
.be-choice-box[data-type=checkbox][data-checked] { background: var(--beui-primary); }
.be-choice-input:focus-visible + .be-choice-box { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.be-choice[data-disabled] .be-choice-box { opacity: 0.6; }
.be-choice-dot { position: absolute; inset: 0.25rem; border-radius: 9999px; background: var(--beui-primary); }
.be-choice-text { display: flex; min-width: 0; flex-direction: column; gap: 0.125rem; user-select: none; }
.be-choice[data-disabled] .be-choice-text { opacity: 0.6; }
.be-choice-label { font-size: 0.875rem; line-height: 1.25rem; color: var(--beui-foreground); }
.be-choice[data-description] .be-choice-label { line-height: 1rem; }
.be-choice-desc { font-size: 0.75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
</style>
