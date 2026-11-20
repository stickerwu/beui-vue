<script setup lang="ts">
import { Combobox } from 'beui-vue'
import { ref } from 'vue'
const workspace = ref('studio')
const options = [
  { value: 'studio', label: 'Design studio', detail: '12 projects', group: 'Recent', color: '#d9a23c' },
  { value: 'product', label: 'Product team', detail: '8 projects', group: 'Recent', color: '#62aee0' },
  { value: 'playground', label: 'Playground', detail: '24 experiments', group: 'Workspaces', color: '#63a880' },
  { value: 'archive', label: 'Component archive', detail: '41 components', group: 'Workspaces', color: '#ce7490' },
]
</script>
<template><div class="workspace"><small>Workspace</small><Combobox v-model="workspace" :options="options" label="Search workspaces" placeholder="Search workspaces…" empty="No workspaces found." /></div></template>
<style scoped>.workspace { width: min(18rem,100%); } small { display: block; color: var(--beui-muted-foreground); margin-bottom: .5rem; }</style>
