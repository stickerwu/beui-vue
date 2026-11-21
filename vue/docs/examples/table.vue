<script setup lang="ts">
import { shallowRef } from 'vue'
import { Table, type TableColumn } from 'beui-vue'

type Person = { id: string; name: string; email: string; role: string; status: 'active' | 'invited' | 'suspended'; mrr: number }

const FIRST = ['Ava', 'Leo', 'Mia', 'Kai', 'Zoe', 'Eli', 'Noa', 'Ren', 'Ivy', 'Jude']
const LAST = ['Cole', 'Frost', 'Vale', 'Reyes', 'Okafor', 'Sato', 'Lund', 'Marsh', 'Bose', 'Quinn']
const ROLES = ['Owner', 'Admin', 'Member', 'Viewer']
const STATUSES: Person['status'][] = ['active', 'invited', 'suspended']

// Deterministic so the server and the client render the same rows.
function buildPeople(count: number): Person[] {
  const out: Person[] = []
  for (let i = 0; i < count; i++) {
    const first = FIRST[i % FIRST.length]
    const last = LAST[(i * 7) % LAST.length]
    out.push({
      id: String(i),
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${i}@beui.dev`,
      role: ROLES[(i * 3) % ROLES.length],
      status: STATUSES[(i * 5) % STATUSES.length],
      mrr: 12 + ((i * 37) % 488),
    })
  }
  return out
}

const data = buildPeople(10_000)
const selected = shallowRef<string[]>([])
const columns: TableColumn<Person>[] = [
  { key: 'name', header: 'Name', sortable: true, width: '1.4fr' },
  { key: 'email', header: 'Email', width: '1.8fr' },
  { key: 'role', header: 'Role', sortable: true, width: '120px' },
  { key: 'status', header: 'Status', width: '130px' },
  { key: 'mrr', header: 'MRR', sortable: true, align: 'right', width: '110px' },
]
</script>

<template>
  <div class="demo"><div class="people">
    <div class="summary">
      <span>{{ data.length.toLocaleString('en-US') }} rows</span>
      <span v-if="selected.length > 0">{{ selected.length.toLocaleString('en-US') }} selected</span>
    </div>
    <Table
      v-model:selected-row-ids="selected"
      class="rounded"
      label="People"
      :data="data"
      :columns="columns"
      :get-row-id="row => row.id"
      selectable
      resizable
      reorderable
      :default-sort="{ key: 'mrr', direction: 'desc' }"
      :height="420"
      :row-height="52"
    >
      <template #cell-name="{ row }"><span class="name">{{ row.name }}</span></template>
      <template #cell-status="{ row }"><span class="badge" :data-status="row.status">{{ row.status }}</span></template>
      <template #cell-mrr="{ row }"><span class="money">${{ row.mrr.toLocaleString('en-US') }}</span></template>
    </Table>
  </div>
  </div>
</template>

<style scoped>
.demo { display: flex; width: 100%; justify-content: center; padding: 1rem; box-sizing: border-box; }
.people { display: flex; width: 100%; flex-direction: column; gap: .5rem; }
.summary { display: flex; align-items: center; justify-content: space-between; padding: 0 .25rem; color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; }
.rounded { border-radius: 1rem; }
.name { font-weight: 500; }
.money { font-variant-numeric: tabular-nums; }
.badge { display: inline-block; padding: .125rem .5rem; border-radius: 999px; font-size: .75rem; line-height: 1rem; font-weight: 500; text-transform: capitalize; }
.badge[data-status='active'] { background: rgb(16 185 129 / .1); color: #059669; }
.badge[data-status='invited'] { background: rgb(245 158 11 / .1); color: #d97706; }
.badge[data-status='suspended'] { background: rgb(244 63 94 / .1); color: #e11d48; }
:global(:is(.dark, [data-beui-theme='dark']) .people .badge[data-status='active']) { color: #34d399; }
:global(:is(.dark, [data-beui-theme='dark']) .people .badge[data-status='invited']) { color: #fbbf24; }
:global(:is(.dark, [data-beui-theme='dark']) .people .badge[data-status='suspended']) { color: #fb7185; }
</style>
