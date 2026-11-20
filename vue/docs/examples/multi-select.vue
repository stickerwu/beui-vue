<script setup lang="ts">
import { MultiSelect } from 'beui-vue'
import { ref } from 'vue'
const teams = ref(['design','engineering'])
const options = [
  { value: 'design', label: 'Design', color: '#e6637c', group: 'Product teams' },
  { value: 'engineering', label: 'Engineering', color: '#65a5df', group: 'Product teams' },
  { value: 'product', label: 'Product', color: '#e7af4d', group: 'Product teams' },
  { value: 'research', label: 'Research', color: '#a589d8', group: 'Product teams' },
  { value: 'marketing', label: 'Marketing', color: '#48a97f', group: 'Business teams' },
  { value: 'operations', label: 'Operations', color: '#8192a7', group: 'Business teams' },
]
</script>
<template><MultiSelect v-model="teams" :options="options" label="Search teams" placeholder="Choose teams" empty="No teams found." /></template>
