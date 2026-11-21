<script setup lang="ts">
import { computed, provide, shallowRef, useId } from 'vue'
import { subKey, useLevel, type FocusTarget } from './menu-shared'

const level = useLevel('DropdownMenuSub')
const id = useId()
const contentId = useId()
const triggerEl = shallowRef<HTMLElement | null>(null)
const panelEl = shallowRef<HTMLElement | null>(null)
// Closes with its parent: an exiting menu takes its submenu out with it.
const open = computed(() => level.openSub.value === id && level.present.value)
provide(subKey, {
  id, contentId, open, focus: level.subFocus, triggerEl, panelEl,
  setOpen(next: boolean, focus: FocusTarget = 'none') { level.setOpenSub(next ? id : null, focus) },
})
</script>

<template><slot /></template>
