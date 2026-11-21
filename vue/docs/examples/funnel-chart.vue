<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { ButtonBase, FunnelChart } from 'beui-vue'

const direction = shallowRef<'vertical' | 'horizontal'>('vertical')
const labels = ['Visitors', 'Signed up', 'Activated', 'Started trial', 'Subscribed']
const cohorts = [[24000, 15600, 10800, 7200, 4320], [28000, 18200, 13650, 9100, 6370], [22000, 13200, 7920, 4752, 2376]]
const cohort = shallowRef(0)
const stages = computed(() => labels.map((label, index) => ({ id: label, label, value: cohorts[cohort.value][index] })))
</script>

<template>
  <div class="funnel-demo">
    <div class="top">
      <div><h3>From first visit to first payment</h3><p>Product conversion · Sample cohorts</p></div>
      <ButtonBase variant="ghost" size="sm" class="next" @click="cohort = (cohort + 1) % cohorts.length">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
        Next cohort
      </ButtonBase>
    </div>
    <fieldset aria-label="Funnel direction">
      <ButtonBase v-for="value in (['vertical', 'horizontal'] as const)" :key="value" variant="ghost" size="sm" :aria-pressed="direction === value" :class="{ on: direction === value }" @click="direction = value">{{ value === 'vertical' ? 'Vertical' : 'Horizontal' }}</ButtonBase>
    </fieldset>
    <FunnelChart :stages="stages" :direction="direction" />
    <p class="hint">Inspect a stage to see conversion and drop-off</p>
  </div>
</template>

<style scoped>
.funnel-demo { display: flex; flex-direction: column; align-items: stretch; gap: 24px; width: 100%; }
.top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; }
h3 { margin: 0; padding: 0; border: 0; letter-spacing: normal; font-size: 14px; line-height: 20px; font-weight: 500; }
.top p { margin: 4px 0 0; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.next { gap: 8px; }
fieldset { display: inline-flex; align-self: flex-start; gap: 4px; min-width: 0; margin: 0; padding: 4px; border: 0; border-radius: 9999px; background: color-mix(in srgb, var(--beui-muted) 50%, transparent); }
fieldset .on { background: var(--beui-background); box-shadow: 0 1px 2px 0 rgb(0 0 0 / .05); }
.hint { margin: 0; text-align: center; font-size: 11px; line-height: 16px; color: var(--beui-muted-foreground); }
</style>
