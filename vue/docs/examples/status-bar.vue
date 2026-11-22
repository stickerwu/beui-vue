<script setup lang="ts">
import { ButtonBase, StatusBar, StatusBarLegend, StatusBarPlot, StatusBarTooltip } from 'beui-vue'
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
  <div class="status-demo">
    <div class="top"><span>48 days of status</span><div><ButtonBase variant="ghost" size="sm" @click="replay++">Replay</ButtonBase><ButtonBase variant="ghost" size="sm" @click="incident = !incident">{{ incident ? 'Resolve incident' : 'Simulate incident' }}</ButtonBase></div></div>
    <StatusBar :key="`api-${replay}`" label="API status" :data="api" :statuses="statuses">
      <div class="line"><strong>API</strong><span>{{ incident ? 'Degraded' : 'Operational' }}</span></div>
      <StatusBarPlot />
      <StatusBarTooltip />
    </StatusBar>
    <StatusBar :key="`site-${replay}`" class="website" label="Website status" :data="website" :statuses="statuses">
      <div class="line"><strong>Website</strong><span>Operational</span></div>
      <StatusBarPlot />
      <StatusBarTooltip />
      <StatusBarLegend class="legend-pad" />
    </StatusBar>
  </div>
</template>

<style scoped>
.status-demo { width: 100%; max-width: 42rem; margin-inline: auto; }
.status-demo > * + * { margin-top: 24px; }
.top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.top > span { font-size: 14px; line-height: 20px; color: var(--beui-muted-foreground); }
.top > div { display: flex; gap: 4px; }
.line { display: flex; align-items: center; justify-content: space-between; font-size: 14px; line-height: 20px; }
.line strong { font-weight: 500; }
.line span { color: var(--beui-muted-foreground); }
.status-demo :deep(.legend-pad) { padding-top: 8px; }
.website { padding-top: 24px; border-top: 1px solid var(--beui-border); }
</style>
