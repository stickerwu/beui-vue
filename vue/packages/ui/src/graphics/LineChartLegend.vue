<script setup lang="ts">
import XYLegend from '../charts/XYLegend.vue'
import { useLineChart } from './chart-model'
import { useHoverCapable } from '../charts/plot-utils'

const { data, hidden, hovered, toggle, messages } = useLineChart()
const canHover = useHoverCapable()
</script>

<template>
  <XYLegend class="line-legend" :rows="data.rows" :hidden="hidden" :can-hover="canHover" :label="messages.series" @toggle="toggle" @hover="hovered = $event" />
</template>

<style scoped>
.line-legend { margin-top: 12px; }
</style>
