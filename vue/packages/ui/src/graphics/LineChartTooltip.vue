<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { useLineChart } from './chart-model'

const { side = 'auto' } = defineProps<{ side?: 'auto' | 'left' | 'right' }>()
const { data, visible, index, inspecting, tooltipId, overlay, geometry, domain, valueText } = useLineChart()
const panel = useTemplateRef('panel')
const size = shallowRef({ width: 150, height: 96 })
const rows = computed(() => visible.value.map(({ id, name, color, values }) => ({ id, name, color, value: values[index.value] ?? null })))
const category = computed(() => data.value.categories[index.value])
watch(panel, (element, _, cleanup) => {
  if (!element) return
  function measure() { if (element) size.value = { width: element.offsetWidth, height: element.offsetHeight } }
  measure()
  const observer = new ResizeObserver(measure)
  observer.observe(element)
  cleanup(() => observer.disconnect())
}, { flush: 'post' })
const position = computed(() => {
  const { width, height } = geometry.value
  const panelWidth = size.value.width
  const panelHeight = size.value.height
  const fraction = data.value.categories.length <= 1 ? 0.5 : index.value / (data.value.categories.length - 1)
  const pointX = fraction * width
  const values = rows.value.flatMap(row => row.value === null ? [] : [row.value])
  const topValue = values.length ? Math.max(...values) : domain.value.max
  const pointY = (domain.value.max - topValue) / (domain.value.max - domain.value.min) * height
  let left = pointX - panelWidth / 2
  let top = pointY - panelHeight / 2
  if (side === 'right' || (side === 'auto' && pointX + 16 + panelWidth <= width + 12)) left = pointX + 16
  else if (side === 'left' || pointX - 16 - panelWidth >= -40) left = pointX - 16 - panelWidth
  else top = pointY >= panelHeight + 16 ? pointY - panelHeight - 16 : pointY + 16
  left = Math.max(-40, Math.min(width + 12 - panelWidth, left))
  top = Math.max(-8, Math.min(height + 8 - panelHeight, top))
  return `translate(${left}px, ${top}px)`
})
</script>

<template>
  <Teleport v-if="overlay && inspecting" :to="overlay">
    <div :id="tooltipId" ref="panel" class="tooltip" role="tooltip" :style="{ transform: position }">
      <slot :category="category" :index="index" :rows="rows">
        <strong>{{ category }}</strong>
        <div v-for="row in rows" :key="row.id" class="value-row">
          <span class="dot" aria-hidden="true" :style="{ background: row.color }" /><span>{{ row.name }}</span><b>{{ valueText(row.value) }}</b>
        </div>
      </slot>
    </div>
  </Teleport>
</template>

<style scoped>
.tooltip { position: absolute; top: 0; left: 0; z-index: 1; width: max-content; max-width: min(calc(100% + 40px), 20rem); box-sizing: border-box; padding: 8px 12px; border-radius: 9px; background: var(--beui-chart-fg, CanvasText); color: var(--beui-chart-bg, Canvas); font: 12px/1.55 system-ui, sans-serif; pointer-events: none; box-shadow: 0 4px 14px #0002; }
.value-row { display: flex; align-items: center; gap: 7px; }
.value-row b { margin-inline-start: auto; padding-inline-start: 8px; font-variant-numeric: tabular-nums; }
.dot { width: 7px; height: 7px; border-radius: 50%; }
@media (prefers-reduced-motion: no-preference) and (hover: hover) { .tooltip { transition: transform 140ms ease-out; } }
</style>
