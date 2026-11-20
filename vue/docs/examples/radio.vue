<script setup lang="ts">
import { RadioGroup } from 'beui-vue'
import { ref } from 'vue'
const plan = ref('pro')
const options = [
  { value: 'starter', label: 'Starter, free' },
  { value: 'pro', label: 'Pro, $12/mo' },
  { value: 'team', label: 'Team, $29/mo' },
  { value: 'legacy', label: 'Legacy plan', disabled: true },
]
</script>
<template><RadioGroup v-model="plan" :options="options" label="Plans" /></template>
