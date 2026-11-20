<script setup lang="ts">
import { RadioGroup } from 'beui-vue'
import { ref } from 'vue'
import { usePreviewVariant } from './use-preview-variant'
const { variant, select } = usePreviewVariant('description')
const plan = ref('pro')
const schedule = ref('once')
const schedules = [
  {value:'once', label:'Run once', detail:'Runs a single time, right now.'},
  {value:'schedule', label:'Run on a schedule', detail:'Repeats on a set interval until stopped.'},
  {value:'trigger', label:'Run on a trigger', detail:'Waits for an event before it starts.'},
  {value:'manual', label:'Manual approval', detail:'Not available on your plan.',disabled:true},
]
const options = [
  { value: 'starter', label: 'Starter, free' },
  { value: 'pro', label: 'Pro, $12/mo' },
  { value: 'team', label: 'Team, $29/mo' },
  { value: 'legacy', label: 'Legacy plan', disabled: true },
]
</script>
<template><div class="choices"><label>Example <select :value="variant" @change="select(($event.target as HTMLSelectElement).value)"><option value="default">Default</option><option value="description">Description</option></select></label>
  <RadioGroup v-if="variant==='description'" v-model="schedule" :options="schedules" label="Scheduling"/>
  <RadioGroup v-else v-model="plan" :options="options" label="Plans" />
</div></template>
<style scoped>.choices { display:grid; gap:1rem; }</style>
