<script setup lang="ts">
import { AnimatePresence } from 'motion-v'
import MenuPanel from './MenuPanel.vue'
import { useMenuDismiss, useRoot, type Align } from './menu-shared'

defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{
  /** Preferred side. Flips when the viewport has no room. Default "bottom". */
  side?: 'top' | 'bottom'
  /** Default "start". */
  align?: Align
  /** Gap between trigger and menu in px. Default 6. */
  sideOffset?: number
}>(), { side: 'bottom', align: 'start', sideOffset: 6 })

const root = useRoot('DropdownMenuContent')
function close() { root.setOpen(false) }
useMenuDismiss(root.open, close, target =>
  Boolean(root.triggerEl.value?.contains(target)) || Boolean(target.closest(`[data-menu-root="${CSS.escape(root.menuId)}"]`)))
</script>

<template>
  <Teleport v-if="root.mounted.value" to="body">
    <AnimatePresence>
      <MenuPanel
        v-if="root.open.value" key="panel" v-bind="$attrs" :id="root.menuId" :anchor="root.triggerEl.value" :side="side" :align="align" :side-offset="sideOffset"
        :focus="root.focusTarget.value" :labelled-by="root.triggerEl.value?.id ?? root.triggerId" @close="close"
      ><slot /></MenuPanel>
    </AnimatePresence>
  </Teleport>
</template>
