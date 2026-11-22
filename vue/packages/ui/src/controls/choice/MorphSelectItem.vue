<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, inject, onBeforeUnmount, onMounted, onUpdated, useSlots } from 'vue'
import { morphActiveKey, morphRegistrarKey, plainText, useMorphSelectContext } from './select-context'

defineOptions({ inheritAttrs: false })

const ITEM = { hidden: { opacity: 0, y: -6, filter: 'blur(3px)' }, show: { opacity: 1, y: 0, filter: 'blur(0px)' } }

const props = withDefaults(defineProps<{
  value: string
  disabled?: boolean
  /** Text shown in `MorphSelectValue` and used for typeahead. Defaults to the children's text, or `value` when they are not plain text. */
  label?: string
}>(), { disabled: false })
defineSlots<{ default?: () => unknown }>()

const ctx = useMorphSelectContext('MorphSelectItem')
const activeId = inject(morphActiveKey, undefined)
// The hidden copy only registers; no stray options outside the listbox.
const registrarOnly = inject(morphRegistrarKey, false)
const slots = useSlots()
const selected = computed(() => ctx.value.value === props.value)

// The label is read where the slot renders, so it stays reactive to the children; registration follows each
// render, once the row is in the document.
let registered: { value: string; label: string; disabled: boolean } | undefined
let latest = { value: props.value, label: props.value, disabled: props.disabled }
function track() {
  latest = { value: props.value, label: props.label ?? plainText(slots.default?.()) ?? props.value, disabled: props.disabled }
  return !registrarOnly
}
function sync() {
  if (registered) {
    if (registered.value === latest.value && registered.label === latest.label && registered.disabled === latest.disabled) return
    ctx.unregister(registered.value)
  }
  ctx.register(latest.value, latest.label, latest.disabled)
  registered = latest
}
onMounted(sync)
onUpdated(sync)
onBeforeUnmount(() => { if (registered) ctx.unregister(registered.value) })
</script>

<template>
  <motion.li v-if="track()" role="none" :variants="ctx.reduce.value ? undefined : ITEM">
    <button
      v-bind="$attrs" type="button" role="option" class="be-smorph-item" :aria-selected="selected" :disabled="disabled" :data-selected="selected || undefined"
      :tabindex="activeId === value ? 0 : -1" :data-listbox-id="value" @click="ctx.select(value)"
    >
      <slot />
      <svg v-if="selected" class="be-smorph-check" aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
    </button>
  </motion.li>
</template>

<style scoped>
.be-smorph-item { box-sizing: border-box; display: flex; width: 100%; align-items: center; justify-content: space-between; gap: .5rem; margin: 0; padding: .375rem .625rem; border: 0; border-radius: .5rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; text-align: left; outline: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1); }
@media (hover: hover) { .be-smorph-item:hover { background: var(--beui-muted); color: var(--beui-foreground); } }
.be-smorph-item:focus-visible { background: var(--beui-muted); }
.be-smorph-item[data-selected] { background: var(--beui-muted); color: var(--beui-foreground); }
.be-smorph-item:disabled { pointer-events: none; opacity: .5; cursor: default; }
.be-smorph-check { flex: none; }
</style>
