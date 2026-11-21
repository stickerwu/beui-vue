<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { useLineChart } from './chart-model'

const { side = 'auto' } = defineProps<{ side?: 'auto' | 'left' | 'right' }>()
const { data, visible, index, inspecting, tooltipId, overlay, geometry, domain, valueText } = useLineChart()
const panel = useTemplateRef('panel')
const size = shallowRef({ width: 224, height: 96 })
const reduced = useReducedMotion()
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
  return { x: left, y: top }
})
</script>

<template>
  <Teleport v-if="overlay && inspecting" :to="overlay">
    <motion.div class="tooltip-position" :initial="position" :animate="position" :transition="reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 28, mass: .7 }">
      <div ref="panel">
        <motion.div :id="tooltipId" class="tooltip" role="tooltip" :initial="{ opacity: 0, scale: reduced ? 1 : .94 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: .18, ease: [0.16, 1, 0.3, 1] }">
          <slot :category="category" :index="index" :rows="rows">
            <div class="tooltip-content">
              <strong>{{ category }}</strong>
              <div v-for="row in rows" :key="row.id" class="value-row">
                <span class="dot" aria-hidden="true" :style="{ background: row.color }" /><span>{{ row.name }}</span><b>{{ valueText(row.value) }}</b>
              </div>
            </div>
          </slot>
        </motion.div>
        </div>
    </motion.div>
  </Teleport>
</template>

<style scoped>
.tooltip-position { position: absolute; top: 0; left: 0; z-index: 1; width: max-content; pointer-events: none; }
.tooltip { box-sizing: border-box; max-width: min(calc(100vw - 32px), 20rem); padding: 8px 10px; border: 1px solid var(--beui-border); border-radius: 8px; background: var(--beui-chart-bg, var(--beui-background)); color: var(--beui-chart-fg, var(--beui-foreground)); font-size: 12px; line-height: 1.3333; font-weight: 500; box-shadow: 0 10px 15px -3px #0002, 0 4px 6px -4px #0002; }
.tooltip-content { width: 224px; max-width: 100%; }.tooltip-content strong { display: block; margin-bottom: 8px; font-weight: 500; }
.value-row { display: flex; align-items: center; gap: 8px; font-size: 11px; line-height: inherit; color: var(--beui-chart-muted, var(--beui-muted-foreground)); }
.value-row + .value-row { margin-top: 6px; }.value-row b { margin-inline-start: auto; padding-inline-start: 12px; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-weight: 500; font-variant-numeric: tabular-nums; color: var(--beui-chart-fg, var(--beui-foreground)); }
.dot { width: 4px; height: 10px; border-radius: 9px; flex-shrink: 0; }
</style>
