<script setup lang="ts">
import { computed, nextTick, shallowRef, useId } from 'vue'
import { useValue, type Labels } from './shared'
import { containsItems, flatten, moveItem, renameItem, type ResourceMove, type ResourceRow, type SidebarResource } from './tree'
const props = withDefaults(defineProps<{
  items?: SidebarResource[], defaultItems?: SidebarResource[], activeId?: string | null, defaultActiveId?: string | null, defaultExpandedIds?: string[], ariaLabel?: string, labels?: Labels,
  onMove?: (move: ResourceMove) => void | Promise<void>, onRename?: (item: SidebarResource, label: string) => void | Promise<void>
}>(), { defaultItems: () => [], defaultActiveId: null, defaultExpandedIds: () => [] })
const emit = defineEmits<{ 'update:items': [value: SidebarResource[]], itemsChange: [value: SidebarResource[]], 'update:activeId': [value: string], activeChange: [value: string], moveError: [error: unknown, move: ResourceMove] }>()
const store = useValue<SidebarResource[]>(() => props.items, props.defaultItems, next => { emit('update:items', next); emit('itemsChange', next) })
const selected = useValue<string | null>(() => props.activeId, props.defaultActiveId, next => { if (next) { emit('update:activeId', next); emit('activeChange', next) } })
const expanded = shallowRef(new Set(props.defaultExpandedIds))
const visible = computed(() => flatten(store.value.value, expanded.value))
const focusId = shallowRef<string | null>(null)
const renaming = shallowRef<string | null>(null)
const draft = shallowRef('')
const menu = shallowRef<string | null>(null)
const note = shallowRef('')
const pending = shallowRef(false)
const dragging = shallowRef<string | null>(null)
const drop = shallowRef<ResourceMove | null>(null)
const prefix = useId()
function expand(id: string, open: boolean) {
  const next = new Set(expanded.value)
  if (open) next.add(id)
  else next.delete(id)
  expanded.value = next
}
async function focus(id?: string | null) {
  if (!id) return
  focusId.value = id
  await nextTick()
  document.getElementById(`${prefix}-${id}`)?.focus()
}
function activate(item: SidebarResource) {
  if (item.disabled) return
  if (containsItems(item)) expand(item.id, !expanded.value.has(item.id))
  selected.set(item.id)
}
async function rename(item: SidebarResource) {
  if (item.disabled || pending.value) return
  menu.value = null
  draft.value = item.label
  renaming.value = item.id
  await nextTick()
  const input = document.getElementById(`${prefix}-rename`) as HTMLInputElement | null
  input?.focus(); input?.select()
}
async function finishRename(item: SidebarResource) {
  if (renaming.value !== item.id) return
  const label = draft.value.trim()
  renaming.value = null
  if (label && label !== item.label) {
    const previous = store.value.value
    pending.value = true
    store.set(renameItem(previous, item.id, label))
    try { await props.onRename?.(item, label) }
    catch { store.set(previous); note.value = `Rename failed. ${item.label} was restored.` }
    finally { pending.value = false }
  }
  await focus(item.id)
}
function commands(row: ResourceRow) {
  const index = row.siblings.findIndex(item => item.id === row.item.id)
  const above = row.siblings[index - 1], below = row.siblings[index + 1]
  return {
    up: above ? { itemId: row.item.id, targetId: above.id, position: 'before' as const } : null,
    down: below ? { itemId: row.item.id, targetId: below.id, position: 'after' as const } : null,
    into: above && containsItems(above) ? { itemId: row.item.id, targetId: above.id, position: 'inside' as const } : null,
    out: row.parentId ? { itemId: row.item.id, targetId: row.parentId, position: 'after' as const } : null,
  }
}
async function move(request: ResourceMove | null) {
  if (!request || pending.value) return
  const previous = store.value.value
  const next = moveItem(previous, request)
  if (!next) return
  pending.value = true
  menu.value = null
  store.set(next)
  if (request.targetId && request.position === 'inside') expand(request.targetId, true)
  try { await props.onMove?.(request); note.value = 'Resource moved.' }
  catch (error) { store.set(previous); note.value = 'Move failed. Resource restored.'; emit('moveError', error, request) }
  finally { pending.value = false; await focus(request.itemId) }
}
function keydown(event: KeyboardEvent, row: ResourceRow) {
  if (event.target !== event.currentTarget || row.item.disabled) return
  const { item } = row
  if (event.altKey && event.shiftKey) {
    const name = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'out', ArrowRight: 'into' } as const)[event.key as 'ArrowUp']
    if (name) { event.preventDefault(); move(commands(row)[name]) }
    return
  }
  const rows = visible.value.filter(entry => !entry.item.disabled)
  const index = rows.findIndex(entry => entry.item.id === item.id)
  switch (event.key) {
    case 'ArrowDown': focus(rows[index + 1]?.item.id); break
    case 'ArrowUp': focus(rows[index - 1]?.item.id); break
    case 'Home': focus(rows[0]?.item.id); break
    case 'End': focus(rows.at(-1)?.item.id); break
    case 'ArrowRight': if (containsItems(item) && !expanded.value.has(item.id)) expand(item.id, true); else focus(item.children?.find(child => !child.disabled)?.id); break
    case 'ArrowLeft': if (expanded.value.has(item.id)) expand(item.id, false); else focus(row.parentId); break
    case 'Enter': case ' ': activate(item); break
    case 'F2': rename(item); break
    case 'Escape': menu.value = null; break
    default: return
  }
  event.preventDefault()
}
function dragOver(event: DragEvent, row: ResourceRow) {
  if (!dragging.value) return
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const fraction = (event.clientY - box.top) / box.height
  const position = containsItems(row.item) && fraction > .25 && fraction < .75 ? 'inside' : fraction < .5 ? 'before' : 'after'
  drop.value = { itemId: dragging.value, targetId: row.item.id, position }
}
</script>
<template>
  <div class="be-resources"><div role="tree" :aria-label="ariaLabel ?? labels?.label ?? 'Resources'">
    <div v-for="row in visible" :key="row.item.id" class="be-resource-row" :style="{ paddingInlineStart: `${row.depth * 16}px` }" :data-drop="drop?.targetId === row.item.id ? drop.position : undefined"
      @dragover.prevent="dragOver($event, row)" @drop.prevent="move(drop); drop = null; dragging = null">
      <button v-if="renaming !== row.item.id" :id="`${prefix}-${row.item.id}`" type="button" role="treeitem" :aria-label="row.item.label" :aria-level="row.depth + 1" :aria-selected="selected.value.value === row.item.id"
        :aria-expanded="containsItems(row.item) ? expanded.has(row.item.id) : undefined" :disabled="row.item.disabled" :tabindex="(focusId ?? visible.find(entry => !entry.item.disabled)?.item.id) === row.item.id ? 0 : -1"
        :draggable="!row.item.disabled" @dragstart="dragging = row.item.id; $event.dataTransfer?.setData('text/plain', row.item.id)" @dragend="dragging = null; drop = null" @focus="focusId = row.item.id" @keydown="keydown($event, row)" @click="activate(row.item)">
        <slot name="icon" :item="row.item"><span aria-hidden="true">{{ containsItems(row.item) ? (expanded.has(row.item.id) ? '▾' : '▸') : '·' }}</span></slot>{{ row.item.label }}
      </button>
      <input v-else :id="`${prefix}-rename`" v-model="draft" :aria-label="`Rename ${row.item.label}`" @keydown.enter.prevent="finishRename(row.item)" @keydown.esc.prevent="renaming = null; focus(row.item.id)" @blur="finishRename(row.item)" />
      <button v-if="renaming !== row.item.id" type="button" class="be-agent-button" :aria-label="`Actions for ${row.item.label}`" :disabled="row.item.disabled" :aria-expanded="menu === row.item.id" @click="menu = menu === row.item.id ? null : row.item.id">⋯</button>
      <div v-if="menu === row.item.id" class="be-resource-menu" @keydown.esc="menu = null; focus(row.item.id)"><slot name="menu" :item="row.item" :rename="() => rename(row.item)" :close="() => menu = null">
        <button type="button" @click="rename(row.item)">Rename</button>
        <template v-for="(command, name) in commands(row)" :key="name"><button v-if="command" type="button" @click="move(command)">{{ { up:'Move up', down:'Move down', into:'Move into folder', out:'Move out' }[name] }}</button></template>
      </slot></div>
    </div>
  </div><span role="status" class="be-agent-sr">{{ note }}</span></div>
</template>
<style scoped>.be-resources{font-size:.875rem;min-width:0}.be-resource-row{position:relative;display:flex;align-items:center;border-radius:.5rem}.be-resource-row>[role=treeitem]{display:flex;align-items:center;gap:.5rem;flex:1;min-width:0;min-height:2.25rem;padding:.25rem .5rem;border-radius:.5rem;text-align:start;cursor:pointer}.be-resource-row>[role=treeitem]:is(:hover,[aria-selected=true]){background:var(--beui-muted)}.be-resource-row :is(button,input):focus-visible{outline:2px solid var(--beui-ring);outline-offset:-2px}.be-resource-row[data-drop=inside]{background:var(--beui-muted)}.be-resource-row[data-drop=before]{box-shadow:0 -2px var(--beui-primary)}.be-resource-row[data-drop=after]{box-shadow:0 2px var(--beui-primary)}.be-resource-menu{position:absolute;right:0;top:100%;z-index:2;display:grid;padding:.25rem;background:var(--beui-background);border:1px solid var(--beui-border);border-radius:.5rem}.be-resource-menu button{padding:.3rem .65rem;text-align:start}</style>
