<script lang="ts">
export { selectMessages, type SelectMessages } from './messages'
</script>

<script setup lang="ts">
import { animate, useMotionValue } from 'motion-v'
import { useReducedMotion } from '../../core/reduced-motion'
import { computed, onBeforeUnmount, provide, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { easeOut } from '../../core/motion'
import type { ChoiceOption } from '../types'
import { selectMessages, type SelectMessages } from './messages'
import { selectKey, type SelectContext } from './select-context'
import SelectContent from './SelectContent.vue'
import SelectItem from './SelectItem.vue'
import SelectTrigger from './SelectTrigger.vue'
import SelectValue from './SelectValue.vue'

// One progress value drives the surface, gap, corners and chevron. This short spring suits the full reveal
// distance; each reader clamps its small internal overshoot, so all visible endpoints settle together.
const UNFOLD_SPRING = { type: 'spring', visualDuration: 0.2, bounce: 0.12 } as const
// Exits are faster than entrances: the panel folds back on a short ease.
const UNFOLD_EXIT = { duration: 0.2, ease: easeOut } as const

const props = withDefaults(defineProps<{
  /** Selected value (`v-model`). Leave unset for an uncontrolled select that starts at `defaultValue`. */
  modelValue?: string
  defaultValue?: string
  /**
   * Controlled open state of the panel (`v-model:open`). A layout that stacks selects can hold
   * this to keep exactly one panel open — the panel is absolutely positioned inside its field,
   * so two open at once paint over each other's options.
   */
  open?: boolean
  /** Uncontrolled initial open state. Default false. */
  defaultOpen?: boolean
  disabled?: boolean
  /** Shortcut for the common case: renders a trigger, a value and one item per option instead of the default slot. */
  options?: readonly ChoiceOption[]
  /** Placeholder shown by the shortcut's value while nothing is selected. */
  placeholder?: string
  /** Accessible name for the list. Falls back to the trigger. */
  label?: string
  /** Form field name; renders a hidden input carrying the selected value. */
  name?: string
  /** Override any built-in string. */
  labels?: Partial<SelectMessages>
}>(), { open: undefined, defaultOpen: false, disabled: false })
const emit = defineEmits<{ 'update:modelValue': [value: string]; 'update:open': [open: boolean] }>()
defineSlots<{
  /** `SelectTrigger`, `SelectContent` and their children. */
  default?: () => unknown
  /** With `options`: replaces the trigger's value. */
  value?: (props: { option?: ChoiceOption }) => unknown
  /** With `options`: replaces an item's content. */
  option?: (props: { option: ChoiceOption; selected: boolean }) => unknown
}>()

const reduce = useReducedMotion()
const uid = useId()
const triggerId = `${uid}-trigger`
const listId = `${uid}-list`
const root = useTemplateRef<HTMLElement>('root')

const internalValue = shallowRef(props.defaultValue)
const current = computed(() => props.modelValue !== undefined ? props.modelValue : internalValue.value)
const internalOpen = shallowRef(props.defaultOpen)
const open = computed(() => props.open !== undefined ? props.open : internalOpen.value)
const progress = useMotionValue(open.value ? 1 : 0)
const placement = shallowRef<'bottom' | 'top'>('bottom')
const registry = shallowRef(new Map<string, { label: string; disabled: boolean }>())

function setOpen(next: boolean) {
  if (props.open === undefined) internalOpen.value = next
  if (next !== open.value) emit('update:open', next)
}

// The panel turns inert as it closes, which would drop focus held inside it on the page body. Hand it back to
// the trigger before that happens.
function close() {
  const trigger = document.getElementById(triggerId)
  if (root.value?.contains(document.activeElement) && document.activeElement !== trigger) trigger?.focus()
  setOpen(false)
}
function select(next: string) {
  if (props.modelValue === undefined) internalValue.value = next
  emit('update:modelValue', next)
  close()
}

function register(value: string, label: string, disabled: boolean) {
  const entry = registry.value.get(value)
  if (entry?.label === label && entry.disabled === disabled) return
  registry.value = new Map(registry.value).set(value, { label, disabled })
}
function unregister(value: string) {
  if (!registry.value.has(value)) return
  const next = new Map(registry.value)
  next.delete(value)
  registry.value = next
}
const rows = computed(() => Array.from(registry.value, ([id, entry]) => ({ id, label: entry.label, disabled: entry.disabled })))

// Reduced motion has no travel, so the progress only carries a short fade.
let animation: ReturnType<typeof animate> | undefined
watch([open, reduce], ([isOpen, reduced]) => {
  animation?.stop()
  animation = animate(progress, isOpen ? 1 : 0, reduced ? { duration: 0.12 } : isOpen ? UNFOLD_SPRING : UNFOLD_EXIT)
}, { flush: 'sync' })
onBeforeUnmount(() => animation?.stop())

// Close on outside pointer / Escape.
watch(open, (isOpen, _, onCleanup) => {
  if (!isOpen) return
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
  const onPointer = (event: PointerEvent) => { if (root.value && !root.value.contains(event.target as Node)) setOpen(false) }
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onPointer)
  onCleanup(() => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onPointer) })
}, { immediate: true })

const selectedOption = computed(() => props.options?.find(option => option.value === current.value))

const context: SelectContext = {
  value: current,
  open,
  setOpen,
  select,
  register,
  unregister,
  labelFor: value => value === undefined ? undefined : registry.value.get(value)?.label,
  rows,
  close,
  reduce,
  progress,
  triggerId,
  listId,
  disabled: computed(() => props.disabled),
  placement,
  strings: computed(() => ({ ...selectMessages, ...props.labels })),
  label: computed(() => props.label),
}
provide(selectKey, context)
</script>

<template>
  <div ref="root" class="be-select">
    <input v-if="name && current !== undefined" type="hidden" :name="name" :value="current" :disabled="disabled">
    <slot>
      <template v-if="options">
        <SelectTrigger>
          <span v-if="$slots.value" class="be-select-value" :data-placeholder="selectedOption ? undefined : ''">
            <slot name="value" :option="selectedOption" />
          </span>
          <SelectValue v-else :placeholder="placeholder" />
        </SelectTrigger>
        <SelectContent>
          <template v-for="(option, index) in options" :key="option.value">
            <div v-if="option.group && option.group !== options[index - 1]?.group" class="be-select-group" aria-hidden="true">{{ option.group }}</div>
            <SelectItem :value="option.value" :disabled="option.disabled" :label="option.label">
              <slot name="option" :option="option" :selected="option.value === current">
                <span v-if="option.color" class="be-select-option"><span class="be-select-dot" :style="{ background: option.color }" />{{ option.label }}</span>
                <template v-else>{{ option.label }}</template>
              </slot>
            </SelectItem>
          </template>
        </SelectContent>
      </template>
    </slot>
  </div>
</template>

<style scoped>
.be-select { position: relative; box-sizing: border-box; }
.be-select-value { color: var(--beui-foreground); }
.be-select-value[data-placeholder] { color: var(--beui-muted-foreground); }
.be-select-option { display: inline-flex; align-items: center; gap: .5rem; }
.be-select-dot { width: .65rem; height: .65rem; border-radius: 50%; }
.be-select-group { padding: .375rem .625rem .125rem; color: var(--beui-muted-foreground); font-size: .75rem; }
</style>
