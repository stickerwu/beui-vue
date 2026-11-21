<script setup lang="ts">
import { PopoverMorph } from 'beui-vue'
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
  <PopoverMorph v-model:open="open" as-child align="start" content-style="width: 12rem; padding: .375rem">
    <template #trigger>
      <button type="button" class="trigger">
        Options
        <PopIcon name="ChevronDown" class="chevron" />
      </button>
    </template>
    <button v-for="action in actions" :key="action.label" type="button" class="action" @click="open = false">
      <PopIcon :name="action.icon" class="icon" />
      {{ action.label }}
    </button>
  </PopoverMorph>
</template>

<style scoped>
.trigger { display: inline-flex; height: 2.5rem; align-items: center; gap: .5rem; border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-background); padding: 0 1rem; font: inherit; font-size: .875rem; font-weight: 500; line-height: 1.25rem; color: var(--beui-foreground); outline: none; cursor: pointer; transition: border-color .15s; }
.trigger:hover { border-color: color-mix(in srgb, var(--beui-foreground) 14%, transparent); }
.trigger:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 12%, transparent); }
.chevron, .icon { color: var(--beui-muted-foreground); }
.action { display: flex; width: 100%; align-items: center; gap: .625rem; border: 0; border-radius: .5rem; background: transparent; padding: .5rem .625rem; text-align: left; font: inherit; font-size: .875rem; line-height: 1.25rem; color: var(--beui-foreground); outline: none; cursor: pointer; transition: background-color .15s; }
.action:hover, .action:focus-visible { background: var(--beui-muted); }
</style>
