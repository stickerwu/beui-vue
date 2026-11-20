<script setup lang="ts">
import { ActionSwap } from 'beui-vue'
const items = [{id:'copy',label:'Copy link'}, {id:'copied',label:'Copied'}]
</script>
<template><ActionSwap :items="items" animation="blur" variant="outline" /></template>
