<script setup lang="ts">
import { computed, nextTick, shallowRef, useId } from 'vue'

interface NodeItem { id: string; name: string; children?: readonly NodeItem[] }
interface TreeRow { node: NodeItem; level: number; parent?: string; position: number; siblings: number }
const { items, label = 'Project files' } = defineProps<{ items: readonly NodeItem[]; label?: string }>()
const selection = defineModel<string>()
const expanded = defineModel<string[]>('expanded', { default: () => [] })
const cursor = shallowRef<string>()
const uid = useId()
const rows = computed(() => {
  const result: TreeRow[] = []
  function visit(nodes: readonly NodeItem[], level: number, parent?: string) {
    nodes.forEach((node, index) => {
      result.push({ node, level, parent, position: index + 1, siblings: nodes.length })
      if (node.children && expanded.value.includes(node.id)) visit(node.children, level + 1, node.id)
    })
  }
  visit(items, 1)
  return result
})
const tabStop = computed(() => rows.value.find(row => row.node.id === cursor.value)?.node.id ?? rows.value.find(row => row.node.id === selection.value)?.node.id ?? rows.value[0]?.node.id)
function toggle(id: string) { expanded.value = expanded.value.includes(id) ? expanded.value.filter(value => value !== id) : [...expanded.value,id] }
function focus(id?: string) {
  if (!id) return
  cursor.value = id
  nextTick(() => document.getElementById(`${uid}-${encodeURIComponent(id)}`)?.focus())
}
function activate(node: NodeItem) {
  cursor.value = node.id
  if (node.children) toggle(node.id)
  else selection.value = node.id
}
function key(event: KeyboardEvent, row: TreeRow, index: number) {
  const node = row.node
  switch (event.key) {
    case 'ArrowDown': focus(rows.value[index + 1]?.node.id); break
    case 'ArrowUp': focus(rows.value[index - 1]?.node.id); break
    case 'Home': focus(rows.value[0]?.node.id); break
    case 'End': focus(rows.value.at(-1)?.node.id); break
    case 'ArrowRight':
      if (!node.children) return
      if (expanded.value.includes(node.id)) focus(node.children[0]?.id)
      else toggle(node.id)
      break
    case 'ArrowLeft':
      if (node.children && expanded.value.includes(node.id)) toggle(node.id)
      else focus(row.parent)
      break
    default: return
  }
  event.preventDefault()
}
</script>
<template>
  <div role="tree" :aria-label="label" class="file-tree">
    <button v-for="(row, index) in rows" :id="`${uid}-${encodeURIComponent(row.node.id)}`" :key="row.node.id" type="button" role="treeitem" class="row"
      :aria-label="row.node.name" :aria-level="row.level" :aria-posinset="row.position" :aria-setsize="row.siblings" :aria-selected="row.node.id === selection"
      :aria-expanded="row.node.children ? expanded.includes(row.node.id) : undefined" :tabindex="tabStop === row.node.id ? 0 : -1"
      :style="{ paddingInlineStart: `${.5 + (row.level - 1) * 1.1}rem` }" @focus="cursor = row.node.id" @click="activate(row.node)" @keydown="key($event,row,index)">
      <span aria-hidden="true" class="glyph">{{ row.node.children ? expanded.includes(row.node.id) ? '⌄' : '›' : '◇' }}</span>
      <slot name="item" :item="row.node">{{ row.node.name }}</slot>
    </button>
  </div>
</template>
<style scoped>
.file-tree { width: min(100%,20rem); display: grid; gap: .12rem; }
.row { display: flex; align-items: center; gap: .45rem; border-radius: .5rem; border: 0; background: none; padding-block: .4rem; color: var(--beui-foreground); font: inherit; font-size: .85rem; text-align: start; cursor: pointer; }
.row:hover,.row[aria-selected=true] { background: var(--beui-muted); } .glyph { width: 1rem; text-align: center; color: var(--beui-muted-foreground); }
</style>
