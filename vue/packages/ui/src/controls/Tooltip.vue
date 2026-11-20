<script setup lang="ts">
import { onBeforeUnmount, shallowRef, useId, useTemplateRef } from 'vue'
import FloatingPanel from './FloatingPanel.vue'

const { content, side = 'top', align = 'center', delay = 350, arrow = false, followCursor = false } = defineProps<{
  content: string; side?: 'top' | 'bottom' | 'left' | 'right'; align?: 'start' | 'end' | 'center'; delay?: number; arrow?: boolean; followCursor?: boolean
}>()
const anchor = useTemplateRef('anchor')
const id = useId()
const open = shallowRef(false)
const pointer = shallowRef<{ x: number; y: number }>()
let timer: number | undefined
function cancel() { window.clearTimeout(timer) }
function set(next: boolean, wait = 0) {
  cancel()
  if (!wait) open.value = next
  else timer = window.setTimeout(() => { open.value = next }, wait)
}
function enter(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return
  pointer.value = { x: event.clientX, y: event.clientY }
  set(true, delay)
}
function focus(event: FocusEvent) {
  pointer.value = undefined
  if ((event.currentTarget as HTMLElement).matches(':focus-visible')) set(true)
}
onBeforeUnmount(() => { if (timer !== undefined) cancel() })
</script>
<template><span class="tip-anchor"><button ref="anchor" type="button" class="tip-trigger" :aria-describedby="open ? id : undefined" @focus="focus" @blur="set(false)" @pointerenter="enter" @pointerleave="set(false, 160)" @pointermove="followCursor && (pointer = { x: $event.clientX, y: $event.clientY })" @pointerup="event => { if (event.pointerType === 'touch') set(!open) }"><slot /></button>
  <FloatingPanel :id="id" role="tooltip" :open="open" :anchor="anchor" :point="followCursor ? pointer : undefined" :side="side" :align="align" :gap="arrow ? 9 : 5" variant="tip" :data-arrow="arrow" class="tip-panel" @dismiss="set(false)" @pointerenter="cancel" @pointerleave="set(false, 120)">{{ content }}</FloatingPanel>
</span></template>
<style scoped>.tip-anchor { display: inline-flex; } .tip-trigger { border: 1px solid var(--beui-border); background: var(--beui-card); color: var(--beui-foreground); border-radius: .55rem; padding: .5rem .85rem; font: inherit; font-size: .8rem; cursor: pointer; } .tip-panel { color: var(--beui-background); background: var(--beui-foreground); padding: .35rem .65rem; font-size: .75rem; border: 0; border-radius: .5rem; overflow: visible; } .tip-panel[data-arrow=true]::after { content: ''; position: absolute; width: 7px; height: 7px; background: inherit; transform: rotate(45deg); } .tip-panel[data-side=top]::after { top: calc(100% - 4px); left: calc(50% - 3px); } .tip-panel[data-side=bottom]::after { bottom: calc(100% - 4px); left: calc(50% - 3px); } .tip-panel[data-side=left]::after { left: calc(100% - 4px); top: calc(50% - 3px); } .tip-panel[data-side=right]::after { right: calc(100% - 4px); top: calc(50% - 3px); }</style>
