<script setup lang="ts">
// The classic minesweeper mine: a solid ball (so it never reads as a sun), four thick spikes on the axes
// and four shorter ones on the diagonals, on Lucide's 24px grid so it pairs with the gem.
const spikes = Array.from({ length: 8 }, (_, i) => {
  const angle = (i * Math.PI) / 4
  const main = i % 2 === 0
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)]
  const reach = main ? 10.5 : 9
  return { main, x1: 12 + cos * 6, y1: 12 + sin * 6, x2: 12 + cos * reach, y2: 12 + sin * reach }
})
</script>

<template>
  <!-- Decorative: tiles and the stepper name the mine in text. -->
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-linecap="round">
    <line v-for="spike in spikes" :key="`${spike.x2.toFixed(2)}-${spike.y2.toFixed(2)}`" :x1="spike.x1" :y1="spike.y1" :x2="spike.x2" :y2="spike.y2" :stroke-width="spike.main ? 2.5 : 2" />
    <circle cx="12" cy="12" r="6.5" stroke="none" />
    <circle cx="9.75" cy="9.75" r="1.6" fill="white" fill-opacity="0.75" stroke="none" />
  </svg>
</template>
