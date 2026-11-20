<script setup lang="ts">
import { ref } from 'vue'
import { FileTree } from 'beui-vue'
const expanded = ref(['src','components'])
const selected = ref('button')
const items = [
  {id:'src',name:'src',children:[{id:'components',name:'components',children:[{id:'button',name:'button.tsx'},{id:'input',name:'input.tsx'}]},{id:'lib',name:'lib',children:[{id:'utils',name:'utils.ts'}]}]},
  {id:'package',name:'package.json'},{id:'readme',name:'README.md'},
]
</script>
<template><FileTree v-model="selected" v-model:expanded="expanded" :items="items" label="Project files" /></template>
