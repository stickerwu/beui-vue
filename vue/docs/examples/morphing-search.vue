<script setup lang="ts">
import { MorphingSearch } from 'beui-vue'
const items = [{id:'brief',title:'Project brief',description:'Design documents'},{id:'plan',title:'Release plan',description:'Engineering'}]
</script>
<template><MorphingSearch :items="items" placeholder="Search documents…" /></template>
