<script setup lang="ts">
import { ExpandableTabs } from 'beui-vue'
import { DemoIcon, type DemoIconName } from './expandable-tabs-icons'

type Row = { icon: DemoIconName; label: string }
type Tab = { id: string; label: string; icon: DemoIconName; rows: Row[] }

const tabs: Tab[] = [
  { id: 'launch', label: 'Launch', icon: 'Rocket', rows: [
    { icon: 'FileText', label: 'Release Brief' }, { icon: 'ClipboardCheck', label: 'Launch Checklist' }, { icon: 'Megaphone', label: 'Campaign Notes' },
    { icon: 'CalendarClock', label: 'Rollout Calendar' }, { icon: 'CloudUpload', label: 'Ship Build' },
  ] },
  { id: 'inbox', label: 'Inbox', icon: 'Inbox', rows: [
    { icon: 'MessageCircle', label: 'Client Feedback' }, { icon: 'Users', label: 'Team Requests' }, { icon: 'BadgeCheck', label: 'Approval Notes' },
  ] },
  { id: 'flows', label: 'Flows', icon: 'Workflow', rows: [
    { icon: 'GitBranch', label: 'Trigger Map' }, { icon: 'Webhook', label: 'Webhook Runs' }, { icon: 'RefreshCw', label: 'Retry Queue' },
  ] },
  { id: 'assets', label: 'Assets', icon: 'PackageOpen', rows: [
    { icon: 'SwatchBook', label: 'Brand Kit' }, { icon: 'Images', label: 'Mockup Library' }, { icon: 'Brush', label: 'Design Tokens' }, { icon: 'UploadCloud', label: 'Export Queue' },
  ] },
  { id: 'status', label: 'Status', icon: 'ChartSpline', rows: [
    { icon: 'Gauge', label: 'Activation' }, { icon: 'ChartSpline', label: 'Conversion' }, { icon: 'Siren', label: 'Incidents' },
  ] },
]
const items = tabs.map(({ id, label }) => ({ id, label }))
const byId = new Map(tabs.map(tab => [tab.id, tab]))
</script>

<template>
  <div class="tabs-stage">
    <ExpandableTabs :items="items">
      <template #icon="{ item }"><DemoIcon :name="byId.get(item.id)!.icon" class="tabs-icon" /></template>
      <template #panel="{ item }">
        <div class="menu">
          <button v-for="row in byId.get(item.id)!.rows" :key="row.label" type="button" class="menu-row">
            <DemoIcon :name="row.icon" class="menu-icon" />
            <span class="menu-label">{{ row.label }}</span>
            <DemoIcon name="ChevronRight" class="menu-icon" />
          </button>
        </div>
      </template>
    </ExpandableTabs>
  </div>
</template>

<style scoped>
.tabs-stage { display: flex; min-height: 22rem; width: 100%; align-items: flex-end; justify-content: center; }
.tabs-icon { width: 1rem; height: 1rem; }
.menu { display: flex; width: 17.125rem; flex-direction: column; gap: .125rem; }
.menu-row { display: flex; width: 100%; align-items: center; gap: .75rem; box-sizing: border-box; padding: .625rem .75rem; border: 0; border-radius: .75rem; background: transparent; color: var(--beui-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; font-weight: 500; text-align: left; cursor: pointer; transition: background-color .15s cubic-bezier(.4, 0, .2, 1); }
.menu-row:hover { background: var(--beui-muted); }
.menu-icon { width: 1rem; height: 1rem; flex: none; color: var(--beui-muted-foreground); }
.menu-label { flex: 1 1 0%; }
</style>
