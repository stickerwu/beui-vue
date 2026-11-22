<script setup lang="ts">
import { computed, inject } from 'vue'
import { DRP_KEY } from './drp-core'

/** "3 days selected", or what to choose next. */
defineSlots<{
  /** Replaces the text. */
  default?: () => unknown
}>()
const ctx = inject(DRP_KEY)
if (!ctx) throw new Error('DateRangePickerSelection must be used within DateRangePicker')
const selection = computed(() => {
  const count = ctx.dayCount.value
  return count ? ctx.t(count === 1 ? 'daySelected' : 'daysSelected', { count }) : ctx.value.value ? ctx.t('chooseEndDate') : ctx.t('chooseStartDate')
})
</script>

<template>
  <p class="drp-selection"><slot>{{ selection }}</slot></p>
</template>

<style>
.drp-selection { margin: 0; font-size: 0.75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
</style>
