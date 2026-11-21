<script lang="ts">
/** Actions revealed behind a list row. */
export type SwipeSide = 'left' | 'right'
export type SwipeActionTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
export type SwipeAction = {
  id: string
  label: string
  icon?: string
  tone?: SwipeActionTone
  disabled?: boolean
  onClick?: (item: SwipeableListItem) => void
}
export type SwipeableListItem = {
  id: string
  title?: string
  description?: string
  meta?: string
  leading?: string
  content?: string
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  disabled?: boolean
}
export type SwipeableListValue = { id: string; side: SwipeSide }
export type SwipeableListClassNames = {
  root?: string
  item?: string
  rail?: string
  action?: string
  surface?: string
  leading?: string
  content?: string
  title?: string
  description?: string
  meta?: string
}
export type SwipeableListActionPayload = { item: SwipeableListItem; action: SwipeAction; side: SwipeSide }
</script>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { swipeableListMessages } from './messages'
import SwipeableListRow from './SwipeableListRow.vue'

const props = withDefaults(defineProps<{
  items: readonly SwipeableListItem[]
  /** Controlled open row, as `{ id, side }`. */
  modelValue?: SwipeableListValue | null
  /** Alias of `modelValue`, kept from the original port. */
  value?: SwipeableListValue | null
  defaultValue?: SwipeableListValue | null
  /** Width of one revealed action button in px. */
  actionWidth?: number
  /** Minimum travel before a release opens a side, in px. */
  revealThreshold?: number
  /** Close the row after one of its actions runs. */
  closeOnAction?: boolean
  className?: string
  classNames?: SwipeableListClassNames
  labels?: Partial<typeof swipeableListMessages>
}>(), { defaultValue: null, actionWidth: 56, revealThreshold: 34, closeOnAction: true })

const emit = defineEmits<{
  'update:modelValue': [value: SwipeableListValue | null]
  valueChange: [value: SwipeableListValue | null]
  action: [payload: SwipeableListActionPayload]
}>()

defineSlots<{
  item?(props: { item: SwipeableListItem; index: number }): unknown
  /** Replaces the `leading` text of a row, e.g. with an icon tile. */
  leading?(props: { item: SwipeableListItem; index: number }): unknown
  /** Icon of an action button; defaults to `action.icon` or its first letter. */
  icon?(props: { action: SwipeAction; side: SwipeSide }): unknown
}>()

const localValue = shallowRef<SwipeableListValue | null>(props.defaultValue)
const openValue = computed<SwipeableListValue | null>(() =>
  props.modelValue !== undefined ? props.modelValue : props.value !== undefined ? props.value : localValue.value,
)
function setOpenValue(next: SwipeableListValue | null) {
  if (props.modelValue === undefined && props.value === undefined) localValue.value = next
  emit('update:modelValue', next)
  emit('valueChange', next)
}

const actionWidth = computed(() => Math.max(0, props.actionWidth))
const revealThreshold = computed(() => Math.max(0, props.revealThreshold))
const classNames = computed(() => props.classNames ?? {})
const labels = computed(() => ({ ...swipeableListMessages, ...props.labels }))

function handleAction(payload: SwipeableListActionPayload) {
  emit('action', payload)
}
</script>

<template>
  <div class="swipe-list" :class="[className, classNames.root]">
    <SwipeableListRow
      v-for="(item, index) in items"
      :key="item.id"
      :item="item"
      :index="index"
      :action-width="actionWidth"
      :reveal-threshold="revealThreshold"
      :open-value="openValue"
      :close-on-action="closeOnAction"
      :class-names="classNames"
      :labels="labels"
      @action="setOpenValue"
      @run="handleAction">
      <template v-if="$slots.item" #default="scope"><slot name="item" v-bind="scope" /></template>
      <template v-if="$slots.leading" #leading="scope"><slot name="leading" v-bind="scope" /></template>
      <template v-if="$slots.icon" #icon="scope"><slot name="icon" v-bind="scope" /></template>
    </SwipeableListRow>
  </div>
</template>

<style scoped>
.swipe-list { display: flex; flex-direction: column; width: 100%; gap: .5rem; }
</style>
