<script setup lang="ts">
import { nextTick, onBeforeUnmount, shallowRef, useTemplateRef } from 'vue'
import FloatingPanel from './FloatingPanel.vue'
import MenuRows from './MenuRows.vue'
import type { MenuItem } from './types'

const { items, label = 'Actions', context = false } = defineProps<{ items: readonly MenuItem[]; label?: string; context?: boolean }>()
const emit = defineEmits<{ select: [item: MenuItem] }>()
const open = defineModel<boolean>('open', { default: false })
const point = shallowRef<{ x: number; y: number }>()
const anchor = useTemplateRef('anchor')
const rows = useTemplateRef('rows')
let press: number | undefined
let start: { x: number; y: number } | undefined
let last = false

function launch(position?: { x: number; y: number }, focusLast = false) {
  point.value = position
  last = focusLast
  open.value = true
}
function cancelPress() { if (press !== undefined) window.clearTimeout(press); press = undefined; start = undefined }
function contextAt(event: MouseEvent) {
  if (!context) return
  event.preventDefault()
  cancelPress()
  launch({ x: event.clientX, y: event.clientY })
}
function key(event: KeyboardEvent) {
  if (context ? event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey) : ['ArrowDown','ArrowUp'].includes(event.key)) {
    event.preventDefault(); launch(undefined, event.key === 'ArrowUp')
  }
}
function pressStart(event: PointerEvent) {
  if (!context || event.pointerType !== 'touch') return
  cancelPress()
  start = { x: event.clientX, y: event.clientY }
  press = window.setTimeout(() => { launch(start); cancelPress() }, 500)
}
function close(reason?: string) {
  open.value = false
  if (reason === 'escape' || reason === 'select') anchor.value?.focus({ preventScroll: true })
}
function select(item: MenuItem) {
  emit('select', item)
  if (item.closeOnSelect !== false) close('select')
}
onBeforeUnmount(cancelPress)
</script>
<template><span class="menu-anchor"><button ref="anchor" type="button" class="menu-trigger" aria-haspopup="menu" :aria-expanded="open" :data-context="context"
  @click="!context && (open = !open)" @contextmenu="contextAt" @keydown="key" @pointerdown="pressStart" @pointerup="cancelPress" @pointercancel="cancelPress" @pointermove="start && Math.hypot($event.clientX - start.x, $event.clientY - start.y) > 8 && cancelPress()"><slot>{{ label }}</slot></button>
  <FloatingPanel :open="open" :anchor="anchor" :point="point" :variant="context ? 'morph' : 'slide'" dismiss-blur @dismiss="close" @placed="nextTick(() => rows?.focus(last))">
    <MenuRows ref="rows" :label="label" :items="items" @select="select" @close="close('escape')" />
  </FloatingPanel></span></template>
<style scoped>.menu-anchor { display: inline-flex; } .menu-trigger { min-height: 2.5rem; padding: .5rem 1.1rem; border: 1px solid var(--beui-border); border-radius: 99px; background: var(--beui-card); color: var(--beui-foreground); font: inherit; font-size: .875rem; cursor: pointer; } .menu-trigger[data-context=true] { border: 0; border-radius: .6rem; padding: .5rem; background: transparent; touch-action: pan-y; user-select: none; -webkit-touch-callout: none; }</style>
