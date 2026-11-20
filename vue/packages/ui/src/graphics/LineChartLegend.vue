<script setup lang="ts">
import { useLineChart } from './chart-model'

const { data, hidden, hovered, toggle, messages } = useLineChart()
function highlight(id: string) { hovered.value = hidden.value.includes(id) ? null : id }
function pointerEnter(event: PointerEvent, id: string) {
  if (event.pointerType !== 'touch' && window.matchMedia('(any-hover: hover)').matches) highlight(id)
}
</script>

<template>
  <ul class="legend" :aria-label="messages.series">
    <li v-for="row in data.rows" :key="row.id" class="entry">
      <button type="button" class="toggle" :aria-pressed="!hidden.includes(row.id)"
        @click="toggle(row.id)" @pointerenter="pointerEnter($event, row.id)" @pointerleave="hovered = null"
        @focus="highlight(row.id)" @blur="hovered = null">
        <span aria-hidden="true" class="swatch" :style="{ color: row.color }" />{{ row.name }}
      </button>
    </li>
  </ul>
</template>

<style scoped>
.legend { display: flex; flex-wrap: wrap; gap: 4px; margin: 12px 0 0; padding: 0; list-style: none; }
.entry { margin: 0; }
.toggle { display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 0 8px; background: transparent; border: 0; border-radius: 6px; color: inherit; cursor: pointer; font: inherit; font-size: 12px; }
.toggle:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.swatch { box-sizing: border-box; width: 10px; height: 10px; border: 2px solid; border-radius: 50%; background: currentColor; }
.toggle[aria-pressed='false'] { text-decoration: line-through; opacity: 0.55; }
.toggle[aria-pressed='false'] .swatch { background: transparent; }
</style>
