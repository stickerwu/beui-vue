<script setup lang="ts">
import { ref } from 'vue'
import { AnimatedSidebar } from 'beui-vue'
const active = ref('People')
const destinations = [
  {id:'People',label:'People',icon:'◎',children:['All people','Recent activity','Segments']},
  {id:'Companies',label:'Companies',icon:'▥'},
  {id:'Opportunities',label:'Opportunities',icon:'◉',children:['Pipeline','Forecast','Closed deals']},
  {id:'Tasks',label:'Tasks',icon:'☷'}, {id:'Notes',label:'Notes',icon:'▤'},
  {id:'Workflows',label:'Workflows',icon:'⌘',children:['Automations','Runs','Templates']},
  {id:'Dashboard',label:'Dashboard',icon:'▦'},
].map(item => ({ ...item,children:item.children?.map(label => ({id:label,label})) }))
</script>
<template><AnimatedSidebar v-model="active" :items="destinations" label="Solace workspace"><template #header="{ expanded }"><strong>{{ expanded ? '⌘　Acme Inc' : '⌘' }}</strong></template><h3>{{ active }}</h3></AnimatedSidebar></template>
