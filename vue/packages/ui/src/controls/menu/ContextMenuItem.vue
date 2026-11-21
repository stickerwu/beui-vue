<script setup lang="ts">
import { motion } from 'motion-v'
import { useId } from 'vue'
import { layoutSpring } from '../../core/motion'
import { useContextRoot } from './context-shared'
import './menu.css'

const props = withDefaults(defineProps<{
  disabled?: boolean
  closeOnSelect?: boolean
  tone?: 'default' | 'destructive'
  inset?: boolean
  textValue?: string
  role?: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio'
  ariaChecked?: boolean
}>(), { closeOnSelect: true, tone: 'default', role: 'menuitem', ariaChecked: undefined })
const emit = defineEmits<{ select: [] }>()

const root = useContextRoot('ContextMenuItem')
const id = useId()

function onClick() {
  if (props.disabled) return
  emit('select')
  if (props.closeOnSelect) root.setOpen(false)
}
</script>

<template>
  <button
    :id="id" type="button" :role="role" :aria-checked="role === 'menuitem' ? undefined : ariaChecked" :disabled="disabled" data-context-menu-item="true"
    :data-disabled="disabled ? 'true' : undefined" :data-label="textValue" tabindex="-1" class="be-ctx-item" :data-tone="tone" :data-inset="inset ? '' : undefined"
    @focus="root.setActiveId(id)" @pointermove="(event: PointerEvent) => { if (!disabled && event.pointerType !== 'touch') (event.currentTarget as HTMLElement).focus() }" @click="onClick"
  >
    <motion.span
      v-if="root.activeId.value === id" :layout-id="`${root.menuId}-active`" class="be-ctx-highlight" :transition="root.reduce.value ? { duration: 0 } : layoutSpring"
    />
    <slot />
  </button>
</template>
