<script setup lang="ts">
import { useComboContext } from './combo-context'
import './combo.css'

/** The field frame: holds the chips and the input, and opens the list when pressed. */
defineSlots<{ default?(): unknown }>()
const context = useComboContext('MultiSelectTrigger')
function setTrigger(el: unknown) { context.triggerEl.value = el as HTMLElement | null }
function onPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement
  if (context.disabled.value || target === context.inputEl.value || target.closest('[data-multi-select-remove]')) return
  event.preventDefault()
  context.inputEl.value?.focus({ preventScroll: true })
  context.setOpen(true)
}
</script>

<template>
  <div
    :id="context.triggerId" :ref="setTrigger" class="be-combo-trigger is-multi"
    :data-state="context.open.value ? 'open' : 'closed'" :data-disabled="context.disabled.value || undefined" @pointerdown="onPointerDown"
  >
    <div class="be-combo-values"><slot /></div>
    <svg class="be-combo-chevrons" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg>
  </div>
</template>
