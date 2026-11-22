<script setup lang="ts">
import { inject } from 'vue'
import { DRP_KEY } from './drp-core'

/** Clears the range. Disabled while there is nothing to clear. */
defineProps<{ disabled?: boolean }>()
defineSlots<{
  /** Replaces the label. */
  default?: () => unknown
}>()
const ctx = inject(DRP_KEY)
if (!ctx) throw new Error('DateRangePickerClear must be used within DateRangePicker')
</script>

<template>
  <button type="button" class="drp-clear" :aria-label="ctx.t('clearLabel')" :disabled="disabled || ctx.disabled.value || !ctx.value.value" @click="ctx.clear()">
    <slot>{{ ctx.t('clear') }}</slot>
  </button>
</template>

<style>
.drp-clear { margin: 0; padding: 0.25rem 0.375rem; border: 0; border-radius: 0.375rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: 0.75rem; line-height: 1rem; cursor: pointer; outline: none; transition: color 150ms, background-color 150ms, box-shadow 150ms; }
@media (hover: hover) { .drp-clear:hover:not(:disabled) { background: var(--beui-muted); color: var(--beui-foreground); } }
.drp-clear:disabled { opacity: 0.3; }
</style>
