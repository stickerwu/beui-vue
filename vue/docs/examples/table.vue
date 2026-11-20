<script setup lang="ts">
import { shallowRef } from 'vue'
import { Table, type TableColumn } from 'beui-vue'

const names = ['Ava Cole', 'Leo Marsh', 'Mia Okafor', 'Kai Frost', 'Zoe Bose', 'Eli Sato', 'Noa Vale', 'Ren Quinn', 'Ivy Lund', 'Jude Reyes']
const roles = ['Owner', 'Admin', 'Member', 'Viewer']
const data = Array.from({ length: 10_000 }, (_, index) => ({
  id: String(index), name: names[index % 10], role: roles[(index * 3) % 4],
  status: ['active', 'invited', 'suspended'][(index * 5) % 3], mrr: 12 + (index * 37) % 488,
}))
const columns: TableColumn<typeof data[number]>[] = [
  { key: 'name', header: 'Name', sortable: true }, { key: 'role', header: 'Role', sortable: true, width: '110px' },
  { key: 'status', header: 'Status', width: '110px' }, { key: 'mrr', header: 'MRR', sortable: true, align: 'right', width: '105px' },
]
const selected = shallowRef<string[]>([])
</script>

<template>
  <div class="people"><p>10,000 rows <span v-if="selected.length">· {{ selected.length.toLocaleString('en-US') }} selected</span></p>
    <Table :data="data" :columns="columns" :get-row-id="row => row.id" v-model:selected-row-ids="selected" selectable resizable reorderable :default-sort="{ key: 'mrr', direction: 'desc' }" :height="360" :row-height="48" label="People">
      <template #cell-status="{ row }"><span class="badge" :data-status="row.status">{{ row.status }}</span></template>
      <template #cell-mrr="{ row }">${{ row.mrr }}</template>
    </Table>
  </div>
</template>

<style scoped>
.people { width: 100%; min-width: 0; }.people p { font-size: 12px; }.badge { padding: 2px 6px; border-radius: 10px; background: #7772; font-size: 11px; }.badge[data-status='active'] { background: #10966825; }.badge[data-status='suspended'] { background: #e86b7825; }
</style>
