<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { TableAsync, type TableColumn } from 'beui-vue'

type Person = { id: string; name: string; email: string; role: string; status: 'active' | 'invited' | 'suspended'; mrr: number }

const FIRST = ['Ava', 'Leo', 'Mia', 'Kai', 'Zoe', 'Eli', 'Noa', 'Ren', 'Ivy', 'Jude']
const LAST = ['Cole', 'Frost', 'Vale', 'Reyes', 'Okafor', 'Sato', 'Lund', 'Marsh', 'Bose', 'Quinn']
const ROLES = ['Owner', 'Admin', 'Member', 'Viewer']
const STATUSES: Person['status'][] = ['active', 'invited', 'suspended']
const PAGE_SIZE = 20
const MAX_PAGES = 8

function buildPage(page: number): Person[] {
  const out: Person[] = []
  const start = page * PAGE_SIZE
  for (let n = start; n < start + PAGE_SIZE; n++) {
    const first = FIRST[n % FIRST.length]
    const last = LAST[(n * 7) % LAST.length]
    out.push({
      id: String(n),
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${n}@beui.dev`,
      role: ROLES[(n * 3) % ROLES.length],
      status: STATUSES[(n * 5) % STATUSES.length],
      mrr: 12 + ((n * 37) % 488),
    })
  }
  return out
}

const rows = shallowRef<Person[]>([])
const loading = shallowRef(true)
const page = shallowRef(0)
let pending: ReturnType<typeof setTimeout> | undefined

function loadMore() {
  if (pending !== undefined || page.value >= MAX_PAGES) return
  loading.value = true
  // Simulate a network request.
  pending = setTimeout(() => {
    rows.value = [...rows.value, ...buildPage(page.value)]
    page.value += 1
    pending = undefined
    loading.value = false
  }, 700)
}
onMounted(loadMore)
onBeforeUnmount(() => clearTimeout(pending))

const columns: TableColumn<Person>[] = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email', width: '220px' },
  { key: 'role', header: 'Role', width: '110px' },
  { key: 'status', header: 'Status', width: '120px' },
  { key: 'mrr', header: 'MRR', align: 'right', width: '100px' },
]
const done = computed(() => page.value >= MAX_PAGES)
</script>

<template>
  <div class="demo"><div class="people">
    <div class="summary">
      <span role="status">{{ rows.length.toLocaleString('en-US') }} loaded</span>
      <span>{{ loading ? 'Loading…' : done ? 'All loaded' : 'Scroll for more' }}</span>
    </div>
    <TableAsync class="rounded" label="Paged people" :data="rows" :columns="columns" :get-row-id="row => row.id" :height="420" :row-height="52" :loading="loading" @end-reached="loadMore">
      <template #cell-name="{ row }"><span class="name">{{ row.name }}</span></template>
      <template #cell-status="{ row }"><span class="badge" :data-status="row.status">{{ row.status }}</span></template>
      <template #cell-mrr="{ row }"><span class="money">${{ row.mrr.toLocaleString('en-US') }}</span></template>
    </TableAsync>
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
