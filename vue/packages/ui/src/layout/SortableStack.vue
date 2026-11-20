<script setup lang="ts" generic="Row extends { id: string; title: string; detail?: string }">
import { nextTick, shallowRef, useTemplateRef } from 'vue'

const { label = 'Sortable list' } = defineProps<{ label?: string }>()
const items = defineModel<Row[]>({ required: true })
const list = useTemplateRef('list')
const picked = shallowRef<string>()
const announcement = shallowRef('')
const history = shallowRef<Row[]>()
let original: Row[] | undefined
let pointer: number | undefined

function start(id: string) { original = [...items.value]; picked.value = id }
function move(index: number) {
  if (!picked.value || index < 0 || index >= items.value.length) return
  const from = items.value.findIndex(row => row.id === picked.value)
  if (from < 0 || from === index) return
  const next = [...items.value]
  const [moving] = next.splice(from,1)
  next.splice(index,0,moving!)
  items.value = next
  announcement.value = `${moving!.title}, position ${index + 1} of ${next.length}`
}
function finish(cancel = false) {
  if (original && picked.value) {
    if (cancel) items.value = original
    else if (original.some((row,index) => items.value[index]?.id !== row.id)) history.value = original
  }
  const id = picked.value
  picked.value = undefined
  pointer = undefined
  original = undefined
  if (id) nextTick(() => list.value?.querySelector<HTMLButtonElement>(`[data-handle="${CSS.escape(id)}"]`)?.focus({ preventScroll: true }))
}
function keys(event: KeyboardEvent, id: string, index: number) {
  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); picked.value ? finish() : start(id); return }
  if (picked.value !== id) return
  if (event.key === 'Escape') { event.preventDefault(); finish(true); return }
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
  event.preventDefault()
  move(index + (event.key === 'ArrowDown' ? 1 : -1))
  nextTick(() => list.value?.querySelector<HTMLButtonElement>(`[data-handle="${CSS.escape(id)}"]`)?.focus())
}
function down(event: PointerEvent, id: string) {
  if (event.button !== 0 || pointer !== undefined) return
  pointer = event.pointerId
  start(id)
  list.value?.setPointerCapture(event.pointerId)
}
function drag(event: PointerEvent) {
  if (event.pointerId !== pointer || !list.value) return
  const rows = [...list.value.children] as HTMLElement[]
  const index = rows.findIndex(element => event.clientY <= element.getBoundingClientRect().bottom)
  move(index < 0 ? rows.length - 1 : index)
}
</script>
<template><div class="stack"><ol ref="list" :aria-label="label" @pointermove="drag" @pointerup="pointer === $event.pointerId && finish()" @pointercancel="finish(true)">
  <li v-for="(item,index) in items" :key="item.id" :data-dragging="picked === item.id">
    <button type="button" class="handle" :data-handle="item.id" :aria-label="`Reorder ${item.title}`" :aria-pressed="picked === item.id" @keydown="keys($event,item.id,index)" @pointerdown="down($event,item.id)">⠿</button>
    <slot :item="item" :index="index"><div><strong>{{ item.title }}</strong><small v-if="item.detail">{{ item.detail }}</small></div></slot><span class="position">{{ String(index + 1).padStart(2,'0') }}</span>
  </li></ol><button v-if="history" type="button" class="undo" @click="items = history; history = undefined; announcement = 'Order restored'">Undo</button><span class="sr" role="status">{{ announcement }}</span></div></template>
<style scoped>
.stack { width: min(100%,28rem); } .stack ol { padding: 0; margin: 0; list-style: none; display: grid; gap: .5rem; }
.stack li { padding: .65rem; display: flex; align-items: center; gap: .75rem; border: 1px solid var(--beui-border); background: var(--beui-card); border-radius: .85rem; margin: 0; }
.stack li[data-dragging=true] { box-shadow: 0 4px 14px rgb(0 0 0 / .15); border-color: var(--beui-ring); }
.handle,.undo { border: 0; background: transparent; color: var(--beui-muted-foreground); font: inherit; cursor: pointer; }
.handle { touch-action: none; cursor: grab; padding: .4rem; font-size: 1.3rem; } .stack strong { font-size: .875rem; font-weight: 500; } .stack small { display: block; color: var(--beui-muted-foreground); } .position { margin-inline-start: auto; font: .7rem monospace; } .undo { margin-top: .5rem; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
