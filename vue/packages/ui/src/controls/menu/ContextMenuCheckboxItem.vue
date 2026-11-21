<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { panelSpring } from '../../core/motion'
import ContextMenuItem from './ContextMenuItem.vue'
import { useContextRoot } from './context-shared'

const props = withDefaults(defineProps<{ checked: boolean; disabled?: boolean; closeOnSelect?: boolean; tone?: 'default' | 'destructive'; inset?: boolean; textValue?: string }>(), { closeOnSelect: true, tone: 'default' })
const emit = defineEmits<{ 'update:checked': [checked: boolean]; checkedChange: [checked: boolean] }>()
const root = useContextRoot('ContextMenuCheckboxItem')
function toggle() { emit('update:checked', !props.checked); emit('checkedChange', !props.checked) }
</script>

<template>
  <ContextMenuItem role="menuitemcheckbox" :aria-checked="checked" :disabled="disabled" :close-on-select="closeOnSelect" :tone="tone" :inset="inset" :text-value="textValue" @select="toggle">
    <span class="be-ctx-slot">
      <AnimatePresence :initial="false">
        <motion.span
          v-if="checked" key="check" :initial="root.reduce.value ? false : { opacity: 0, scale: 0.75 }" :animate="{ opacity: 1, scale: 1 }"
          :exit="{ opacity: 0, scale: root.reduce.value ? 1 : 0.75 }" :transition="root.reduce.value ? { duration: 0.08 } : panelSpring" style="display: flex"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </motion.span>
      </AnimatePresence>
    </span>
    <slot />
  </ContextMenuItem>
</template>
