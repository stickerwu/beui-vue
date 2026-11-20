<script setup lang="ts">
import { ref } from 'vue'
import { ExpandableActionBar } from 'beui-vue'
const current = ref('edit')
const items = [{id:'edit',label:'Edit',icon:'✎'},{id:'save',label:'Save',icon:'✓'},{id:'share',label:'Share',icon:'↗'}]
</script>
<template><ExpandableActionBar :items="items" :active-id="current" @action="current=$event.id" /></template>
