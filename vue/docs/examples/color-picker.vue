<script setup lang="ts">
import { ColorPicker } from 'beui-vue'
import { ref } from 'vue'
const color = ref('#3478f6')
const presets = [
  { label: 'Blue', value: '#3478f6' }, { label: 'Purple', value: '#9270e8' },
  { label: 'Pink', value: '#e66aa4' }, { label: 'Red', value: '#e55656' },
  { label: 'Orange', value: '#ed9141' }, { label: 'Amber', value: '#e5b63c' },
  { label: 'Green', value: '#65a65a' }, { label: 'Teal', value: '#169d83' },
]
</script>
<template><div class="preview"><ColorPicker v-model="color" :presets="presets" label="Brand color" /></div></template>
<style scoped>.preview { min-height: 22rem; display: flex; justify-content: center; align-items: flex-start; padding: 1rem; }</style>
