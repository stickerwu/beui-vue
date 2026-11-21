<script setup lang="ts">
import { tableIcons, type TableIconName } from './icons'

defineProps<{ name: TableIconName }>()
</script>

<template>
  <svg class="be-table-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-for="(shape, index) in tableIcons[name]" :key="index">
      <circle v-if="'c' in shape" :cx="shape.c[0]" :cy="shape.c[1]" :r="shape.c[2]" />
      <path v-else :d="shape.d" />
    </template>
  </svg>
</template>
