<script setup lang="ts">
import { Tooltip } from 'beui-vue'
const placements = [
  { side: 'top', text: 'Top', icon: '↑', area: '1 / 2' },
  { side: 'left', text: 'Left', icon: '←', area: '2 / 1' },
  { side: 'right', text: 'Right', icon: '→', area: '2 / 3' },
  { side: 'bottom', text: 'Bottom', icon: '↓', area: '3 / 2' },
] as const
</script>
<template><div class="tips"><div class="grid"><Tooltip v-for="item in placements" :key="item.side" :side="item.side" content="More context" arrow :style="{ gridArea: item.area }"><span aria-hidden="true">{{ item.icon }}</span> {{ item.text }}</Tooltip></div><small>Hover or focus. Press Esc to dismiss.</small></div></template>
<style scoped>.tips { display: grid; justify-items: center; gap: 2rem; } .grid { display: grid; grid-template-columns: repeat(3, auto); gap: 1rem .5rem; } small { color: var(--beui-muted-foreground); }</style>
