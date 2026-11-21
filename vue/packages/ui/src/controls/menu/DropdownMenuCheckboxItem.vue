<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { panelSpring } from '../../core/motion'
import MenuItemBase from './MenuItemBase.vue'
import { useRoot } from './menu-shared'

// Stays open after a toggle by default, so the check can be seen landing.
const props = withDefaults(defineProps<{
  checked: boolean
  disabled?: boolean
  closeOnSelect?: boolean
  textValue?: string
}>(), { closeOnSelect: false })
const emit = defineEmits<{ 'update:checked': [checked: boolean]; checkedChange: [checked: boolean] }>()
const root = useRoot('DropdownMenuCheckboxItem')
function toggle() {
  emit('update:checked', !props.checked)
  emit('checkedChange', !props.checked)
}
</script>

<template>
  <MenuItemBase role="menuitemcheckbox" :checked="checked" :disabled="disabled" :close-on-select="closeOnSelect" :text-value="textValue" inset @select="toggle">
    <span aria-hidden="true" class="be-menu-indicator">
      <AnimatePresence :initial="false">
        <motion.span
          v-if="checked" key="check" class="be-menu-check"
          :initial="root.reduce.value ? { opacity: 0 } : { opacity: 0, scale: 0.6 }" :animate="{ opacity: 1, scale: 1 }"
          :exit="root.reduce.value ? { opacity: 0 } : { opacity: 0, scale: 0.6 }" :transition="root.reduce.value ? { duration: 0.1 } : panelSpring"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </motion.span>
      </AnimatePresence>
    </span>
    <slot />
  </MenuItemBase>
</template>
