<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const fileTreeMessages = { label: 'Files' }
export type FileTreeMessages = typeof fileTreeMessages

export interface FileTreeNode {
  id: string
  name: string
  disabled?: boolean
  children?: readonly FileTreeNode[]
}
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { Comment, Fragment, isVNode, shallowRef, useSlots, type Slot, type VNode } from 'vue'
import { easeOut, layoutSpring, swapSpring } from '../core/motion'
import { FileTreeFile, FileTreeFolder } from './file-tree-parts'
import SharedLayoutBg from './SharedLayoutBg.vue'

interface Item {
  id: string
  name: string
  type: 'file' | 'folder'
  children?: Item[]
  icon?: Slot
  disabled?: boolean
  data?: FileTreeNode
}
interface Row { item: Item; depth: number; parentId: string | null; position: number; setSize: number }

const props = withDefaults(defineProps<{
  /** Data-driven tree. Omit to compose `FileTreeFolder` and `FileTreeFile` in the default slot. */
  items?: readonly FileTreeNode[]
  /** Selected id (`v-model`). */
  modelValue?: string | null
  defaultValue?: string | null
  /** Expanded folder ids (`v-model:expanded`). */
  expanded?: string[]
  defaultExpandedIds?: string[]
  /** Accessible name of the tree. */
  label?: string
  labels?: Partial<FileTreeMessages>
  /** Indent per level in px. */
  indent?: number
  className?: string
  classNames?: { tree?: string; item?: string; icon?: string; label?: string }
}>(), { indent: 18, defaultValue: null, defaultExpandedIds: () => [], modelValue: undefined, expanded: undefined })
const emit = defineEmits<{
  'update:modelValue': [id: string]
  'update:expanded': [ids: string[]]
  valueChange: [id: string]
  expandedChange: [ids: string[]]
}>()
const slots = useSlots()
defineSlots<{ default?: () => unknown; item?: (props: { item: FileTreeNode }) => unknown }>()

const reduce = useReducedMotion()
const t = (key: keyof FileTreeMessages) => props.labels?.[key] ?? fileTreeMessages[key]

const internalValue = shallowRef<string | null>(props.defaultValue)
const internalExpanded = shallowRef<string[]>([...props.defaultExpandedIds])
const focusedId = shallowRef<string | null>(props.modelValue ?? props.defaultValue)
const selectedId = () => (props.modelValue === undefined ? internalValue.value : props.modelValue)
const expandedIds = () => props.expanded ?? internalExpanded.value

const ROW_ENTER = { duration: 0.22, ease: easeOut } as const
const BRANCH_DRAW = { duration: 0.3, ease: easeOut } as const
const instant = { duration: 0 } as const

// --- Collection -----------------------------------------------------------
function fromData(nodes: readonly FileTreeNode[]): Item[] {
  return nodes.map(node => ({
    id: node.id, name: node.name, type: node.children ? 'folder' : 'file', disabled: node.disabled, data: node,
    children: node.children ? fromData(node.children) : undefined,
  }))
}
function slotNodes(nodes: VNode[] | undefined): VNode[] {
  const out: VNode[] = []
  for (const node of nodes ?? []) {
    if (!isVNode(node) || node.type === Comment) continue
    if (node.type === Fragment && Array.isArray(node.children)) out.push(...slotNodes(node.children as VNode[]))
    else out.push(node)
  }
  return out
}
function fromSlot(nodes: VNode[] | undefined): Item[] {
  const items: Item[] = []
  for (const node of slotNodes(nodes)) {
    const isFolder = node.type === FileTreeFolder
    if (!isFolder && node.type !== FileTreeFile) continue
    const p = (node.props ?? {}) as Record<string, unknown>
    const parts = (node.children && typeof node.children === 'object' ? node.children : {}) as Record<string, Slot | undefined>
    items.push({
      id: String(p.value), name: String(p.name), type: isFolder ? 'folder' : 'file', icon: parts.icon,
      disabled: p.disabled === '' || p.disabled === true,
      children: isFolder ? fromSlot(parts.default?.() as VNode[] | undefined) : undefined,
    })
  }
  return items
}
function flatten(items: Item[], open: ReadonlySet<string>, depth = 0, parentId: string | null = null): Row[] {
  return items.flatMap((item, index) => {
    const row: Row = { item, depth, parentId, position: index + 1, setSize: items.length }
    if (item.type !== 'folder' || !open.has(item.id) || !item.children?.length) return [row]
    return [row, ...flatten(item.children, open, depth + 1, item.id)]
  })
}
// Rows are rebuilt every render: the declarative slot has no reactive source of its own.
function collect() {
  const open = new Set(expandedIds())
  const items = props.items ? fromData(props.items) : fromSlot(slots.default?.() as VNode[] | undefined)
  return { open, rows: flatten(items, open) }
}
// Keep a real row tabbable in the first commit and right after a collapse removes the focused row.
function tabStop(rows: Row[]) {
  const id = focusedId.value
  return id !== null && rows.some(row => row.item.id === id) ? id : (rows[0]?.item.id ?? null)
}

// --- Behaviour ------------------------------------------------------------
const rowNodes = new Map<string, HTMLButtonElement>()
function setRowNode(id: string, element: unknown) {
  if (element instanceof HTMLButtonElement) rowNodes.set(id, element)
  else rowNodes.delete(id)
}
function focusRow(id: string) {
  focusedId.value = id
  const node = rowNodes.get(id)
  if (node) node.focus()
  else requestAnimationFrame(() => rowNodes.get(id)?.focus())
}
function selectItem(item: Item) {
  if (item.disabled) return
  if (props.modelValue === undefined) internalValue.value = item.id
  emit('update:modelValue', item.id)
  emit('valueChange', item.id)
}
function setExpanded(next: string[]) {
  if (props.expanded === undefined) internalExpanded.value = next
  emit('update:expanded', next)
  emit('expandedChange', next)
}
function toggleFolder(id: string) {
  const next = new Set(expandedIds())
  if (next.has(id)) next.delete(id)
  else next.add(id)
  setExpanded(Array.from(next))
}
function activate(row: Row) {
  if (row.item.disabled) return
  selectItem(row.item)
  if (row.item.type === 'folder') toggleFolder(row.item.id)
}
function keydown(event: KeyboardEvent, row: Row) {
  const { open, rows } = collect()
  const index = rows.findIndex(entry => entry.item.id === row.item.id)
  const previous = rows[index - 1]
  const next = rows[index + 1]
  const isFolder = row.item.type === 'folder'
  const isOpen = open.has(row.item.id)
  if (event.key === 'ArrowDown' && next) { event.preventDefault(); focusRow(next.item.id) }
  else if (event.key === 'ArrowUp' && previous) { event.preventDefault(); focusRow(previous.item.id) }
  else if (event.key === 'Home' && rows[0]) { event.preventDefault(); focusRow(rows[0].item.id) }
  else if (event.key === 'End' && rows.length) { event.preventDefault(); focusRow(rows[rows.length - 1]!.item.id) }
  else if (event.key === 'ArrowRight' && isFolder) {
    event.preventDefault()
    if (!isOpen && !row.item.disabled) toggleFolder(row.item.id)
    else if (next?.parentId === row.item.id) focusRow(next.item.id)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    if (isFolder && isOpen && !row.item.disabled) toggleFolder(row.item.id)
    else if (row.parentId) focusRow(row.parentId)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    activate(row)
  }
}
</script>

<template>
  <SharedLayoutBg v-bind="{ role: 'tree', 'aria-label': label ?? t('label'), 'aria-multiselectable': 'false' }" :inset="0"
    pill-class="be-ft-pill" pill-container-class="be-ft-pill-box" class="be-ft" :class="[className, classNames?.tree]">
    <template v-for="ctx in [collect()]" :key="'ctx'">
      <motion.div v-for="row in ctx.rows" :key="row.item.id" :layout="reduce ? false : 'position'"
        :initial="reduce ? false : { opacity: 0, y: -6 }"
        :animate="{ opacity: row.item.disabled ? 0.42 : 1, y: 0, transition: reduce ? instant : { ...ROW_ENTER, delay: Math.min(row.position * 0.025, 0.1) } }"
        :transition="reduce ? instant : layoutSpring">
        <button :ref="element => setRowNode(row.item.id, element)" type="button" role="treeitem" class="be-ft-row"
          :class="[{ 'is-selected': selectedId() === row.item.id }, classNames?.item]"
          :aria-level="row.depth + 1" :aria-posinset="row.position" :aria-setsize="row.setSize" :aria-selected="selectedId() === row.item.id"
          :aria-expanded="row.item.type === 'folder' ? ctx.open.has(row.item.id) : undefined" :aria-disabled="row.item.disabled || undefined"
          :tabindex="tabStop(ctx.rows) === row.item.id ? 0 : -1" :style="{ paddingLeft: `${8 + row.depth * indent}px` }"
          @focus="focusedId = row.item.id" @keydown="keydown($event, row)" @click="activate(row)">
          <motion.span v-if="row.depth > 0" aria-hidden="true" class="be-ft-branch"
            :initial="reduce ? false : { opacity: 0, scaleY: 0 }" :animate="{ opacity: 1, scaleY: 1 }"
            :transition="reduce ? instant : BRANCH_DRAW" :style="{ left: `${16 + (row.depth - 1) * indent}px` }" />
          <motion.span aria-hidden="true" class="be-ft-chevron" :class="{ 'is-hidden': row.item.type !== 'folder' }"
            :animate="{ rotate: ctx.open.has(row.item.id) && row.item.type === 'folder' ? 90 : 0 }" :transition="reduce ? instant : swapSpring">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </motion.span>
          <span aria-hidden="true" class="be-ft-icon" :class="[{ 'is-open': row.item.type === 'folder' && ctx.open.has(row.item.id) }, classNames?.icon]">
            <component :is="row.item.icon" v-if="row.item.icon" />
            <template v-else-if="row.item.type === 'file'">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /></svg>
            </template>
            <template v-else>
              <svg v-if="reduce && ctx.open.has(row.item.id)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" /></svg>
              <svg v-else-if="reduce" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg>
              <AnimatePresence v-else :initial="false" mode="popLayout">
                <motion.span :key="ctx.open.has(row.item.id) ? 'open' : 'closed'" class="be-ft-folder"
                  :initial="{ opacity: 0, scale: 0.75, rotate: ctx.open.has(row.item.id) ? -8 : 8 }" :animate="{ opacity: 1, scale: 1, rotate: 0 }"
                  :exit="{ opacity: 0, scale: 0.75, rotate: ctx.open.has(row.item.id) ? 8 : -8 }" :transition="swapSpring">
                  <svg v-if="ctx.open.has(row.item.id)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" /></svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg>
                </motion.span>
              </AnimatePresence>
            </template>
          </span>
          <span class="be-ft-label" :class="classNames?.label">
            <slot v-if="row.item.data" name="item" :item="row.item.data">{{ row.item.name }}</slot>
            <template v-else>{{ row.item.name }}</template>
          </span>
        </button>
      </motion.div>
    </template>
  </SharedLayoutBg>
</template>

<style>
.be-ft { min-width: 0; }
.be-shared-bg .be-ft-pill { border-radius: .75rem; background: var(--beui-muted); }
.be-shared-bg .be-ft-pill-box { top: 0; bottom: auto; height: 2.25rem; }
.be-ft-row { position: relative; display: flex; box-sizing: border-box; width: 100%; height: 2.25rem; align-items: center; gap: .5rem; overflow: hidden; margin: 0; padding-block: 0; padding-right: .5rem; border: 0; border-radius: .5rem; background: none; color: var(--beui-muted-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; text-align: left; outline: none; cursor: pointer; transition: color .15s; }
.be-ft-row:hover { color: var(--beui-foreground); }
.be-ft-row:focus-visible { box-shadow: inset 0 0 0 2px var(--beui-ring); }
.be-ft-row[aria-disabled=true] { cursor: not-allowed; }
.be-ft-row.is-selected { background: var(--beui-muted); font-weight: 500; color: var(--beui-foreground); }
.be-ft-branch { position: absolute; top: 0; bottom: 0; width: 1px; transform-origin: top; background: color-mix(in srgb, var(--beui-border) 70%, transparent); }
.be-ft-chevron, .be-ft-icon { position: relative; z-index: 10; display: grid; width: 1rem; height: 1rem; flex: none; place-items: center; }
.be-ft-chevron.is-hidden { opacity: 0; }
.be-ft-icon { color: var(--beui-muted-foreground); transition: color .15s; }
.be-ft-row:hover .be-ft-icon, .be-ft-icon.is-open { color: var(--beui-foreground); }
.be-ft-folder { position: absolute; inset: 0; display: grid; place-items: center; }
.be-ft-label { position: relative; z-index: 10; min-width: 0; flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
