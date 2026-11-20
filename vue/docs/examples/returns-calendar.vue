<script setup lang="ts">
import { ReturnsCalendar } from 'beui-vue'

const years = [2023, 2024, 2025]
const returns = [
  [2.4, -1.5, 3.6, .8, -2.3, 1.4, 2.7, -.9, 1.2, 1.6, -1.1, 2.9],
  [1.9, 2.7, -2.6, 3.4, 1.6, -1.2, 2.2, -.8, .4, 2.5, 3.3, -1.7],
  [-2.2, 3.3, 1.2, -.7, 2.1, 3.8, -.9, 2.7, -1.9, 1.8, 2.6, .5],
]
</script>

<template>
  <ReturnsCalendar :years="years" :returns="returns" />
</template>
