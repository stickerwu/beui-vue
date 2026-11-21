<script setup lang="ts">
import { ref } from 'vue'
import { BouncyAccordion } from 'beui-vue'
import { LucideIcon } from './layout-icons'

const active = ref<string | null>('calendar')
const items = [
  { id: 'brief', title: 'Release Brief', icon: 'FileText', description: 'Collect launch notes, owners, and risks in one compact handoff before the release window opens.' },
  { id: 'launch', title: 'Launch Checklist', icon: 'ShieldCheck', description: 'Verify copy, links, analytics, rollback steps, and final approvals without leaving the queue.' },
  { id: 'campaign', title: 'Campaign Notes', icon: 'RadioTower', description: 'Keep channel-specific notes close to the task while preserving a calm collapsed list.' },
  { id: 'calendar', title: 'Rollout Calendar', icon: 'CalendarClock', description: 'Plan announcements, staging checks, reminders, and quiet periods around the same timeline.' },
  { id: 'ship', title: 'Ship Build', icon: 'PackageCheck', description: 'Track the current artifact, deploy status, and final sign-off before marking the release complete.' },
  { id: 'archive', title: 'Archive Assets', icon: 'FolderKanban', description: 'Move final copy, images, and source files into the campaign folder once the rollout is done.' },
]
</script>

<template>
  <div class="stage">
    <div class="box">
      <BouncyAccordion v-model="active" :items="items">
        <template #icon="{ item }"><LucideIcon :name="item.icon!" :size="16" /></template>
      </BouncyAccordion>
    </div>
  </div>
</template>

<style scoped>
.stage { display: flex; min-height: 24rem; width: 100%; align-items: center; justify-content: center; }
.box { width: 100%; max-width: 24rem; height: 480px; }
</style>
