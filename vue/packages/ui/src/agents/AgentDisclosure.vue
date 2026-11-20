<script setup lang="ts">
import { watch } from 'vue'
import { Collapsible, CollapsibleContent, CollapsibleIndicator, CollapsibleTrigger } from '../primitives'
import { useOpenState } from '../primitives/state'
const props = withDefaults(defineProps<{ open?: boolean, defaultOpen?: boolean, active?: boolean, collapseOnComplete?: boolean, maxHeight?: number, contentClassName?: string }>(), { open: undefined, defaultOpen: true, active: undefined, collapseOnComplete: true, maxHeight: 220 })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open', next); emit('openChange', next) })
watch(() => props.active, (current, previous) => {
  if (current === true) setOpen(true)
  else if (previous && props.collapseOnComplete) setOpen(false)
})
</script>
<template>
  <Collapsible :open="open" class="be-agent-box" @update:open="setOpen">
    <div class="be-agent-row">
      <CollapsibleTrigger><slot name="title" /><CollapsibleIndicator /></CollapsibleTrigger>
      <slot name="actions" />
    </div>
    <CollapsibleContent><div class="be-disclosure-scroll" :class="contentClassName" :style="{ maxHeight: `${maxHeight}px` }"><slot /></div></CollapsibleContent>
  </Collapsible>
</template>
<style scoped>.be-disclosure-scroll { overflow:auto; overscroll-behavior:contain; }.be-agent-row > :deep(button:first-child){flex:1;min-width:0}</style>
