<script setup lang="ts">
import { ReorderGroup } from 'motion-v'
import { useSortableListContext } from './sortable-list-context'

/** The ordered rows; keep headers and footer controls outside this group. */
defineSlots<{ default?: () => unknown }>()
const context = useSortableListContext('SortableListGroup')
</script>

<template>
  <ReorderGroup
    axis="y" :values="context.ids.value" :aria-label="context.label.value" class="be-sortable-list-group"
    @update:values="context.reorder">
    <slot />
  </ReorderGroup>
</template>

<style>
.be-sortable-list-group { margin: 0; padding: 0; list-style: none; }
</style>
