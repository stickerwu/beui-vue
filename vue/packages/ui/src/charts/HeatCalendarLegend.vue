<script setup lang="ts">
import { HEAT_STEPS as STEPS, useHeatCalendar } from './heat-calendar-context'

const { start, end, step, fill, canHover, reduce, t, formats, setStep } = useHeatCalendar()
</script>

<template>
  <div class="legend" data-slot="heat-calendar-legend">
    <span class="range">{{ start && end ? t('range', { start: formats.range.format(start), end: formats.range.format(end) }) : ' ' }}</span>
    <!-- hovering a step keeps only cells of that level lit, so the legend doubles as a filter -->
    <span class="steps" @pointerleave="setStep(null)">
      <span class="range edge">{{ t('less') }}</span>
      <button v-for="(s, i) in STEPS" :key="s" type="button" :aria-label="t('level', { level: i })" :aria-pressed="step === i" :style="{ background: fill(i), transform: !reduce && step === i ? 'scale(1.25)' : undefined }"
        @pointerenter="canHover && (setStep(i))" @focus="setStep(i)" @blur="setStep(null)" @click="setStep(step === i ? null : i)" />
      <span class="range edge">{{ t('more') }}</span>
    </span>
  </div>
</template>

<style scoped>
.legend { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
.range { font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.steps { display: flex; align-items: center; gap: 4px; }
.steps button { width: 12px; height: 12px; margin: 0; padding: 0; border: 0; border-radius: 3px; cursor: pointer; transition: transform .15s; }
.steps button:focus-visible { outline: 2px solid color-mix(in srgb, var(--beui-foreground) 12%, transparent); outline-offset: 2px; }
.edge:first-child { margin-right: 2px; }
.edge:last-child { margin-left: 2px; }
</style>
