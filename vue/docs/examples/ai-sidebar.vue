<script setup lang="ts">
import { AISidebar, type SidebarResource } from 'beui-vue'
const items: SidebarResource[] = [{ id:'workspace', label:'Workspace', kind:'folder', children:[{id:'notes',label:'Design notes',kind:'file'},{id:'guide',label:'Release guide',kind:'file'}] }, { id:'archive', label:'Archive', kind:'folder' }, { id:'reference', label:'Reference', kind:'bookmark' }]
</script>
<template><AISidebar class="be-agent-demo" :default-items="items" /></template>
