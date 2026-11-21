<script setup lang="ts">
import { ColorSelector } from 'beui-vue'
import { ref } from 'vue'

const accent = ref('blue')
const options = [
  { value: 'blue', label: 'Blue', color: '#3478f6' },
  { value: 'purple', label: 'Purple', color: '#9270e8' },
  { value: 'pink', label: 'Pink', color: '#e66aa4' },
  { value: 'red', label: 'Red', color: '#e55656' },
  { value: 'orange', label: 'Orange', color: '#ed9141' },
  { value: 'amber', label: 'Amber', color: '#e5b63c' },
  { value: 'green', label: 'Green', color: '#65a65a' },
  { value: 'teal', label: 'Teal', color: '#169d83' },
]
</script>
<template><ColorSelector v-model="accent" :options="options" label="Accent" name="accent" /></template>
