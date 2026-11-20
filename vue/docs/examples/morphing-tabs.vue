<script setup lang="ts">
import { ref } from 'vue'
import { MorphingTabs } from 'beui-vue'
const tabs = ref([
  {id:'notes',label:'Notes',content:'Write down project decisions.'},
  {id:'plan',label:'Plan',content:'Review the next milestone.'},
  {id:'assets',label:'Assets',content:'Browse shared resources.'},
])
function close(id:string) { tabs.value=tabs.value.filter(tab => tab.id !== id) }
</script>
<template><MorphingTabs :items="tabs" default-value="notes" :on-close="close" /></template>
