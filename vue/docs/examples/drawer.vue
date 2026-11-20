<script setup lang="ts">
import { ref } from 'vue'
import { ButtonBase, Drawer } from 'beui-vue'
const open = ref(false)
const side = ref<'left'|'right'>('left')
function show(direction: 'left'|'right', event: MouseEvent) {
  ;(event.currentTarget as HTMLButtonElement).focus()
  side.value = direction
  open.value = true
}
</script>
<template><div class="actions"><ButtonBase @click="show('left',$event)">Open left</ButtonBase><ButtonBase @click="show('right',$event)">Open right</ButtonBase></div><Drawer v-model:open="open" :side="side" label="Demo drawer" v-slot="{ close }"><h2>Demo drawer</h2><p>This panel slides in from the {{ side }}.</p><ButtonBase @click="close">Close</ButtonBase></Drawer></template>
<style scoped>.actions { display:flex; gap:.65rem; flex-wrap:wrap; }</style>
