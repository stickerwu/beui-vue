<script setup lang="ts">
import { shallowRef } from 'vue'
import { DonutChart } from 'beui-vue'

const selected = shallowRef<string | null>(null)
const segments = [
  { id: 'direct', name: 'Direct', color: '#2563eb', value: 4200 },
  { id: 'search', name: 'Search', color: '#14b8a6', value: 3500 },
  { id: 'social', name: 'Social', color: '#f59e0b', value: 1800 },
  { id: 'email', name: 'Email', color: '#8b5cf6', value: 500 },
]
</script>

<template>
  <DonutChart label="Traffic sources" :segments="segments" :selected-id="selected" @select="selected = selected === $event ? null : $event" />
</template>
