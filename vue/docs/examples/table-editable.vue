<script setup lang="ts">
import { computed, ref } from 'vue'
import { TableEditable, type InsertPosition, type TableColumn } from 'beui-vue'

interface Person { id: string; [key: string]: string }
const people = ref<Person[]>([
  { id: 'r1', name: 'Ava Cole', role: 'Owner', team: 'Design' }, { id: 'r2', name: 'Leo Frost', role: 'Admin', team: 'Growth' },
  { id: 'r3', name: 'Mia Vale', role: 'Member', team: 'Design' }, { id: 'r4', name: 'Kai Reyes', role: 'Member', team: 'Platform' },
])
const editable = ref(true)
const fields = ref([{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'team', label: 'Team' }])
const columns = computed<TableColumn<Person>[]>(() => fields.value.map(field => ({ key: field.key, header: field.label, editable: editable.value })))
let nextRow = 5, nextColumn = 1
function edit(id: string, key: string, value: string) {
  const row = people.value.find(person => person.id === id)
  if (row) row[key] = value
}
function rename(key: string, value: string) {
  const field = fields.value.find(item => item.key === key)
  if (field) field.label = value
}
function insertRow(index: number, position: InsertPosition) { people.value.splice(index + Number(position === 'after'), 0, { id: `r${nextRow++}` }) }
function insertColumn(index: number, position: InsertPosition) {
  const number = nextColumn++
  fields.value.splice(index + Number(position === 'after'), 0, { key: `field${number}`, label: `Field ${number}` })
}
function deleteRow(id: string) { people.value = people.value.filter(row => row.id !== id) }
function deleteColumn(key: string) { fields.value = fields.value.filter(field => field.key !== key) }
</script>

<template>
  <div class="editor"><label><input v-model="editable" type="checkbox"> Editable</label>
    <TableEditable :columns="columns" :data="people" :get-row-id="row => row.id" :height="48 * Math.min(7, Math.max(2, people.length + 1))" label="Team editor"
      :on-cell-edit="editable ? edit : undefined" :on-column-rename="editable ? rename : undefined" :on-insert-row="editable ? insertRow : undefined"
      :on-delete-row="editable ? deleteRow : undefined" :on-insert-column="editable ? insertColumn : undefined" :on-delete-column="editable ? deleteColumn : undefined">
      <template #empty><button v-if="editable" type="button" @click="insertRow(0, 'before')">Insert first row</button></template>
    </TableEditable>
    <button v-if="editable && !fields.length" type="button" @click="insertColumn(0, 'before')">Insert first column</button>
  </div>
</template>

<style scoped>.editor { width: 100%; min-width: 0; }.editor > label { display: block; margin-bottom: 8px; font-size: 13px; }</style>
