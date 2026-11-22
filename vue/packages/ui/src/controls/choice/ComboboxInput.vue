<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { useComboContext } from './combo-context'
import './combo.css'

/** The search input. Extra attributes and listeners go to the `<input>`. */
defineOptions({ inheritAttrs: false })
defineProps<{
  /** Class for the element that wraps the icon and the input. */
  wrapperClassName?: string
}>()
const attrs = useAttrs()
const context = useComboContext('ComboboxInput')
function setInput(el: unknown) { context.inputEl.value = el as HTMLInputElement | null }
const selectedLabel = computed(() => context.labelFor(context.value.value))

function onPointerDown(event: PointerEvent) {
  if (event.defaultPrevented || context.open.value) return
  event.preventDefault()
  context.inputEl.value?.focus({ preventScroll: true })
  context.setOpen(true)
}
function onInput(event: Event) {
  context.setOpen(true)
  context.setQuery((event.target as HTMLInputElement).value)
}
function onKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented) return
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    // Opening is the whole action; the next key steps through the list the user can see.
    if (!context.open.value) { context.setOpen(true); return }
    context.moveActive(event.key === 'ArrowDown' ? 1 : -1)
  } else if (event.key === 'Home' && context.open.value) { event.preventDefault(); context.moveActive('first') }
  else if (event.key === 'End' && context.open.value) { event.preventDefault(); context.moveActive('last') }
  else if (event.key === 'Enter') {
    if (event.isComposing || event.keyCode === 229) return
    event.preventDefault()
    if (context.open.value) context.chooseActive()
    else context.setOpen(true)
  } else if (event.key === 'Escape' && context.open.value) { event.preventDefault(); context.setOpen(false, true) }
}
defineExpose({ input: computed(() => context.inputEl.value) })
</script>

<template>
  <div class="be-combo-field" :class="wrapperClassName">
    <svg class="be-combo-search" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
    <input
      v-bind="attrs" :id="context.inputId" :ref="setInput" class="be-combo-input"
      role="combobox" autocomplete="off" aria-autocomplete="list" :aria-label="(attrs['aria-label'] as string | undefined) ?? context.t('inputLabel')"
      :aria-expanded="context.open.value" :aria-controls="context.listId" :aria-activedescendant="context.open.value ? context.activeItemId.value : undefined"
      :disabled="context.disabled.value" :value="context.open.value ? context.query.value : selectedLabel ?? ''"
      :placeholder="(attrs.placeholder as string | undefined) ?? context.t('inputPlaceholder')"
      @pointerdown="onPointerDown" @focus="context.setOpen(true)" @click="context.setOpen(true)" @input="onInput" @keydown="onKeyDown"
    >
  </div>
</template>
