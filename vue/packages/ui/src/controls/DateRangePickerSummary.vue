<script setup lang="ts">
import { computed, inject } from 'vue'
import { DRP_KEY, parse } from './drp-core'

/** The chosen start and end dates side by side. */
const ctx = inject(DRP_KEY)
if (!ctx) throw new Error('DateRangePickerSummary must be used within DateRangePicker')
const startLabel = computed(() => ctx.value.value ? ctx.formats.value.short.format(parse(ctx.value.value.from)) : ctx.t('selectDate'))
const endLabel = computed(() => ctx.value.value?.to ? ctx.formats.value.short.format(parse(ctx.value.value.to)) : ctx.t('selectDate'))
</script>

<template>
  <div class="drp-summary">
    <div class="drp-summary-cell">
      <p class="drp-summary-label">{{ ctx.t('startDate') }}</p>
      <p class="drp-summary-value">{{ startLabel }}</p>
    </div>
    <svg class="drp-summary-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
    <div class="drp-summary-cell">
      <p class="drp-summary-label">{{ ctx.t('endDate') }}</p>
      <p class="drp-summary-value" :class="{ 'drp-muted': !ctx.value.value?.to }">{{ endLabel }}</p>
    </div>
  </div>
</template>

<style>
.drp-summary { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 0.5rem; margin-bottom: 0.625rem; padding: 0.5rem 0.75rem; border: 1px solid var(--beui-border); border-radius: 0.5rem; background: color-mix(in srgb, var(--beui-muted) 30%, transparent); }
.drp-summary-cell { min-width: 0; }
.drp-summary p { margin: 0; }
.drp-summary-label { margin-bottom: 0.25rem !important; font-size: 10px; line-height: 1rem; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; color: var(--beui-muted-foreground); }
.drp-summary-value { font-size: 13px; line-height: 1.25rem; font-weight: 500; font-variant-numeric: tabular-nums; }
.drp-summary-arrow { color: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); }
</style>
