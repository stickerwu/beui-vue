<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { buildLiquidityHeatmap, pricePosition, type LiquiditySnapshot } from './models/liquidity-heatmap'

const props = withDefaults(defineProps<{
  snapshots: readonly LiquiditySnapshot[]; maxSize?: number; unit?: string; label?: string; formatPrice?: (price: number) => string
  formatSize?: (size: number) => string; labels?: Partial<Record<string, string>>
}>(), { formatPrice: (value: number) => value.toLocaleString('en-US'), formatSize: (value: number) => value.toLocaleString('en-US', { notation: 'compact' }) })
const colors = ['#17233b', '#254f80', '#217c90', '#27af98', '#97d56b', '#f4df76']
const model = computed(() => buildLiquidityHeatmap(props.snapshots))
const ceiling = computed(() => props.maxSize && props.maxSize > 0 ? props.maxSize : model.value.maximum || 1)
const cells = computed(() => model.value.prices.flatMap((price, row) => model.value.columns.map((column, ordinal) => {
  const size = column.levels.get(price)
  return { row, ordinal, id: JSON.stringify([price, column.id]), size, color: size === undefined ? '#8882' : colors[Math.min(5, Math.floor(size / ceiling.value * 6))],
    text: `${column.label}, ${props.formatPrice(price)}: ${size === undefined ? props.labels?.missing ?? 'No data' : `${props.formatSize(size)} ${props.unit ?? 'units'}`}` }
})))
const trace = computed(() => {
  let gap = true
  return model.value.columns.map((column, ordinal) => {
    const pos = column.price === undefined ? null : pricePosition(column.price, model.value.prices)
    if (pos === null) { gap = true; return '' }
    const command = gap ? 'M' : 'L'; gap = false
    return `${command}${ordinal + .5},${pos}`
  }).join(' ')
})
const current = shallowRef<string | null>(null)
const cursor = shallowRef(0)
const active = computed(() => cells.value.find(cell => cell.id === current.value))
function move(event: KeyboardEvent, index: number) {
  const offsets: Record<string, number> = { ArrowDown: model.value.columns.length, ArrowUp: -model.value.columns.length, ArrowLeft: -1, ArrowRight: 1 }
  if (!(event.key in offsets)) return
  event.preventDefault()
  const next = index + offsets[event.key]
  ;(event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus()
}
</script>

<template>
  <section class="liquidity" data-slot="liquidity-heatmap" :aria-label="label ?? labels?.label ?? 'Liquidity heatmap'">
    <div v-if="cells.length" class="chart"><div class="prices"><small v-for="price in model.prices" :key="price">{{ formatPrice(price) }}</small></div>
      <div class="grid" :style="{ gridTemplateColumns: `repeat(${model.columns.length}, 1fr)` }" @pointerleave="current = null">
        <button v-for="(cell, index) in cells" :key="cell.id" type="button" :style="{ backgroundColor: cell.color }" :aria-label="cell.text" :tabindex="cursor === index ? 0 : -1" :data-cell="index"
          @focus="cursor = index; current = cell.id" @blur="current = null" @pointerenter="$event.pointerType !== 'touch' && (current = cell.id)" @click="current = cell.id" @keydown.esc="current = null" @keydown="move($event, index)" />
        <svg :viewBox="`0 0 ${model.columns.length} ${model.prices.length}`" preserveAspectRatio="none" aria-hidden="true"><path :d="trace" fill="none" stroke="white" stroke-width="2" vector-effect="non-scaling-stroke" /></svg>
      </div>
    </div>
    <p v-else>{{ labels?.empty ?? 'No liquidity data' }}</p>
    <div class="ends"><span>{{ model.columns[0]?.label }}</span><span>{{ model.columns.at(-1)?.label }}</span></div>
    <div class="scale">{{ labels?.less ?? 'Less' }}<i v-for="color in colors" :key="color" :style="{ background: color }" />{{ labels?.more ?? 'More' }}</div>
    <div v-if="active" role="tooltip">{{ active.text }}</div>
  </section>
</template>

<style scoped>
.liquidity { width: 100%; font-size: 12px; }.chart { display: flex; gap: 6px; }.prices { display: grid; align-items: center; font-size: 12px; }
.grid { position: relative; display: grid; flex: 1; gap: 2px; }.grid button { min-width: 0; height: 24px; padding: 0; border: 0; border-radius: 2px; cursor: crosshair; }
.grid button:focus-visible { z-index: 1; outline: 2px solid currentColor; }.grid svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.ends, .scale { display: flex; justify-content: space-between; font-size: 11px; }.scale { gap: 3px; justify-content: flex-end; align-items: center; }.scale i { width: 14px; height: 8px; border-radius: 2px; }
</style>
