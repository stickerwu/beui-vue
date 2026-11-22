<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { useComboContext } from './combo-context'
import './combo.css'

/** The search input beside the chips. Extra attributes and listeners go to the `<input>`. */
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{
  /** Show a search glyph before the input. */
  showIcon?: boolean
}>(), { showIcon: false })
const attrs = useAttrs()
const context = useComboContext('MultiSelectInput')
function setInput(el: unknown) { context.inputEl.value = el as HTMLInputElement | null }

function onPointerDown(event: PointerEvent) {
  if (event.defaultPrevented || context.open.value) return
  context.setOpen(true)
}
function onInput(event: Event) {
  context.setOpen(true)
  context.setQuery((event.target as HTMLInputElement).value)
}
function onKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented) return
  if (event.key === 'Backspace' && !context.query.value && context.values.value.length) {
    event.preventDefault()
    context.remove(context.values.value[context.values.value.length - 1])
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
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
  <div class="be-combo-field is-multi">
    <svg v-if="showIcon" class="be-combo-search" aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
    <input
      v-bind="attrs" :id="context.inputId" :ref="setInput" class="be-combo-input is-multi"
      role="combobox" autocomplete="off" aria-autocomplete="list" :aria-label="(attrs['aria-label'] as string | undefined) ?? context.t('inputLabel')"
      :aria-expanded="context.open.value" :aria-controls="context.listId" :aria-activedescendant="context.open.value ? context.activeItemId.value : undefined"
      :disabled="context.disabled.value" :value="context.query.value"
      :placeholder="context.values.value.length ? '' : (attrs.placeholder as string | undefined) ?? context.t('inputPlaceholder')"
      @pointerdown="onPointerDown" @focus="context.setOpen(true)" @click="context.setOpen(true)" @input="onInput" @keydown="onKeyDown"
    >
  </div>
</template>
