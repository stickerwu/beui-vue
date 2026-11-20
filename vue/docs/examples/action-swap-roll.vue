<script setup lang="ts">
import { ActionSwap } from 'beui-vue'
const items = [{id:'play',label:'Play'}, {id:'pause',label:'Pause'}]
</script>
<template><ActionSwap :items="items" animation="roll" /></template>
