<script setup lang="ts">
import { computed, inject } from 'vue'
import { DRP_KEY, type DateRange } from './drp-core'

/** One preset range; pressed while it is the current range. */
const props = defineProps<{
  value: DateRange
  /** Accessible preset name and selection announcement. */
  label: string
  disabled?: boolean
}>()
defineSlots<{
  /** Replaces the visible label. */
  default?: () => unknown
}>()
const ctx = inject(DRP_KEY)
if (!ctx) throw new Error('DateRangePickerPreset must be used within DateRangePicker')
const selected = computed(() => ctx.value.value?.from === props.value.from && ctx.value.value?.to === props.value.to)
</script>

<template>
  <button
    type="button" class="drp-preset" :class="{ 'drp-preset-on': selected }" :aria-label="label" :aria-pressed="selected"
    :disabled="disabled || !ctx.rangeAvailable(value)" @click="ctx.selectPreset(value, label)">
    <slot>{{ label }}</slot>
  </button>
</template>

<style>
.drp-preset { margin: 0; padding: 0.375rem 0.75rem; border: 0; border-radius: 0.5rem; background: color-mix(in srgb, var(--beui-muted) 60%, transparent); color: var(--beui-muted-foreground); font: inherit; font-size: 0.75rem; line-height: 1rem; font-weight: 500; cursor: pointer; outline: none; transition: color 150ms, background-color 150ms, box-shadow 150ms; }
@media (hover: hover) { .drp-preset:hover:not(:disabled, .drp-preset-on) { background: var(--beui-muted); color: var(--beui-foreground); } }
.drp-preset-on { background: var(--beui-foreground); color: var(--beui-background); }
.drp-preset:disabled { opacity: 0.4; }
</style>
