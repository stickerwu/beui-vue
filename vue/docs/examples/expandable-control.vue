<script setup lang="ts">
import { ExpandableButton, ExpandableChip } from 'beui-vue'
import { LucideIcon } from './layout-icons'
</script>

<template>
  <div class="stack">
    <div class="row">
      <ExpandableButton label="Notifications">
        <template #icon><LucideIcon name="Bell" :size="16" /></template>
      </ExpandableButton>
    </div>
    <div class="row">
      <ExpandableChip label="React" action-label="Remove React">
        <template #actionIcon><LucideIcon name="X" :size="14" /></template>
      </ExpandableChip>
    </div>
  </div>
</template>

<style scoped>
.stack { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
.row { display: flex; align-items: center; gap: .5rem; }
</style>
