<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { TableAsync, type TableColumn } from 'beui-vue'

interface Person { id: string; name: string; email: string; role: string }
const columns: TableColumn<Person>[] = [
  { key: 'name', header: 'Name' }, { key: 'email', header: 'Email', width: '210px' },
  { key: 'role', header: 'Role', width: '100px' },
]
const data = shallowRef<Person[]>([])
const loading = ref(true)
let pages = 0, timer: ReturnType<typeof setTimeout> | undefined
function load() {
  if (timer !== undefined || pages >= 8) return
  loading.value = true
  timer = setTimeout(() => {
    const next = Array.from({ length: 20 }, (_, offset) => {
      const number = pages * 20 + offset
      const name = ['Ava Cole', 'Leo Frost', 'Mia Vale', 'Kai Reyes'][number % 4]
      return { id: String(number), name, email: `${name.split(' ')[0].toLowerCase()}${number}@example.org`, role: ['Owner', 'Member', 'Admin'][number % 3] }
    })
    data.value = [...data.value, ...next]
    pages++; timer = undefined; loading.value = false
  }, 550)
}
onMounted(load)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template><div class="paged"><p role="status">{{ data.length }} loaded · {{ loading ? 'Loading…' : data.length === 160 ? 'All loaded' : 'Scroll for more' }}</p>
  <TableAsync :columns="columns" :data="data" :get-row-id="row => row.id" :loading="loading" :height="320" :row-height="48" label="Paged people" @end-reached="load" />
</div></template>

<style scoped>.paged { width: 100%; min-width: 0; }.paged p { font-size: 12px; }</style>
