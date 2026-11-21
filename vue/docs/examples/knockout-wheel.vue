<script setup lang="ts">
import { KnockoutWheel } from 'beui-vue'
import { WHEEL_ROUNDS } from './tournament-data'
</script>

<template>
  <div class="wheel-stage"><KnockoutWheel :rounds="WHEEL_ROUNDS" /></div>
</template>

<style scoped>
.wheel-stage { width: 100%; padding-block: 2rem; }
</style>
