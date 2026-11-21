<script setup lang="ts">
import { ExpandableControl } from 'beui-vue'
import { LucideIcon } from './layout-icons'
</script>

<template>
  <div class="stack">
    <div class="row">
      <ExpandableControl label="Notifications">
        <template #icon><LucideIcon name="Bell" :size="16" /></template>
      </ExpandableControl>
    </div>
    <div class="row">
      <ExpandableControl variant="chip" label="React" action-label="Remove React">
        <template #actionIcon><LucideIcon name="X" :size="14" /></template>
      </ExpandableControl>
    </div>
  </div>
</template>

<style scoped>
.stack { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
.row { display: flex; align-items: center; gap: .5rem; }
</style>
