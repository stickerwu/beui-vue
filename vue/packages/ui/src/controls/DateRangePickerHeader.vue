<script setup lang="ts">
import { computed, inject } from 'vue'
import { DRP_KEY, parse } from './drp-core'

/** Month and year buttons that open the pickers, plus previous and next. */
const ctx = inject(DRP_KEY)
if (!ctx) throw new Error('DateRangePickerHeader must be used within DateRangePicker')
const monthLabel = computed(() => ctx.formats.value.monthName.format(parse(ctx.month.value)))
const pageLabel = (kind: 'previous' | 'next') => ctx.t(`${kind}${ctx.view.value === 'years' ? 'Years' : ctx.view.value === 'months' ? 'Year' : 'Month'}` as 'previousMonth')
function setMonthTrigger(node: unknown) { ctx!.monthTrigger.value = ((node as { $el?: HTMLElement } | null)?.$el ?? node) as HTMLElement | null }
function setYearTrigger(node: unknown) { ctx!.yearTrigger.value = ((node as { $el?: HTMLElement } | null)?.$el ?? node) as HTMLElement | null }
</script>

<template>
  <div class="drp-header">
    <div class="drp-header-left">
      <button
        :ref="setMonthTrigger"
        type="button"
        class="drp-text-button drp-month-button"
        :class="{ 'drp-hidden': ctx.view.value === 'years' }"
        :aria-label="ctx.t('chooseMonth')"
        :aria-expanded="ctx.view.value === 'months'"
        :aria-controls="ctx.view.value === 'months' ? ctx.choicesId : undefined"
        :disabled="ctx.disabled.value"
        @click="ctx.openChoices('months')"
      >
        {{ monthLabel }}
        <svg class="drp-chevron drp-muted" :class="{ 'drp-flip': ctx.view.value === 'months' }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <button
        :ref="setYearTrigger"
        type="button"
        class="drp-text-button drp-year-button"
        :aria-label="ctx.t('chooseYear')"
        :aria-expanded="ctx.view.value === 'years'"
        :aria-controls="ctx.view.value === 'years' ? ctx.choicesId : undefined"
        :disabled="ctx.disabled.value"
        @click="ctx.openChoices('years')"
      >
        {{ ctx.view.value === 'years' ? `${ctx.yearPage.value}–${ctx.yearPageEnd.value}` : ctx.year.value }}
        <svg class="drp-chevron" :class="{ 'drp-flip': ctx.view.value === 'years' }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </div>
    <div class="drp-header-right">
      <button type="button" class="drp-icon-button" :aria-label="pageLabel('previous')" :disabled="ctx.previousDisabled.value" @click="ctx.page(-1)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <button type="button" class="drp-icon-button" :class="{ 'drp-hidden': ctx.view.value === 'years' && ctx.nextDisabled.value }" :aria-label="pageLabel('next')" :disabled="ctx.nextDisabled.value" :hidden="ctx.view.value === 'years' && ctx.nextDisabled.value" @click="ctx.page(1)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
      </button>
    </div>
  </div>
</template>

<style>
.drp-header { display: flex; align-items: center; justify-content: space-between; gap: 0.25rem; margin-bottom: 0.5rem; }
.drp-header-left { display: flex; min-width: 0; align-items: center; gap: 0.125rem; }
.drp-header-right { display: flex; flex-shrink: 0; gap: 0.125rem; }
.drp-text-button { display: inline-flex; align-items: center; gap: 0.375rem; margin: 0; padding: 0.375rem 0.5rem; border: 0; border-radius: 0.5rem; background: transparent; color: inherit; font: inherit; font-size: 13px; line-height: 1.5; cursor: pointer; outline: none; transition: color 150ms, background-color 150ms, box-shadow 150ms; }
.drp-month-button { font-weight: 600; }
.drp-year-button { font-weight: 500; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
@media (hover: hover) {
  .drp-text-button:hover:not(:disabled) { background: var(--beui-muted); }
  .drp-year-button:hover:not(:disabled) { color: var(--beui-foreground); }
}
.drp-text-button:disabled { opacity: 0.4; }
.drp-flip { transform: rotate(180deg); }
.drp-icon-button { display: inline-flex; width: 2rem; height: 2rem; flex-shrink: 0; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; border-radius: 0.5rem; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color 150ms, background-color 150ms, box-shadow 150ms; }
@media (hover: hover) { .drp-icon-button:hover:not(:disabled) { background: var(--beui-muted); color: var(--beui-foreground); } }
.drp-icon-button:disabled { pointer-events: none; opacity: 0.3; }
.drp-text-button:focus-visible, .drp-icon-button:focus-visible, .drp-clear:focus-visible, .drp-preset:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
</style>
