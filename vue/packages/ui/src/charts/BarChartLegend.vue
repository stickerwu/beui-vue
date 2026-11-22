<script setup lang="ts">
import { useBarChart } from './bar-chart-context'
import XYLegend from './XYLegend.vue'

/** Toggle a series to hide it; its bars collapse and the axis rescales. */
const { data, hidden, toggle, hovered, canHover, t, setHovered } = useBarChart()
</script>

<template>
  <XYLegend :rows="data.rows" :hidden="hidden" :can-hover="canHover" :label="t('series')" @toggle="toggle" @hover="setHovered($event)" />
</template>
