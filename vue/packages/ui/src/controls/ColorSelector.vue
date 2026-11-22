<script setup lang="ts">
import { LayoutGroup } from 'motion-v'
import { computed, provide, useId } from 'vue'
import { colorSelectorKey } from './color-selector-context'
import ColorSelectorItem from './ColorSelectorItem.vue'
import ColorSelectorLabel from './ColorSelectorLabel.vue'
import ColorSelectorList from './ColorSelectorList.vue'
import type { ChoiceOption } from './types'

/**
 * A single color choice. Compose it from `ColorSelectorLabel`, `ColorSelectorList`
 * and `ColorSelectorItem`, or pass `options` for the data-driven form.
 */
const props = withDefaults(defineProps<{
  /** Starting value when `v-model` is not bound. */
  defaultValue?: string
  /** The radio group name used in form submission. Generated when omitted. */
  name?: string
  disabled?: boolean
  required?: boolean
  form?: string
  /** Data-driven form: renders the label, list and one item per option when the default slot is empty. */
  options?: readonly ChoiceOption[]
  /** Legend text of the data-driven form. */
  label?: string
}>(), { defaultValue: '', disabled: false, required: false, label: 'Color' })
const model = defineModel<string>()
defineSlots<{
  /** `ColorSelectorLabel` and `ColorSelectorList` with its items. */
  default?(): unknown
}>()

const uid = useId()
const current = computed(() => model.value ?? props.defaultValue)
provide(colorSelectorKey, {
  value: current,
  select: next => { if (next !== current.value) model.value = next },
  name: computed(() => props.name ?? uid),
  disabled: computed(() => props.disabled),
  required: computed(() => props.required),
  form: computed(() => props.form),
})
</script>

<template>
  <fieldset class="be-color-selector" :disabled="disabled" :form="form">
    <LayoutGroup :id="uid">
      <slot>
        <template v-if="options">
          <ColorSelectorLabel>{{ label }}</ColorSelectorLabel>
          <ColorSelectorList>
            <ColorSelectorItem v-for="option in options" :key="option.value" :value="option.value" :color="option.color ?? option.value" :label="option.label" :disabled="option.disabled" />
          </ColorSelectorList>
        </template>
      </slot>
    </LayoutGroup>
  </fieldset>
</template>

<style>
.be-color-selector { min-width: 0; margin: 0; border: 0; padding: 0; }
.be-color-selector-label { margin-bottom: 0.75rem; padding: 0; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-muted-foreground); }
.be-color-selector-list { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; padding: 0.25rem; }
.be-color-selector-item { position: relative; display: inline-flex; flex-shrink: 0; border-radius: 9999px; cursor: pointer; }
.be-color-selector-item[data-unavailable] { cursor: not-allowed; opacity: 0.4; }
.be-color-selector-input { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.be-color-selector-swatch {
  position: relative; box-sizing: border-box; display: flex; width: 2.75rem; height: 2.75rem; align-items: center; justify-content: center;
  border-radius: 9999px; border: 1px solid color-mix(in oklab, var(--beui-foreground) 10%, transparent);
  background: color-mix(in oklab, var(--beui-muted) 60%, transparent);
}
.be-color-selector-input:focus-visible + .be-color-selector-swatch { outline: 2px solid var(--beui-foreground); outline-offset: 4px; }
.be-color-selector-ring { position: absolute; inset: -0.25rem; border-radius: 9999px; border: 2px solid; pointer-events: none; }
.be-color-selector-dot { box-sizing: border-box; width: 1.25rem; height: 1.25rem; border-radius: 9999px; border: 1px solid rgb(0 0 0 / 5%); }
</style>
