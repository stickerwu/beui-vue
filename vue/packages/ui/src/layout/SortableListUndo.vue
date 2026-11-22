<script setup lang="ts">
import { computed } from 'vue'
import { useSortableListContext } from './sortable-list-context'

/** Restores the order before the last move. Disabled until there is something to undo. */
const props = defineProps<{ disabled?: boolean }>()
defineSlots<{
  /** Replaces the icon and label. */
  default?: () => unknown
}>()
const context = useSortableListContext('SortableListUndo')
const unavailable = computed(() => props.disabled || context.disabled.value || !context.canUndo.value)
</script>

<template>
  <button type="button" class="be-sortable-list-undo" :disabled="unavailable" @click="context.undo()">
    <slot>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
      </svg>
      {{ context.t.value.undo }}
    </slot>
  </button>
</template>

<style>
.be-sortable-list-undo { display: inline-flex; align-items: center; gap: .375rem; margin-top: 1rem; padding: .25rem .5rem; border: 0; border-radius: .375rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .75rem; line-height: 1rem; transition: color .15s cubic-bezier(.4, 0, .2, 1); }
.be-sortable-list-undo:hover { color: var(--beui-foreground); }
.be-sortable-list-undo:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--beui-ring); }
.be-sortable-list-undo:disabled { opacity: .4; }
.be-sortable-list-undo svg { width: 13px; height: 13px; }
</style>
