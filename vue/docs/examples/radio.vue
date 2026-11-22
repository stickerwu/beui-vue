<script setup lang="ts">
import { RadioGroup, RadioGroupItem } from 'beui-vue'
import { ref } from 'vue'
import { usePreviewVariant } from './use-preview-variant'
// `?variant=description` shows the second upstream preview.
const { variant } = usePreviewVariant('description')
const plan = ref('pro')
const schedule = ref('once')
</script>
<template>
  <RadioGroup v-if="variant === 'description'" v-model="schedule" class="description">
    <RadioGroupItem value="once" label="Run once" description="Runs a single time, right now." />
    <RadioGroupItem value="schedule" label="Run on a schedule" description="Repeats on a set interval until stopped." />
    <RadioGroupItem value="trigger" label="Run on a trigger" description="Waits for an event before it starts." />
    <RadioGroupItem value="manual" label="Manual approval" description="Not available on your plan." disabled />
  </RadioGroup>
  <RadioGroup v-else v-model="plan" class="plans">
    <RadioGroupItem value="starter" label="Starter, free" />
    <RadioGroupItem value="pro" label="Pro, $12/mo" />
    <RadioGroupItem value="team" label="Team, $29/mo" />
    <RadioGroupItem value="legacy" label="Legacy plan" disabled />
  </RadioGroup>
</template>
<style scoped>
.description { width: 100%; max-width: 16rem; }
.plans { min-width: 12rem; }
</style>
