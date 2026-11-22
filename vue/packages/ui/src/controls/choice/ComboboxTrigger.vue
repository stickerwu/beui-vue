<script setup lang="ts">
import { useComboContext } from './combo-context'
import './combo.css'

/** The field frame: holds the input and the chevrons, and opens the list when pressed. */
defineSlots<{ default?(): unknown }>()
const context = useComboContext('ComboboxTrigger')
function setTrigger(el: unknown) { context.triggerEl.value = el as HTMLElement | null }
function onPointerDown(event: PointerEvent) {
  if (context.disabled.value || event.target === context.inputEl.value) return
  event.preventDefault()
  context.inputEl.value?.focus({ preventScroll: true })
  context.setOpen(true)
}
</script>

<template>
  <div
    :id="context.triggerId" :ref="setTrigger" class="be-combo-trigger"
    :data-state="context.open.value ? 'open' : 'closed'" :data-disabled="context.disabled.value || undefined" @pointerdown="onPointerDown"
  >
    <span class="be-combo-slot"><slot /></span>
    <span aria-hidden="true" class="be-combo-chevrons"><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" /></svg></span>
  </div>
</template>
