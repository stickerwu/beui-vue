<script setup lang="ts">
import { BumpChart } from 'beui-vue'

const periods = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const series = [
  { id: 'violet', name: 'Violet', ranks: [2, 1, 1, 2, 3, 2] },
  { id: 'teal', name: 'Teal', ranks: [1, 2, 3, 3, 2, 1] },
  { id: 'amber', name: 'Amber', ranks: [3, 3, 2, 1, 1, 3] },
]
</script>

<template>
  <BumpChart label="Team rankings" :series="series" :periods="periods" />
</template>
