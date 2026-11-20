<script setup lang="ts">
import { Treemap } from 'beui-vue'

const data = [
  { id: 'client', label: 'Client', children: [{ id: 'web', label: 'Web', value: 45 }, { id: 'ios', label: 'iOS', value: 26 }, { id: 'android', label: 'Android', value: 18 }] },
  { id: 'infra', label: 'Infrastructure', children: [{ id: 'db', label: 'Database', value: 24 }, { id: 'edge', label: 'Edge', value: 13 }] },
  { id: 'design', label: 'Design', value: 16 },
]
</script>

<template><Treemap label="Engineering allocation" :data="data" /></template>
