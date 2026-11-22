<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, inject, onBeforeUnmount, onMounted, onUpdated, shallowRef, useId, watch } from 'vue'
import { easeOut, layoutSpring } from '../../core/motion'
import { COMBO_GROUP_KEY, useComboContext } from './combo-context'
import './combo.css'

/** One option. Shared by `ComboboxItem` and `MultiSelectItem`. */
const props = withDefaults(defineProps<{
  value: string
  /** Plain-text label used for filtering, the input and chips. Defaults to the item's text when it is plain text, else `value`. */
  textValue?: string
  /** Extra words the filter matches besides the label. */
  keywords?: string[]
  disabled?: boolean
}>(), { keywords: () => [], disabled: false })
const emit = defineEmits<{
  /** Fires when this option is chosen. */
  select: [value: string]
}>()
defineSlots<{ default?(props: { selected: boolean; active: boolean }): unknown }>()

const INSTANT = { duration: 0 } as const
const context = useComboContext('ComboboxItem')
const groupId = inject(COMBO_GROUP_KEY, null)
const id = useId()
const itemEl = shallowRef<HTMLElement | null>(null)
const bodyEl = shallowRef<HTMLElement | null>(null)

// Plain-text children name the option, as a string child does upstream; anything richer needs `textValue`.
const domLabel = shallowRef<string | null>(null)
function readLabel() {
  const body = bodyEl.value
  if (props.textValue !== undefined || !body || body.childElementCount > 0) return
  const text = body.textContent?.trim()
  if (text) domLabel.value = text
}
onMounted(readLabel)
onUpdated(readLabel)
const label = computed(() => props.textValue ?? domLabel.value ?? props.value)

// Keyed by content, not array identity: a parent writing `:keywords="[...]"` inline passes a new array every render.
const keywordKey = computed(() => props.keywords.join('\u0000'))
const getElement = () => itemEl.value
watch([() => props.value, label, () => props.disabled, keywordKey], () => {
  context.registerItem({ value: props.value, label: label.value, keywords: [...props.keywords], disabled: props.disabled, groupId, id, el: getElement })
}, { immediate: true })
watch(() => props.value, (_, previous) => context.unregisterItem(previous))
onBeforeUnmount(() => context.unregisterItem(props.value))

function setItem(el: unknown) { itemEl.value = el as HTMLElement | null }
function setBody(el: unknown) { bodyEl.value = el as HTMLElement | null }
const active = computed(() => context.activeValue.value === props.value)
const selected = computed(() => context.values.value.includes(props.value))
const itemAttr = computed(() => ({ [`data-${context.kind}-item`]: '' }))
function onClick() {
  if (props.disabled) return
  emit('select', props.value)
  context.choose(props.value)
}
</script>

<template>
  <button
    v-if="context.isVisible(value)" :id="id" :ref="setItem" type="button" role="option" class="be-combo-item"
    :class="{ 'is-on': active || (context.multiple && selected) }" :aria-selected="selected" :disabled="disabled" tabindex="-1" v-bind="itemAttr"
    :data-active="active || undefined" :data-selected="selected || undefined"
    @pointermove="!disabled && context.setActiveValue(value)" @pointerdown.prevent @click="onClick"
  >
    <motion.span
      v-if="active" aria-hidden="true" class="be-combo-active" :layout-id="context.activeLayoutId"
      :transition="context.reduce.value ? INSTANT : layoutSpring"
    />
    <span :ref="setBody" class="be-combo-item-body"><slot :selected="selected" :active="active" /></span>
    <motion.span
      aria-hidden="true" class="be-combo-check" :initial="false"
      :animate="{ opacity: selected ? 1 : 0, transform: selected ? 'scale(1)' : 'scale(0.82)' }"
      :transition="context.reduce.value ? INSTANT : { duration: 0.14, ease: easeOut }"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
    </motion.span>
  </button>
</template>
