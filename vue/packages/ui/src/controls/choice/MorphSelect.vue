<script lang="ts">
export { selectMessages as selectMorphMessages, type SelectMessages as SelectMorphMessages } from './messages'
</script>

<script setup lang="ts">
import { useReducedMotion } from '../../core/reduced-motion'
import { computed, nextTick, provide, shallowRef, useId, useTemplateRef, watch } from 'vue'
import type { ChoiceOption } from '../types'
import { selectMessages, type SelectMessages } from './messages'
import { morphSelectKey, type MorphSelectContext } from './select-context'
import MorphSelectContent from './MorphSelectContent.vue'
import MorphSelectItem from './MorphSelectItem.vue'
import MorphSelectTrigger from './MorphSelectTrigger.vue'
import MorphSelectValue from './MorphSelectValue.vue'

const props = withDefaults(defineProps<{
  /** Selected value (`v-model`). Leave unset for an uncontrolled select that starts at `defaultValue`. */
  modelValue?: string
  defaultValue?: string
  disabled?: boolean
  /** Shortcut for the common case: renders a trigger, a value and one item per option instead of the default slot. */
  options?: readonly ChoiceOption[]
  /** Placeholder shown by the shortcut's value while nothing is selected. */
  placeholder?: string
  /** Accessible name for the list. Falls back to the panel header. */
  label?: string
  /** Form field name; renders a hidden input carrying the selected value. */
  name?: string
  /** Override any built-in string. */
  labels?: Partial<SelectMessages>
}>(), { disabled: false })
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
defineSlots<{
  /** `MorphSelectTrigger`, `MorphSelectContent` and their children. */
  default?: () => unknown
  /** With `options`: replaces the trigger's value. */
  value?: (props: { option?: ChoiceOption }) => unknown
  /** With `options`: replaces an item's content. */
  option?: (props: { option: ChoiceOption; selected: boolean }) => unknown
}>()

const reduce = useReducedMotion()
const uid = useId()
const root = useTemplateRef<HTMLElement>('root')
const triggerRef = shallowRef<HTMLElement | null>(null)
const strings = computed(() => ({ ...selectMessages, ...props.labels }))
// Set when the panel closes holding focus: the trigger is unmounted while open, so focus can only go back once it
// has mounted again.
let restoreFocus = false
const open = shallowRef(false)
const internalValue = shallowRef(props.defaultValue)
const current = computed(() => props.modelValue !== undefined ? props.modelValue : internalValue.value)
// Ref-counted: items render twice (hidden registrar + open panel), so a label is only dropped once every copy
// with that value has unmounted.
const registry = shallowRef(new Map<string, { label: string; disabled: boolean; count: number }>())
const headerPlaceholder = shallowRef(selectMessages.valuePlaceholder)

function setOpen(next: boolean) { open.value = next }
function close() {
  if (root.value?.contains(document.activeElement)) restoreFocus = true
  open.value = false
}
function select(next: string) {
  if (props.modelValue === undefined) internalValue.value = next
  emit('update:modelValue', next)
  close()
}
watch(open, async isOpen => {
  if (isOpen || !restoreFocus) return
  restoreFocus = false
  await nextTick()
  triggerRef.value?.focus()
}, { flush: 'post' })

function register(value: string, label: string, disabled: boolean) {
  registry.value = new Map(registry.value).set(value, { label, disabled, count: (registry.value.get(value)?.count ?? 0) + 1 })
}
function unregister(value: string) {
  const entry = registry.value.get(value)
  if (!entry) return
  const next = new Map(registry.value)
  if (entry.count <= 1) next.delete(value)
  else next.set(value, { ...entry, count: entry.count - 1 })
  registry.value = next
}
const rows = computed(() => Array.from(registry.value, ([id, entry]) => ({ id, label: entry.label, disabled: entry.disabled })))

watch(open, (isOpen, _, onCleanup) => {
  if (!isOpen) return
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
  const onPointer = (event: PointerEvent) => { if (root.value && !root.value.contains(event.target as Node)) open.value = false }
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onPointer)
  onCleanup(() => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onPointer) })
})

const selectedOption = computed(() => props.options?.find(option => option.value === current.value))

const context: MorphSelectContext = {
  value: current,
  open: computed(() => open.value),
  setOpen,
  select,
  register,
  unregister,
  labelFor: value => value === undefined ? undefined : registry.value.get(value)?.label,
  rows,
  close,
  triggerRef,
  placeholder: headerPlaceholder,
  setPlaceholder: next => { headerPlaceholder.value = next },
  reduce,
  layoutId: `${uid}-surface`,
  triggerId: `${uid}-trigger`,
  listId: `${uid}-list`,
  headerId: `${uid}-header`,
  disabled: computed(() => props.disabled),
  strings,
  label: computed(() => props.label),
}
provide(morphSelectKey, context)
</script>

<template>
  <div ref="root" class="be-select-morph">
    <input v-if="name && current !== undefined" type="hidden" :name="name" :value="current" :disabled="disabled">
    <slot>
      <template v-if="options">
        <MorphSelectTrigger>
          <span v-if="$slots.value" class="be-smorph-value" :data-placeholder="selectedOption ? undefined : ''">
            <slot name="value" :option="selectedOption" />
          </span>
          <MorphSelectValue v-else :placeholder="props.placeholder" />
        </MorphSelectTrigger>
        <MorphSelectContent>
          <template v-for="(option, index) in options" :key="option.value">
            <li v-if="option.group && option.group !== options[index - 1]?.group" role="presentation" class="be-smorph-group" aria-hidden="true">{{ option.group }}</li>
            <MorphSelectItem :value="option.value" :disabled="option.disabled" :label="option.label">
              <slot name="option" :option="option" :selected="option.value === current">
                <span v-if="option.color" class="be-smorph-option"><span class="be-smorph-dot" :style="{ background: option.color }" />{{ option.label }}</span>
                <template v-else>{{ option.label }}</template>
              </slot>
            </MorphSelectItem>
          </template>
        </MorphSelectContent>
      </template>
    </slot>
  </div>
</template>

<style scoped>
.be-select-morph { position: relative; box-sizing: border-box; }
.be-smorph-value { color: var(--beui-foreground); }
.be-smorph-value[data-placeholder] { color: var(--beui-muted-foreground); }
.be-smorph-option { display: inline-flex; align-items: center; gap: .5rem; }
.be-smorph-dot { width: .65rem; height: .65rem; border-radius: 50%; }
.be-smorph-group { padding: .375rem .625rem .125rem; color: var(--beui-muted-foreground); font-size: .75rem; list-style: none; }
</style>
