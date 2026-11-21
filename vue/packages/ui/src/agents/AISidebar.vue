<script lang="ts">
export const aiSidebarMessages = {
  label: 'Resources',
  rename: 'Rename',
  renameItem: 'Rename {item}',
  actions: 'Actions for {item}',
  moveUp: 'Move up',
  moveDown: 'Move down',
  moveInto: 'Move into {target}',
  moveOut: 'Move out',
  moveToTop: 'Move to top level',
  movePending: 'Wait for the current move to finish.',
  movedBefore: 'Moved {item} before {target}.',
  movedInside: 'Moved {item} inside {target}.',
  movedAfter: 'Moved {item} after {target}.',
  movedToTop: 'Moved {item} to the top level.',
  moveFailed: 'Move failed. {item} was restored.',
  renameFailed: 'Rename failed. {item} was restored.',
  unnamedItem: 'item',
}
export type AISidebarMessages = typeof aiSidebarMessages
/** The moves a row can make right now; the row menu offers the same four as `Alt+Shift+Arrow`. */
export interface SidebarResourceMoveCommands {
  up?: () => void
  down?: () => void
  into?: { label: string, run: () => void }
  out?: () => void
}
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, watch } from 'vue'
import FloatingPanel from '../controls/FloatingPanel.vue'
import { layoutSpring } from '../core/motion'
import AgentIcon from './AgentIcon.vue'
import type { AgentIconName } from './icons'
import { useValue, type Labels } from './shared'
import { containsItems, flatten, moveItem, renameItem, type ResourceMove, type ResourceRow, type SidebarResource } from './tree'
import SidebarMarquee from './SidebarMarquee.vue'

const props = withDefaults(defineProps<{
  items?: SidebarResource[], defaultItems?: SidebarResource[], activeId?: string | null, defaultActiveId?: string | null, defaultExpandedIds?: string[], ariaLabel?: string, labels?: Labels,
  onMove?: (move: ResourceMove) => void | Promise<void>, onRename?: (item: SidebarResource, label: string) => void | Promise<void>
}>(), { items: undefined, defaultItems: () => [], activeId: undefined, defaultActiveId: null, defaultExpandedIds: () => [] })
const emit = defineEmits<{ 'update:items': [value: SidebarResource[]], itemsChange: [value: SidebarResource[]], 'update:activeId': [value: string], activeChange: [value: string], moveError: [error: unknown, move: ResourceMove] }>()

const reduce = useReducedMotion()
const text = computed(() => ({ ...aiSidebarMessages, ...props.labels }) as Record<keyof AISidebarMessages, string>)
function t(key: keyof AISidebarMessages, values: Record<string, string> = {}) {
  return text.value[key].replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? '')
}

const store = useValue<SidebarResource[]>(() => props.items, props.defaultItems, next => { emit('update:items', next); emit('itemsChange', next) })
const selected = useValue<string | null>(() => props.activeId, props.defaultActiveId, next => { if (next) { emit('update:activeId', next); emit('activeChange', next) } })
const expanded = shallowRef(new Set(props.defaultExpandedIds))
const visible = computed(() => flatten(store.value.value, expanded.value))
const focusId = shallowRef<string | null>(props.activeId ?? props.defaultActiveId)
// The roving tab stop is resolved during render so the first paint (and the SSR markup) already has one.
const focusedRow = computed(() => {
  const rows = visible.value
  return focusId.value !== null && rows.some(row => row.item.id === focusId.value) ? focusId.value : (rows[0]?.item.id ?? null)
})
const renaming = shallowRef<string | null>(null)
const draft = shallowRef('')
const hovered = shallowRef<string | null>(null)
const menu = shallowRef<string | null>(null)
const menuAnchor = shallowRef<HTMLElement | null>(null)
const note = shallowRef('')
let pending = false
const dragging = shallowRef<string | null>(null)
const drop = shallowRef<{ id: string | null, position: ResourceMove['position'] } | null>(null)
let dragged = false
let skipBlur = false
const prefix = useId()
const rowId = (id: string) => `${prefix}-${id}`

function expand(id: string, open: boolean) {
  const next = new Set(expanded.value)
  if (open) next.add(id)
  else next.delete(id)
  expanded.value = next
}
function find(items: SidebarResource[], id: string): SidebarResource | undefined {
  for (const item of items) {
    if (item.id === id) return item
    const child = item.children ? find(item.children, id) : undefined
    if (child) return child
  }
}
function holds(item: SidebarResource, id: string): boolean {
  return item.id === id || item.children?.some(child => holds(child, id)) === true
}
let frame = 0
function focus(id?: string | null) {
  if (!id) return
  focusId.value = id
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => document.getElementById(rowId(id))?.focus())
}
function select(item: SidebarResource) { selected.set(item.id) }
function toggle(id: string) { expand(id, !expanded.value.has(id)) }

async function startRename(item: SidebarResource) {
  if (item.disabled) return
  menu.value = null
  draft.value = item.label
  skipBlur = false
  renaming.value = item.id
  await nextTick()
  requestAnimationFrame(() => {
    const input = document.getElementById(`${prefix}-rename`) as HTMLInputElement | null
    input?.focus(); input?.select()
  })
}
function commitRename(item: SidebarResource) {
  if (renaming.value !== item.id) return
  const label = draft.value.trim()
  renaming.value = null
  focus(item.id)
  if (!label || label === item.label) return
  const previous = store.value.value
  store.set(renameItem(previous, item.id, label))
  Promise.resolve(props.onRename?.(item, label)).catch(() => {
    store.set(previous)
    note.value = t('renameFailed', { item: item.label })
  })
}
function cancelRename(item: SidebarResource) {
  renaming.value = null
  focus(item.id)
}
function renameKey(event: KeyboardEvent, item: SidebarResource) {
  event.stopPropagation()
  if (event.key === 'Enter') { event.preventDefault(); skipBlur = true; commitRename(item) }
  if (event.key === 'Escape') { event.preventDefault(); skipBlur = true; cancelRename(item) }
}
function renameBlur(item: SidebarResource) {
  if (!skipBlur) commitRename(item)
}

function commands(row: ResourceRow): SidebarResourceMoveCommands {
  if (row.item.disabled) return {}
  const rows = visible.value
  const index = rows.findIndex(entry => entry.item.id === row.item.id)
  const above = rows[index - 1], below = rows[index + 1]
  const result: SidebarResourceMoveCommands = {}
  if (above) result.up = () => { void move({ itemId: row.item.id, targetId: above.item.id, position: 'before' }) }
  if (below) result.down = () => { void move({ itemId: row.item.id, targetId: below.item.id, position: 'after' }) }
  // Only offer the reparent when it lands somewhere new: the row above a folder's first child is the folder it already lives in.
  if (above && containsItems(above.item) && above.item.id !== row.parentId) {
    result.into = { label: above.item.label, run: () => { expand(above.item.id, true); void move({ itemId: row.item.id, targetId: above.item.id, position: 'inside' }) } }
  }
  if (row.parentId) result.out = () => { void move({ itemId: row.item.id, targetId: row.parentId, position: 'after' }) }
  return result
}
const MOVED = { before: 'movedBefore', inside: 'movedInside', after: 'movedAfter' } as const
async function move(request: ResourceMove | null) {
  if (!request) return
  if (pending) { note.value = t('movePending'); return }
  const previous = store.value.value
  const next = moveItem(previous, request)
  if (!next || next === previous) return
  pending = true
  store.set(next)
  drop.value = null
  dragging.value = null
  const moved = find(previous, request.itemId)
  const target = request.targetId ? find(previous, request.targetId) : null
  const label = moved?.label ?? t('unnamedItem')
  note.value = target ? t(MOVED[request.position], { item: label, target: target.label }) : t('movedToTop', { item: label })
  try { await props.onMove?.(request) }
  catch (error) { store.set(previous); note.value = t('moveFailed', { item: label }); emit('moveError', error, request) }
  finally { pending = false }
}

function keydown(event: KeyboardEvent, row: ResourceRow) {
  if (event.target !== event.currentTarget) return
  const { item } = row
  const rows = visible.value
  const index = rows.findIndex(entry => entry.item.id === item.id)
  const above = rows[index - 1], below = rows[index + 1]
  const mover = event.altKey && event.shiftKey
  const stop = () => event.preventDefault()
  if (event.key === 'ArrowDown' && !mover && below) { stop(); focus(below.item.id); return }
  if (event.key === 'ArrowUp' && !mover && above) { stop(); focus(above.item.id); return }
  if (event.key === 'Home' && rows[0]) { stop(); focus(rows[0].item.id); return }
  if (event.key === 'End' && rows.length) { stop(); focus(rows[rows.length - 1].item.id); return }
  if (item.disabled) {
    if (event.key === 'ArrowLeft' && row.parentId) { stop(); focus(row.parentId) }
    else if (mover || ['ArrowRight', 'Enter', ' ', 'F2', 'ContextMenu'].includes(event.key) || (event.shiftKey && event.key === 'F10')) stop()
    return
  }
  if (mover && event.key === 'ArrowUp' && above) { stop(); void move({ itemId: item.id, targetId: above.item.id, position: 'before' }); return }
  if (mover && event.key === 'ArrowDown' && below) { stop(); void move({ itemId: item.id, targetId: below.item.id, position: 'after' }); return }
  if (mover && event.key === 'ArrowRight' && above && containsItems(above.item)) { stop(); expand(above.item.id, true); void move({ itemId: item.id, targetId: above.item.id, position: 'inside' }); return }
  if (mover && event.key === 'ArrowLeft' && row.parentId) { stop(); void move({ itemId: item.id, targetId: row.parentId, position: 'after' }); return }
  if (event.key === 'ArrowRight' && containsItems(item)) {
    stop()
    if (!expanded.value.has(item.id)) toggle(item.id)
    else if (below?.parentId === item.id) focus(below.item.id)
  } else if (event.key === 'ArrowLeft') {
    stop()
    if (expanded.value.has(item.id)) toggle(item.id)
    else if (row.parentId) focus(row.parentId)
  } else if (event.key === 'Enter' || event.key === ' ') {
    stop()
    if (containsItems(item)) toggle(item.id)
    else select(item)
  } else if (event.key === 'F2') {
    stop()
    void startRename(item)
  } else if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
    stop()
    openMenu(item.id, document.getElementById(`${rowId(item.id)}-actions`))
  }
}
function click(event: MouseEvent, row: ResourceRow) {
  if (event.defaultPrevented || dragged || renaming.value || row.item.disabled) return
  if (containsItems(row.item)) toggle(row.item.id)
  else select(row.item)
}

function openMenu(id: string, anchor: HTMLElement | null) {
  menuAnchor.value = anchor ?? document.getElementById(rowId(id))
  menu.value = id
}
function toggleMenu(event: MouseEvent, id: string) {
  event.stopPropagation()
  if (menu.value === id) closeMenu(true)
  else openMenu(id, event.currentTarget as HTMLElement)
}
function closeMenu(refocus = false) {
  const id = menu.value
  menu.value = null
  if (refocus) focus(id)
}
const menuRow = computed(() => visible.value.find(row => row.item.id === menu.value))
const menuMoves = computed(() => (menuRow.value ? commands(menuRow.value) : {}))
const menuNode = shallowRef<HTMLElement | null>(null)
function focusMenu() {
  menuNode.value?.querySelector<HTMLElement>('button, a[href]')?.focus()
}
function runFromMenu(action: () => void) {
  closeMenu(true)
  action()
}

function dragStart(event: DragEvent, id: string) {
  dragged = true
  dragging.value = id
  if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id) }
}
function dragEnd() {
  dragging.value = null
  drop.value = null
  requestAnimationFrame(() => { dragged = false })
}
function dragOver(event: DragEvent, row: ResourceRow) {
  const id = dragging.value
  if (!id || id === row.item.id) return
  const source = find(store.value.value, id)
  if (source && holds(source, row.item.id)) return
  event.preventDefault()
  event.stopPropagation()
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = (event.clientY - box.top) / box.height
  const position = !row.item.disabled && containsItems(row.item) && ratio >= .25 && ratio <= .75 ? 'inside' : ratio < .5 ? 'before' : 'after'
  drop.value = { id: row.item.id, position }
}
function dropRow(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  commitDrop()
}
function commitDrop() {
  if (dragging.value && drop.value) void move({ itemId: dragging.value, targetId: drop.value.id, position: drop.value.position })
}
function rootDragOver(event: DragEvent) {
  if (!dragging.value || event.target !== event.currentTarget) return
  event.preventDefault()
  drop.value = { id: null, position: 'after' }
}
function rootDrop(event: DragEvent) {
  event.preventDefault()
  commitDrop()
}

function iconName(item: SidebarResource): AgentIconName {
  if (containsItems(item)) return expanded.value.has(item.id) ? 'FolderOpen' : 'Folder'
  return item.kind === 'bookmark' ? 'Bookmark' : 'FileText'
}
const rowTransition = computed(() => reduce.value ? { duration: 0 } : layoutSpring)

onMounted(() => document.addEventListener('dragend', dragEnd))
onBeforeUnmount(() => { document.removeEventListener('dragend', dragEnd); cancelAnimationFrame(frame) })
watch(menu, value => { if (!value) menuAnchor.value = null })
</script>

<template>
  <div class="be-ais">
    <div
      role="tree" :aria-label="ariaLabel ?? text.label" aria-multiselectable="false" class="be-ais-tree" :data-dragging="dragging ? 'true' : undefined"
      @dragover="rootDragOver" @drop="rootDrop"
    >
      <AnimatePresence :initial="false">
        <motion.div
          v-for="row in visible" :id="rowId(row.item.id)" :key="row.item.id" layout="position" :transition="rowTransition"
          role="treeitem" class="be-ais-row" :aria-level="row.depth + 1" :aria-selected="containsItems(row.item) ? undefined : selected.value.value === row.item.id"
          :aria-expanded="containsItems(row.item) ? expanded.has(row.item.id) : undefined" :aria-disabled="row.item.disabled || undefined"
          :tabindex="focusedRow === row.item.id ? 0 : -1" :draggable="!row.item.disabled && renaming !== row.item.id"
          :data-active="!containsItems(row.item) && selected.value.value === row.item.id ? 'true' : undefined" :data-disabled="row.item.disabled ? 'true' : undefined"
          :data-menu-open="menu === row.item.id ? 'true' : undefined" :data-dragging="dragging === row.item.id ? 'true' : undefined"
          :data-drop="drop?.id === row.item.id ? drop.position : undefined"
          :style="{ paddingLeft: `${12 + row.depth * 16}px` }"
          @focus="focusId = row.item.id" @keydown="keydown($event, row)" @click="click($event, row)"
          @dblclick="!containsItems(row.item) && !row.item.disabled && ($event.preventDefault(), startRename(row.item))"
          @mouseenter="hovered = row.item.id" @mouseleave="hovered = null"
          @dragstart.capture="dragStart($event, row.item.id)" @dragend.capture="dragEnd" @dragover="dragOver($event, row)" @drop="dropRow"
        >
          <span aria-hidden="true" class="be-ais-icon"><slot name="icon" :item="row.item"><AgentIcon :name="iconName(row.item)" :size="16" /></slot></span>
          <input
            v-if="renaming === row.item.id" :id="`${prefix}-rename`" v-model="draft" :aria-label="t('renameItem', { item: row.item.label })" draggable="false" class="be-ais-input"
            @click.stop @dblclick.stop @blur="renameBlur(row.item)" @keydown="renameKey($event, row.item)"
          />
          <SidebarMarquee v-else :active="hovered === row.item.id || menu === row.item.id">{{ row.item.label }}</SidebarMarquee>
          <button
            v-if="renaming !== row.item.id && !row.item.disabled" :id="`${rowId(row.item.id)}-actions`" type="button" draggable="false" tabindex="-1" class="be-ais-more"
            :aria-label="t('actions', { item: row.item.label })" aria-haspopup="menu" :aria-expanded="menu === row.item.id" @click="toggleMenu($event, row.item.id)"
          ><AgentIcon name="MoreHorizontal" :size="16" /></button>
        </motion.div>
      </AnimatePresence>
      <div v-if="dragging" aria-hidden="true" class="be-ais-top" :data-active="drop?.id === null ? 'true' : undefined">{{ t('moveToTop') }}</div>
    </div>
    <FloatingPanel
      v-if="menuRow" :open="!!menu" :anchor="menuAnchor" side="bottom" align="end" :gap="8" variant="morph" role="menu" :aria-label="t('actions', { item: menuRow.item.label })"
      class="be-ais-menu" @dismiss="reason => closeMenu(reason === 'escape')" @placed="focusMenu"
    >
      <div ref="menuNode" class="be-ais-menu-body" @keydown.esc.stop="closeMenu(true)">
        <slot name="menu" :item="menuRow.item" :rename="() => startRename(menuRow!.item)" :close="() => closeMenu(true)" :moves="menuMoves">
          <button type="button" role="menuitem" class="be-ais-action" @click="runFromMenu(() => startRename(menuRow!.item))"><AgentIcon name="Pencil" :size="14" /><span class="be-ais-action-text">{{ t('rename') }}</span></button>
          <div v-if="menuMoves.up || menuMoves.down || menuMoves.into || menuMoves.out" aria-hidden="true" class="be-ais-sep" />
          <button v-if="menuMoves.up" type="button" role="menuitem" class="be-ais-action" @click="runFromMenu(menuMoves.up)"><AgentIcon name="ArrowUp" :size="14" /><span class="be-ais-action-text">{{ t('moveUp') }}</span></button>
          <button v-if="menuMoves.down" type="button" role="menuitem" class="be-ais-action" @click="runFromMenu(menuMoves.down)"><AgentIcon name="ArrowDown" :size="14" /><span class="be-ais-action-text">{{ t('moveDown') }}</span></button>
          <button v-if="menuMoves.into" type="button" role="menuitem" class="be-ais-action" @click="runFromMenu(menuMoves.into.run)"><AgentIcon name="FolderInput" :size="14" /><span class="be-ais-action-text">{{ t('moveInto', { target: menuMoves.into.label }) }}</span></button>
          <button v-if="menuMoves.out" type="button" role="menuitem" class="be-ais-action" @click="runFromMenu(menuMoves.out)"><AgentIcon name="Undo2" :size="14" /><span class="be-ais-action-text">{{ t('moveOut') }}</span></button>
        </slot>
      </div>
    </FloatingPanel>
    <span class="be-agent-sr" aria-live="polite">{{ note }}</span>
  </div>
</template>

<style scoped>
.be-ais { min-width: 0; font-size: .875rem; line-height: 1.25rem; }
.be-ais-tree { position: relative; display: flex; min-width: 0; flex-direction: column; gap: .125rem; overflow-anchor: none; }
.be-ais-tree[data-dragging] { user-select: none; padding-bottom: 2.25rem; }
.be-ais-row {
  position: relative; display: flex; align-items: center; gap: .625rem; box-sizing: border-box; min-height: 2.25rem; min-width: 0; padding-right: .75rem;
  border-radius: .75rem; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color .15s, background-color .15s;
}
.be-ais-row:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.be-ais-row:focus-visible { background: color-mix(in srgb, var(--beui-muted) 70%, transparent); box-shadow: inset 0 0 0 2px var(--beui-ring); }
.be-ais-row[data-menu-open], .be-ais-row[data-active] { background: var(--beui-muted); color: var(--beui-foreground); }
.be-ais-row[data-dragging] { opacity: .4; }
.be-ais-row[data-disabled] { cursor: not-allowed; opacity: .45; }
.be-ais-row[data-drop=inside] { background: var(--beui-muted); box-shadow: 0 0 0 1px color-mix(in srgb, var(--beui-primary) 45%, transparent); }
.be-ais-row[data-drop=before]::before, .be-ais-row[data-drop=after]::after { content: ''; position: absolute; left: .5rem; right: .5rem; height: .125rem; border-radius: 9999px; background: var(--beui-primary); }
.be-ais-row[data-drop=before]::before { top: -.125rem; }
.be-ais-row[data-drop=after]::after { bottom: -.125rem; }
.be-ais-icon { display: grid; flex: none; width: 1.25rem; height: 1.25rem; place-items: center; }
.be-ais-input {
  box-sizing: border-box; flex: 1 1 0%; min-width: 0; height: 1.75rem; margin: 0 .25rem; padding: 0 .5rem; border: 1px solid var(--beui-border); border-radius: .375rem;
  background: var(--beui-background); color: var(--beui-foreground); font: inherit; font-size: .875rem; outline: none;
}
.be-ais-input:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-ais-more {
  display: grid; flex: none; width: 1.75rem; height: 1.75rem; padding: 0; place-items: center; border: 0; border-radius: .5rem; background: transparent; color: inherit;
  cursor: pointer; opacity: 0; outline: none; transition: opacity .15s, background-color .15s;
}
.be-ais-more:hover { background: color-mix(in srgb, var(--beui-foreground) 5%, transparent); }
.be-ais-row:hover .be-ais-more, .be-ais-row[data-menu-open] .be-ais-more, .be-ais-more:focus-visible { opacity: 1; }
.be-ais-more:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
/* A finger never hovers and this menu is its only path to rename and move, so keep it on screen there. */
@media (hover: none) { .be-ais-more { opacity: 1; } }
.be-ais-top {
  position: absolute; left: .25rem; right: .25rem; bottom: 0; display: flex; height: 2rem; align-items: center; justify-content: center; border: 1px dashed var(--beui-border);
  border-radius: .5rem; color: var(--beui-muted-foreground); font-size: 10px; line-height: 1rem;
}
.be-ais-top[data-active] { border-color: color-mix(in srgb, var(--beui-primary) 50%, transparent); background: var(--beui-muted); color: var(--beui-foreground); }
.be-ais-menu-body { display: flex; flex-direction: column; }
.be-ais-action {
  display: flex; align-items: center; gap: .5rem; box-sizing: border-box; width: 100%; height: 2rem; padding: 0 .625rem; border: 0; border-radius: .5rem; background: transparent;
  color: var(--beui-foreground); font: inherit; font-size: .75rem; line-height: 1rem; text-align: left; cursor: pointer; outline: none; transition: background-color .15s;
}
.be-ais-action :deep(svg) { width: .875rem; height: .875rem; }
.be-ais-action-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.be-ais-action:hover, .be-ais-action:focus-visible { background: var(--beui-muted); }
.be-ais-action:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-ais-sep { height: 1px; margin: .25rem 0; background: var(--beui-border); }
</style>

<style>
.be-ais-menu.be-ais-menu { box-sizing: border-box; width: 10rem; padding: .375rem; border-radius: .75rem; background: var(--beui-background); box-shadow: 0 10px 18px rgb(0 0 0 / .14); }
</style>
