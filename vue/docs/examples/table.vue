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
.badge { padding: .125rem .5rem; border-radius: 999px; font-size: .75rem; line-height: 1rem; font-weight: 500; text-transform: capitalize; }
.badge[data-status='active'] { background: oklch(69.6% .17 162.48 / .1); color: oklch(59.6% .145 163.225); }
.badge[data-status='invited'] { background: oklch(76.9% .188 70.08 / .1); color: oklch(66.6% .179 58.318); }
.badge[data-status='suspended'] { background: oklch(64.5% .246 16.439 / .1); color: oklch(58.6% .253 17.585); }
:global(:is(.dark, [data-beui-theme='dark']) .people .badge[data-status='active']) { color: oklch(76.5% .177 163.223); }
:global(:is(.dark, [data-beui-theme='dark']) .people .badge[data-status='invited']) { color: oklch(82.8% .189 84.429); }
:global(:is(.dark, [data-beui-theme='dark']) .people .badge[data-status='suspended']) { color: oklch(71.2% .194 13.428); }
</style>
