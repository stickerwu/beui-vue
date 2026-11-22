<script setup lang="ts">
import { MorphPopoverContent, MorphPopoverTrigger, PopoverMorph } from 'beui-vue'
import { ref } from 'vue'
import { PopIcon } from './popovers-icons'

const open = ref(false)
const actions = [
  { icon: 'Pencil', label: 'Edit' },
  { icon: 'Copy', label: 'Duplicate' },
  { icon: 'Share2', label: 'Share' },
  { icon: 'Trash2', label: 'Delete' },
]
</script>

<template>
  <PopoverMorph v-model:open="open">
    <MorphPopoverTrigger>
      <button type="button" class="trigger">
        Options
        <PopIcon name="ChevronDown" class="chevron" />
      </button>
    </MorphPopoverTrigger>

    <MorphPopoverContent align="start" class="morph-demo-panel">
      <button v-for="action in actions" :key="action.label" type="button" class="action" @click="open = false">
        <PopIcon :name="action.icon" class="icon" />
        {{ action.label }}
      </button>
    </MorphPopoverContent>
  </PopoverMorph>
</template>

<style scoped>
.trigger { display: inline-flex; height: 2.5rem; align-items: center; gap: .5rem; border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-background); padding: 0 1rem; font: inherit; font-size: .875rem; font-weight: 500; line-height: 1.25rem; color: var(--beui-foreground); outline: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1), border-color .15s cubic-bezier(.4, 0, .2, 1); }
.trigger:hover { border-color: var(--beui-border-strong); }
.trigger:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.chevron, .icon { color: var(--beui-muted-foreground); }
.action { display: flex; width: 100%; align-items: center; gap: .625rem; border: 0; border-radius: .5rem; background: transparent; padding: .5rem .625rem; text-align: left; font: inherit; font-size: .875rem; line-height: 1.25rem; color: var(--beui-foreground); outline: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1); }
.action:hover, .action:focus-visible { background: var(--beui-muted); }
:global(.morph-demo-panel) { width: 12rem; padding: .375rem; }
</style>
