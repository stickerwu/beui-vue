<script setup lang="ts">
import { computed, inject } from 'vue'
import { PARTS_KEY } from './tip-shared'

defineOptions({ inheritAttrs: false })
/**
 * The element a `Tooltip` anchors to when composed from parts. Renders a `<button>`; with
 * `asChild` it renders its single child element instead and that element becomes the trigger.
 */
const { asChild = false } = defineProps<{
  /** Use the single child element as the trigger instead of rendering a button. */
  asChild?: boolean
}>()
defineSlots<{ default?(): unknown }>()
const parts = inject(PARTS_KEY, null)
const state = computed(() => (parts?.open.value ? 'open' : 'closed'))
</script>

<template>
  <slot v-if="asChild" />
  <button v-else type="button" :data-state="state" v-bind="$attrs"><slot /></button>
</template>
