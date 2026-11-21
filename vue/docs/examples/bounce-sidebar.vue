<script setup lang="ts">
import { ref } from 'vue'
import { BounceSidebar } from 'beui-vue'

const destinations = [
  { id: 'overview', label: 'Overview' },
  { id: 'components', label: 'Components' },
  { id: 'motion', label: 'Motion' },
  { id: 'templates', label: 'Templates' },
  { id: 'changelog', label: 'Changelog' },
]
const active = ref('components')
</script>

<template>
  <div class="stage">
    <BounceSidebar v-model="active" :items="destinations" label="beUI sections" class="sidebar" />
  </div>
</template>

<style scoped>
.stage { display: flex; min-height: 360px; width: 100%; align-items: center; justify-content: center; }
.sidebar { width: 13rem; }
.sidebar :deep(.bounce-list) { width: 100%; }
.sidebar :deep(.bounce-link) { font-size: 1rem; line-height: 1.5rem; }
</style>
