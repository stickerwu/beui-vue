<script setup lang="ts">
import { ActionSwap } from 'beui-vue'
const items = [{id:'follow',label:'Follow'}, {id:'following',label:'Following'}]
</script>
<template><ActionSwap :items="items" animation="cascade" /></template>
