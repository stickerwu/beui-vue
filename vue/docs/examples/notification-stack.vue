<script setup lang="ts">
import { NotificationStack } from 'beui-vue'
const items = [
  {id:'1',title:'Build completed',description:'The preview is ready.',trailing:'now'},
  {id:'2',title:'New review',description:'The design team left feedback.',trailing:'8m'},
  {id:'3',title:'Release created',description:'Version 1.2 is available.',trailing:'1h'},
]
</script>
<template><NotificationStack :items="items" /></template>
