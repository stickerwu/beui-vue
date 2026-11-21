<script setup lang="ts">
/** Each entry is a toggle: pressed means the series is drawn. Port of upstream `XYLegend`. */
defineProps<{
  rows: readonly { id: string; name: string; color: string }[]
  hidden: readonly string[]
  canHover: boolean
  label: string
}>()
const emit = defineEmits<{ toggle: [id: string]; hover: [id: string | null] }>()
</script>

<template>
  <ul class="xy-legend" :aria-label="label">
    <li v-for="row in rows" :key="row.id">
      <button type="button" :aria-pressed="!hidden.includes(row.id)" :class="{ off: hidden.includes(row.id) }"
        @click="emit('toggle', row.id)" @pointerenter="canHover && !hidden.includes(row.id) && emit('hover', row.id)" @pointerleave="emit('hover', null)"
        @focus="!hidden.includes(row.id) && emit('hover', row.id)" @blur="emit('hover', null)">
        <span aria-hidden="true" class="swatch" :style="{ borderColor: row.color, backgroundColor: hidden.includes(row.id) ? 'transparent' : row.color }" />
        <span class="name">{{ row.name }}</span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
.xy-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 0; padding: 0; list-style: none; font-size: 12px; line-height: 1.3333; }
.xy-legend li { margin: 0; padding: 0; }
.xy-legend button { display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 8px; border: 0; border-radius: 6px; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: 12px; line-height: 1.3333; cursor: pointer; transition: color .15s, opacity .15s; }
@media (hover: hover) { .xy-legend button:hover { color: var(--beui-foreground); } }
.xy-legend button:focus-visible { outline: 2px solid var(--beui-chart-ring, color-mix(in srgb, var(--beui-foreground) 12%, transparent)); outline-offset: 2px; }
.xy-legend button.off { opacity: .5; }
.swatch { box-sizing: border-box; flex: none; width: 10px; height: 10px; border: 2px solid; border-radius: 9999px; transition: background-color .15s, border-color .15s; }
.xy-legend button.off .name { text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); }
</style>
