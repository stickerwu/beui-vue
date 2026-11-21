<script lang="ts">
export { centerMorphModalMessages, type CenterMorphModalMessages } from './center-morph-context'
</script>

<script setup lang="ts">
import { computed, provide, useId } from 'vue'
import { centerMorphModalKey, centerMorphModalMessages, type CenterMorphModalMessages } from './center-morph-context'
import CenterMorphModalContent from './CenterMorphModalContent.vue'
import CenterMorphModalTrigger from './CenterMorphModalTrigger.vue'

/**
 * A modal whose full-size surface unfolds outward from its exact center. Compose
 * it from `CenterMorphModalTrigger` and `CenterMorphModalContent`, or give the
 * `trigger` slot (and the default slot as the content) for the one-piece form.
 */
const props = withDefaults(defineProps<{
  /** Initial state when used uncontrolled. */
  defaultOpen?: boolean
  /** Accessible name of the dialog in the one-piece form. */
  label?: string
  labels?: Partial<CenterMorphModalMessages>
}>(), { defaultOpen: false })
const open = defineModel<boolean>('open', { default: false })
if (props.defaultOpen && !open.value) open.value = true

const id = useId()
const labels = computed(() => ({ ...centerMorphModalMessages, ...props.labels }))
function setOpen(next: boolean) { open.value = next }
provide(centerMorphModalKey, {
  open, setOpen, triggerId: `${id}-trigger`, contentId: `${id}-content`,
  label: computed(() => props.label), labels,
})
</script>

<template>
  <template v-if="$slots.trigger">
    <CenterMorphModalTrigger><button type="button" class="be-cmm-trigger"><slot name="trigger" /></button></CenterMorphModalTrigger>
    <CenterMorphModalContent v-slot="{ close }"><slot :close="close" /></CenterMorphModalContent>
  </template>
  <slot v-else :open="open" :close="() => setOpen(false)" />
</template>

<style scoped>
.be-cmm-trigger { display: inline-flex; box-sizing: border-box; height: 2.5rem; align-items: center; justify-content: center; padding: 0 1.25rem; border: 0; border-radius: 999px; background: var(--beui-foreground); color: var(--beui-background); font: inherit; font-size: .875rem; font-weight: 500; line-height: 1.25rem; cursor: pointer; }
</style>
