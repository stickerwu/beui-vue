<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, inject } from 'vue'
import { panelSpring } from '../../core/motion'
import MenuItemBase from './MenuItemBase.vue'
import { radioKey, useRoot } from './menu-shared'

// Stays open after a pick by default, so the dot can be seen moving.
const props = withDefaults(defineProps<{ value: string; disabled?: boolean; closeOnSelect?: boolean; textValue?: string }>(), { closeOnSelect: false })
const emit = defineEmits<{ select: [] }>()
const root = useRoot('DropdownMenuRadioItem')
const group = inject(radioKey, null)
if (!group) throw new Error('DropdownMenuRadioItem must be used within <DropdownMenuRadioGroup>')
const checked = computed(() => group.value.value === props.value)
</script>

<template>
  <MenuItemBase role="menuitemradio" :checked="checked" :disabled="disabled" :close-on-select="closeOnSelect" :text-value="textValue" inset @select="group.select(value); emit('select')">
    <span aria-hidden="true" class="be-menu-indicator">
      <motion.span
        :initial="false" :animate="root.reduce.value ? { opacity: checked ? 1 : 0 } : { opacity: checked ? 1 : 0, scale: checked ? 1 : 0.4 }"
        :transition="root.reduce.value ? { duration: 0.1 } : panelSpring" class="be-menu-dot"
      />
    </span>
    <slot />
  </MenuItemBase>
</template>
