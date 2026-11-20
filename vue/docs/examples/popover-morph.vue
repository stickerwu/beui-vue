<script setup lang="ts">
import { PopoverMorph } from 'beui-vue'
import { ref } from 'vue'
const open = ref(false)
const actions = ['Edit','Duplicate','Share','Delete']
</script>
<template>
  <PopoverMorph v-model:open="open" label="Options">
    <template #trigger>Options ⌄</template>
    <template #default="{ close }"><div class="actions"><button v-for="action in actions" :key="action" type="button" @click="close">{{ action }}</button></div></template>
  </PopoverMorph>
</template>
<style scoped>.actions { width: 10rem; display: grid; } .actions button { text-align: start; padding: .4rem .5rem; border: none; background: none; color: var(--beui-foreground); cursor: pointer; border-radius: .4rem; } .actions button:hover { background: var(--beui-muted); }</style>
