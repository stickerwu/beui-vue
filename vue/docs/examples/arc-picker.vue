<script setup lang="ts">
import { ArcPicker, ButtonBase } from 'beui-vue'
import { ref } from 'vue'
const sides = ['top', 'bottom', 'left', 'right'] as const
const side = ref<typeof sides[number]>('right')
const selected = ref('golden-hour')
const options = ['First light', 'Dawn', 'Daybreak', 'Sunrise', 'Early morning', 'Morning', 'Late morning', 'Midday', 'Noon', 'Afternoon', 'Golden hour', 'Sunset', 'Blue hour', 'Dusk', 'Twilight', 'Evening', 'Nightfall', 'Night', 'Late night', 'Midnight', 'Deep night', 'Starlight']
  .map(label => ({ label, value: label.toLowerCase().replace(/ /g, '-') }))
</script>
<template>
  <div class="arc-demo">
    <fieldset class="sides">
      <legend class="sr-only">Curve side</legend>
      <ButtonBase v-for="edge in sides" :key="edge" :variant="side === edge ? 'secondary' : 'ghost'" size="sm" :aria-pressed="side === edge" class="side-button" @click="side = edge">{{ edge }}</ButtonBase>
    </fieldset>
    <div class="arc-stage">
      <ArcPicker v-model="selected" :options="options" :side="side" label="Time of day" :radius="260" :visible-count="9" :item-height="48" />
    </div>
    <p class="arc-note">Drag {{ side === 'top' || side === 'bottom' ? 'horizontally' : 'vertically' }}, scroll or use the arrow keys.</p>
  </div>
</template>
<style scoped>
.arc-demo { width: 100%; max-width: 36rem; padding: 1.25rem 0; }
.sides { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .25rem; margin: 0; padding: 0 1rem; border: 0; min-width: 0; }
.side-button { text-transform: capitalize; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.arc-stage { display: flex; align-items: center; min-height: 27rem; margin: 2rem 0; }
@media (min-width: 640px) { .arc-stage { margin: 2.5rem 0; } }
.arc-note { margin: 0; padding: 0 1.5rem; text-align: center; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
</style>
