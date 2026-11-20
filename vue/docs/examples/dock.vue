<script setup lang="ts">
import { ref } from 'vue'
import { Dock } from 'beui-vue'
const active = ref('home')
const items = [
  {id:'home',label:'Home',icon:'⌂'}, {id:'mail',label:'Mail',icon:'✉'},
  {id:'calendar',label:'Calendar',icon:'▦'}, {id:'music',label:'Music',icon:'♫'},
  {id:'discover',label:'Discover',icon:'✧'}, {id:'settings',label:'Settings',icon:'⚙',separatorBefore:true},
  {id:'source',label:'GitHub',icon:'⌘',href:'https://github.com/starc007/ui-components'},
]
</script>
<template><Dock v-model="active" :items="items" label="Application dock" /></template>
