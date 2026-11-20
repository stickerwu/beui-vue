<script setup lang="ts">
import { StatusBar } from 'beui-vue'

const data = Array.from({ length: 45 }, (_, day) => ({
  id: `day-${day}`, label: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(Date.UTC(2026, 9, day + 1)),
  status: day === 12 ? 'outage' : [8, 13, 26].includes(day) ? 'degraded' : day === 32 ? 'maintenance' : 'operational',
  description: day === 12 ? 'Connection timeouts' : undefined,
}))
</script>

<template>
  <StatusBar label="API uptime" :data="data" />
</template>
