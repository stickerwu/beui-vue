<script setup lang="ts">
import { Tabs } from 'beui-vue'

const overview = [
  { value: 'overview', label: 'Overview', content: 'High-level summary.' },
  { value: 'activity', label: 'Activity', content: 'Recent events.' },
  { value: 'settings', label: 'Settings', content: 'Preferences.' },
]
const rows = (...names: string[]) => names.map(label => ({ label, value: label.toLowerCase() }))
const icons: Record<string, string> = { home: 'm3 10 9-7 9 7v10h-6v-6H9v6H3z', stats: 'M4 20h17M7 16v-5m5 5V4m5 12V8', alerts: 'M4 17h16l-2-4v-3a6 6 0 0 0-12 0v3zm6 3h4' }
</script>

<template>
  <div class="tab-demos">
    <div><span class="caption">Pill</span><Tabs :items="overview" :labels="{ list: 'Pill' }" /></div>
    <div class="narrow"><span class="caption">Overflow</span><Tabs :items="rows('Overview','Activity','Analytics','Members','Billing','Settings')" :labels="{ list: 'Overflow' }" /></div>
    <div><span class="caption">Segment</span><Tabs :items="rows('Day','Week','Month')" variant="segment" :labels="{ list: 'Segment' }" /></div>
    <div><span class="caption">Icon on selected</span><Tabs :items="rows('Home','Stats','Alerts')" icons="selected" :labels="{ list: 'Icon on selected' }">
      <template #icon="{ item }"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path :d="icons[item.value]" /></svg></template>
    </Tabs></div>
    <div><span class="caption">Underline</span><Tabs :items="rows('All','Open','Closed')" variant="underline" :labels="{ list: 'Underline' }" /></div>
  </div>
</template>

<style scoped>
.tab-demos { display: grid; width: 100%; max-width: 28rem; min-width: 0; gap: 2rem; font-size: .875rem; color: var(--beui-muted-foreground); }
.tab-demos > div { min-width: 0; }
.narrow { max-width: 20rem; }
.caption { display: block; margin: 0 0 .5rem; font-size: .625rem; letter-spacing: .07em; font-weight: 600; text-transform: uppercase; }
</style>
