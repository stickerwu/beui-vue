<script setup lang="ts">
import { Pagination } from 'beui-vue'
import { ref } from 'vue'

const page = ref(6)
</script>
<template>
  <div class="paging">
    <Pagination v-model:page="page" :total-pages="20" />
    <p>Page {{ page }} of 20</p>
  </div>
</template>
<style scoped>
.paging { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
p { margin: 0; font-size: 0.75rem; line-height: 1rem; color: var(--beui-muted-foreground); font-variant-numeric: tabular-nums; }
</style>
