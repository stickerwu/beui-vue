<script setup lang="ts">
import { ref } from 'vue'
import { OverflowActions } from 'beui-vue'

// lucide Eye, Pin, GitBranch, CalendarClock.
const icons: Record<string, string> = {
  preview: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  branch: '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  schedule: '<path d="M16 14v2.2l1.6 1"/><path d="M16 2v4"/><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M3 10h5"/><path d="M8 2v4"/><circle cx="16" cy="16" r="6"/>',
}
const primaryActions = [{ id: 'preview', label: 'Preview' }, { id: 'pin', label: 'Pin' }]
const overflowActions = [{ id: 'branch', label: 'Branch' }, { id: 'schedule', label: 'Schedule' }]
const expanded = ref(false)
</script>

<template>
  <div class="overflow-stage">
    <OverflowActions v-model:expanded="expanded" :primary-actions="primaryActions" :overflow-actions="overflowActions"
      open-label="Open action rail" close-label="Collapse action rail">
      <template #icon="{ item }">
        <svg viewBox="0 0 24 24" aria-hidden="true" class="overflow-svg" v-html="icons[item.id]" />
      </template>
    </OverflowActions>
  </div>
</template>

<style scoped>
.overflow-stage { display: flex; width: 100%; align-items: center; justify-content: center; }
.overflow-svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
</style>
