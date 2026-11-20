<script setup lang="ts">
import { StatusBar } from 'beui-vue'
import { computed, ref } from 'vue'

const incident = ref(false), replay = ref(0)
const statuses = [
  { id: 'operational', label: 'Operational', color: '#059669' },
  { id: 'degraded', label: 'Degraded', color: '#d97706' },
  { id: 'outage', label: 'Outage', color: '#e11d48' },
]
const history = Array.from({ length: 48 }, (_, day) => {
  const date = new Date(Date.UTC(2026, 7, day + 21))
  return { id: date.toISOString().slice(0, 10), label: date.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    status: day === 8 ? 'degraded' : 'operational', description: day === 8 ? 'Elevated response times for 12 minutes.' : 'All checks passed.' }
})
const website = history.map(datum => ({ ...datum, status: 'operational', description: 'All checks passed.' }))
const api = computed(() => history.map((datum, day) => incident.value && day >= 45 ? {
  ...datum, status: day === 46 ? 'outage' : 'degraded', description: day === 46 ? 'Requests failed for 4 minutes.' : 'Elevated response times.',
} : datum))
</script>

<template>
  <div class="chart-demo" style="max-width:42rem"><header><span>48 days of status</span><div><button type="button" @click="replay++">Replay</button><button type="button" @click="incident = !incident">{{ incident ? 'Resolve incident' : 'Simulate incident' }}</button></div></header>
    <div class="line"><strong>API</strong><span>{{ incident ? 'Degraded' : 'Operational' }}</span></div>
    <StatusBar :key="`api-${replay}`" label="API status" :data="api" :statuses="statuses" hide-legend />
    <div class="line website"><strong>Website</strong><span>Operational</span></div>
    <StatusBar :key="`site-${replay}`" label="Website status" :data="website" :statuses="statuses" />
  </div>
</template>
<style scoped src="./chart-demo.css"></style>
<style scoped>.line { display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px; }.line span,header > span {color:var(--beui-muted-foreground)}.website { margin-top:24px;padding-top:24px;border-top:1px solid var(--beui-border); }</style>
