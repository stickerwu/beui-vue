<script setup lang="ts">
import { onBeforeUnmount, shallowRef, useId, useTemplateRef } from 'vue'
import FloatingPanel from './FloatingPanel.vue'

const { content, side = 'top', align = 'center', delay = 350, arrow = false, followCursor = false, label, shortcut, pressed, disabled = false, toolbar = false } = defineProps<{
  content: string; side?: 'top' | 'bottom' | 'left' | 'right'; align?: 'start' | 'end' | 'center'; delay?: number; arrow?: boolean; followCursor?: boolean
  label?: string; shortcut?: string; pressed?: boolean | null; disabled?: boolean; toolbar?: boolean
}>()
const emit = defineEmits<{ activate:[event:MouseEvent]; show:[]; hide:[] }>()
const anchor = useTemplateRef('anchor')
const id = useId()
const open = shallowRef(false)
const pointer = shallowRef<{ x: number; y: number }>()
let timer: number | undefined
function cancel() { window.clearTimeout(timer) }
function set(next: boolean, wait = 0) {
  cancel()
  const update = () => {
    if (open.value === next || next && disabled) return
    open.value = next
    if (next) emit('show')
    else emit('hide')
  }
  if (!wait) update()
  else timer = window.setTimeout(update, wait)
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
<template><span class="tip-anchor"><button ref="anchor" type="button" class="tip-trigger" :class="{toolbar}" :aria-label="label" :aria-keyshortcuts="shortcut" :aria-pressed="toolbar && pressed != null ? pressed : undefined" :disabled="disabled" :aria-describedby="open && !label ? id : undefined" @focus="focus" @blur="set(false)" @pointerenter="enter" @pointerleave="set(false, 160)" @pointermove="followCursor && (pointer = { x: $event.clientX, y: $event.clientY })" @pointerup="event => { if (event.pointerType === 'touch' && !toolbar) set(!open) }" @click="event => { if (toolbar) set(false); emit('activate',event) }"><slot /></button>
  <FloatingPanel :id="id" role="tooltip" :open="open" :anchor="anchor" :point="followCursor ? pointer : undefined" :side="side" :align="align" :gap="arrow ? 9 : 5" variant="tip" :data-arrow="arrow" class="tip-panel" @dismiss="set(false)" @pointerenter="cancel" @pointerleave="set(false, 120)">{{ content }}</FloatingPanel>
</span></template>
<style scoped>.tip-trigger.toolbar { display:grid; place-items:center; width:2rem; height:2rem; border:0; padding:0; font-size:1rem; } .toolbar:is(:hover,[aria-pressed=true]) { background:var(--beui-muted); } .toolbar:disabled { opacity:.4; cursor:default; }</style>
<style scoped>.tip-anchor { display: inline-flex; } .tip-trigger { border: 1px solid var(--beui-border); background: var(--beui-card); color: var(--beui-foreground); border-radius: .55rem; padding: .5rem .85rem; font: inherit; font-size: .8rem; cursor: pointer; } .tip-panel { color: var(--beui-background); background: var(--beui-foreground); padding: .35rem .65rem; font-size: .75rem; border: 0; border-radius: .5rem; overflow: visible; } .tip-panel[data-arrow=true]::after { content: ''; position: absolute; width: 7px; height: 7px; background: inherit; transform: rotate(45deg); } .tip-panel[data-side=top]::after { top: calc(100% - 4px); left: calc(50% - 3px); } .tip-panel[data-side=bottom]::after { bottom: calc(100% - 4px); left: calc(50% - 3px); } .tip-panel[data-side=left]::after { left: calc(100% - 4px); top: calc(50% - 3px); } .tip-panel[data-side=right]::after { right: calc(100% - 4px); top: calc(50% - 3px); }</style>
