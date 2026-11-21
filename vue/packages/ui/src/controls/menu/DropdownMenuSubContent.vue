<script setup lang="ts">
import { AnimatePresence } from 'motion-v'
import { inject } from 'vue'
import MenuPanel from './MenuPanel.vue'
import { subKey, useLevel, useRoot } from './menu-shared'

defineOptions({ inheritAttrs: false })
// sideOffset is the gap between the parent menu edge and the submenu in px.
withDefaults(defineProps<{ sideOffset?: number }>(), { sideOffset: 6 })
const root = useRoot('DropdownMenuSubContent')
const level = useLevel('DropdownMenuSubContent')
const sub = inject(subKey, null)
if (!sub) throw new Error('DropdownMenuSubContent must be used within <DropdownMenuSub>')

function keyHook(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft') return false
  event.preventDefault()
  sub!.setOpen(false)
  sub!.triggerEl.value?.focus({ preventScroll: true })
  return true
}
function bind(node: unknown) { sub!.panelEl.value = (node as { $el?: HTMLElement } | null)?.$el ?? null }
</script>

<template>
  <Teleport to="body">
    <AnimatePresence>
      <MenuPanel
        v-if="sub.open.value" key="panel" v-bind="$attrs" :ref="bind" :id="sub.contentId" :anchor="sub.triggerEl.value" side="right" align="start"
        :side-offset="sideOffset" :focus="sub.focus.value" :labelled-by="sub.id" :key-hook="keyHook"
        @close="root.setOpen(false)" @pointer-enter="level.grace.current = null"
      ><slot /></MenuPanel>
    </AnimatePresence>
  </Teleport>
</template>
