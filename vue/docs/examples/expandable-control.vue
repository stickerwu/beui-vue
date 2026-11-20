<script setup lang="ts">
import { ref } from 'vue'
import { ExpandableControl } from 'beui-vue'
const tags = ref(['Design','Motion'])
function add() { if (!tags.value.includes('New tag')) tags.value.push('New tag') }
</script>
<template><div class="tags"><ExpandableControl label="Add tag" @activate="add"/><ExpandableControl v-for="tag in tags" :key="tag" :label="tag" :action-label="`Remove ${tag}`" variant="chip" @remove="tags=tags.filter(value => value!==tag)" /></div></template>
<style scoped>.tags { display:flex; flex-wrap:wrap; align-items:center; gap:.5rem; }</style>
