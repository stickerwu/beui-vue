<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Switch, TableEditable, type InsertPosition, type TableColumn } from 'beui-vue'

type Row = { id: string; [key: string]: string }

const rows = shallowRef<Row[]>([
  { id: 'r1', name: 'Ava Cole', role: 'Owner', team: 'Design' },
  { id: 'r2', name: 'Leo Frost', role: 'Admin', team: 'Growth' },
  { id: 'r3', name: 'Mia Vale', role: 'Member', team: 'Design' },
  { id: 'r4', name: 'Kai Reyes', role: 'Member', team: 'Platform' },
])
const keys = shallowRef(['name', 'role', 'team'])
const labels = shallowRef<Record<string, string>>({ name: 'Name', role: 'Role', team: 'Team' })
const editable = shallowRef(true)
let nextRow = 5
let nextColumn = 1

function onCellEdit(rowId: string, key: string, value: string) {
  rows.value = rows.value.map(row => (row.id === rowId ? { ...row, [key]: value } : row))
}
function onInsertRow(index: number, position: InsertPosition) {
  const at = position === 'after' ? index + 1 : index
  const next = [...rows.value]
  next.splice(at, 0, { id: `r${nextRow}` })
  rows.value = next
  nextRow += 1
}
function onDeleteRow(rowId: string) {
  rows.value = rows.value.filter(row => row.id !== rowId)
}
function onInsertColumn(index: number, position: InsertPosition) {
  const key = `field${nextColumn}`
  const at = position === 'after' ? index + 1 : index
  labels.value = { ...labels.value, [key]: `Field ${nextColumn}` }
  const next = [...keys.value]
  next.splice(at, 0, key)
  keys.value = next
  rows.value = rows.value.map(row => ({ ...row, [key]: '' }))
  nextColumn += 1
}
function onColumnRename(key: string, value: string) {
  labels.value = { ...labels.value, [key]: value }
}
function onDeleteColumn(key: string) {
  keys.value = keys.value.filter(item => item !== key)
  rows.value = rows.value.map(row => {
    const next = { ...row }
    delete next[key]
    return next
  })
}

const columns = computed<TableColumn<Row>[]>(() => keys.value.map((key, index) => ({
  key,
  header: labels.value[key] ?? key,
  editable: editable.value,
  width: index === 0 ? undefined : '180px',
})))
const bodyHeight = computed(() => Math.min(Math.max(rows.value.length, 1), 6) * 48)
</script>

<template>
  <div class="editor">
    <div class="intro">
      <p>{{ editable ? 'Click a cell to edit. Use the column and row handles to insert or delete.' : 'Read-only.' }}</p>
      <Switch v-model:checked="editable" label="Editable" />
    </div>
    <TableEditable
      label="Team editor"
      :data="rows"
      :columns="columns"
      :get-row-id="row => row.id"
      :row-height="48"
      :height="bodyHeight"
      :on-cell-edit="editable ? onCellEdit : undefined"
      :on-column-rename="editable ? onColumnRename : undefined"
      :on-insert-row="editable ? onInsertRow : undefined"
      :on-delete-row="editable ? onDeleteRow : undefined"
      :on-insert-column="editable ? onInsertColumn : undefined"
      :on-delete-column="editable ? onDeleteColumn : undefined"
    >
      <template #empty><button type="button" class="first" @click="onInsertRow(0, 'before')">Insert first row</button></template>
    </TableEditable>
  </div>
</template>

<style scoped>
.editor { display: flex; width: 100%; min-width: 0; flex-direction: column; gap: .75rem; padding: 1rem; box-sizing: border-box; }
.intro { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.intro p { margin: 0; color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; }
.first { padding: .375rem .75rem; border: 1px solid var(--beui-border); border-radius: 999px; background: transparent; color: var(--beui-foreground); font: inherit; font-size: .75rem; line-height: 1rem; font-weight: 500; cursor: pointer; transition: background-color .15s; }
@media (hover: hover) { .first:hover { background: var(--beui-muted); } }
</style>
