<script setup lang="ts">
import { ref } from 'vue'
import { CommandPalette } from 'beui-vue'
const selected = ref('')
const commands = [
  {id:'release',label:'Release notes',group:'Documentation',keywords:['changelog']},
  {id:'workspace',label:'Open workspace',group:'Navigation'},
  {id:'settings',label:'Settings',group:'Navigation'},
]
</script>
<template><div><CommandPalette :items="commands" @select="selected=$event.label ?? ''" /><output>{{ selected }}</output></div></template>
