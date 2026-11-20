<script setup lang="ts">
import { nextTick, onBeforeUnmount, useId, useTemplateRef } from 'vue'
import FloatingPanel from './FloatingPanel.vue'

const { trigger = 'click', side = 'bottom', align = 'center', label = 'Details', morph = false } = defineProps<{
  trigger?: 'click' | 'hover'; side?: 'top' | 'bottom' | 'left' | 'right'; align?: 'start' | 'center' | 'end'; label?: string; morph?: boolean
}>()
const open = defineModel<boolean>('open', { default: false })
const id = useId()
const anchor = useTemplateRef('anchor')
let grace: number | undefined

function cancelGrace() { window.clearTimeout(grace) }
function close(reason = '') {
  open.value = false
  if (reason === 'escape') anchor.value?.focus()
}
function enter(event: PointerEvent) {
  cancelGrace()
  if (trigger === 'hover' && event.pointerType === 'mouse') open.value = true
}
function leave(event: PointerEvent) {
  if (trigger === 'hover' && event.pointerType === 'mouse') grace = window.setTimeout(() => close(), 180)
}
function focusContent() {
  if (trigger === 'hover') return
  nextTick(() => document.getElementById(id)?.querySelector<HTMLElement>('input:not(:disabled), button:not(:disabled), a[href], select, textarea, [tabindex="0"]')?.focus({ preventScroll: true }))
}
onBeforeUnmount(() => { if (grace !== undefined) cancelGrace() })
</script>
<template><span class="popover-anchor"><button ref="anchor" type="button" class="popover-trigger" :aria-expanded="open" :aria-controls="open ? id : undefined" aria-haspopup="dialog"
  @click="open = !open" @pointerenter="enter" @pointerleave="leave" @keydown.down.prevent="open = true"><slot name="trigger">{{ label }}</slot></button>
  <FloatingPanel :id="id" role="dialog" :aria-label="label" :open="open" :anchor="anchor" :side="side" :align="align" :variant="morph ? 'morph' : 'goo'" dismiss-blur class="popover-content"
    @dismiss="close" @placed="focusContent" @pointerenter="cancelGrace" @pointerleave="leave"><slot :close="() => close('escape')" /></FloatingPanel>
</span></template>
<style scoped>.popover-anchor { display: inline-flex; } .popover-trigger { min-height: 2.5rem; border-radius: .75rem; padding: .4rem 1rem; border: 1px solid var(--beui-border); background: var(--beui-card); color: var(--beui-foreground); font: inherit; font-size: .875rem; font-weight: 500; cursor: pointer; } .popover-content { padding: .9rem; font-size: .875rem; }</style>
