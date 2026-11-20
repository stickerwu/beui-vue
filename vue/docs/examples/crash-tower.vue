<script setup lang="ts">
import { ref } from 'vue'
import { CrashTower } from 'beui-vue'

const auto = ref<number | null>(1.5)
const points = [1.12, 1.76, 1.65]
let next = 0
</script>

<template><CrashTower v-model:auto-cash-out="auto" :get-crash-point="() => points[next++ % points.length]" /></template>
