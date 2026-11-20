<script setup lang="ts">
import { ref } from 'vue'
import { SortableStack } from 'beui-vue'
const tasks = ref([
  {id:'research',title:'Collect references',detail:'Find the right direction'},
  {id:'design',title:'Explore the visual system',detail:'Type, color, and composition'},
  {id:'build',title:'Build the first prototype',detail:'Make the interaction tangible'},
  {id:'ship',title:'Ship something useful',detail:'Polish the details and release'},
])
</script>
<template><div class="tasks"><strong>Studio priorities</strong><SortableStack v-model="tasks" label="Studio priorities" /></div></template>
<style scoped>.tasks { width:min(27rem,100%); } strong { display:block; margin-bottom:.8rem; }</style>
