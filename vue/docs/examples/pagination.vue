<script setup lang="ts">
import { Pagination } from 'beui-vue'
import { ref } from 'vue'
const page = ref(6)
</script>
<template><div class="paging"><Pagination v-model="page" :total-pages="20" /><output>Page {{ page }} of 20</output></div></template>
<style scoped>.paging { display: grid; justify-items: center; gap: 1rem; } output { font-size: .75rem; color: var(--beui-muted-foreground); }</style>
