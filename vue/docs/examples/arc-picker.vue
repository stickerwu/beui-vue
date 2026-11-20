<script setup lang="ts">
import { ArcPicker, ButtonBase } from 'beui-vue'
import { ref } from 'vue'
const sides = ['top','bottom','left','right'] as const
const side = ref<typeof sides[number]>('right')
const selected = ref('Golden hour')
const options = ['First light','Dawn','Daybreak','Sunrise','Early morning','Morning','Late morning','Midday','Noon','Afternoon','Golden hour','Sunset','Blue hour','Dusk','Twilight','Evening','Nightfall','Night','Late night','Midnight','Deep night','Starlight'].map(label => ({ label, value: label }))
</script>
<template><div class="arc-demo"><div class="sides" role="group" aria-label="Curve side"><ButtonBase v-for="edge in sides" :key="edge" :variant="side === edge ? 'secondary' : 'ghost'" size="sm" :aria-pressed="side === edge" @click="side = edge">{{ edge }}</ButtonBase></div>
  <ArcPicker v-model="selected" :options="options" :side="side" label="Time of day" :radius="260" :visible-count="9" :item-height="48" />
  <small>Drag {{ side === 'top' || side === 'bottom' ? 'horizontally' : 'vertically' }}, scroll or use the arrow keys.</small>
</div></template>
<style scoped>.arc-demo { width: min(36rem,100%); text-align: center; } .sides { display: flex; justify-content: center; flex-wrap: wrap; gap: .25rem; } small { color: var(--beui-muted-foreground); }</style>
