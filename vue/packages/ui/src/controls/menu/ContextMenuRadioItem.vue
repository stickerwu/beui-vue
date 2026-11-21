<script setup lang="ts">
import { computed, inject } from 'vue'
import ContextMenuItem from './ContextMenuItem.vue'
import { contextRadioKey } from './context-shared'

const props = withDefaults(defineProps<{ value: string; disabled?: boolean; closeOnSelect?: boolean; tone?: 'default' | 'destructive'; inset?: boolean; textValue?: string }>(), { closeOnSelect: true, tone: 'default' })
const emit = defineEmits<{ select: [] }>()
const group = inject(contextRadioKey, null)
if (!group) throw new Error('ContextMenuRadioItem must be used within <ContextMenuRadioGroup>')
const checked = computed(() => group.value.value === props.value)
</script>

<template>
  <ContextMenuItem role="menuitemradio" :aria-checked="checked" :disabled="disabled" :close-on-select="closeOnSelect" :tone="tone" :inset="inset" :text-value="textValue" @select="group.select(value); emit('select')">
    <span class="be-ctx-slot"><span class="be-ctx-dot" :style="{ opacity: checked ? 1 : 0 }" /></span>
    <slot />
  </ContextMenuItem>
</template>
