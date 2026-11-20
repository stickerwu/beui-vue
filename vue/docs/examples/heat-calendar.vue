<script setup lang="ts">
import { HeatCalendar } from 'beui-vue'

const end = new Date('2026-11-20T00:00:00Z')
const activity = Array.from({ length: 16 }, (_, week) => Array.from({ length: 7 }, (_, day) => {
  const level = Math.abs(Math.sin(week * .82 + day * 2))
  return level < .3 || day === 6 ? 0 : level
}))
</script>

<template>
  <HeatCalendar :values="activity" :weeks="16" :max-count="14" :end-date="end" unit="commits" color="#16a34a" />
</template>
