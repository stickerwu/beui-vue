<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'

interface Stage { id: string; label: string; value: number; color?: string }
const props = withDefaults(defineProps<{
  stages: readonly Stage[]; direction?: 'horizontal' | 'vertical'; label?: string; unit?: string
  formatValue?: (value: number) => string; labels?: Partial<Record<string, string>>
}>(), { direction: 'vertical', formatValue: (value: number) => value.toLocaleString('en-US') })
const colors = ['#8b5cf6', '#7774ef', '#548ee4', '#2ca6bc', '#14b8a6']
const current = shallowRef<string | null>(null)
const tooltipId = useId()
const unit = computed(() => props.unit ?? props.labels?.unit ?? 'people')
const formatPercent = (value: number | null) => value === null ? '—' : `${value.toFixed(1)}%`
const stages = computed(() => {
  const seen = new Set<string>()
  const rows = props.stages.filter(stage => {
    if (seen.has(stage.id) || !Number.isFinite(stage.value) || stage.value < 0) return false
    seen.add(stage.id)
    return true
  })
  const maximum = Math.max(1, ...rows.map(row => row.value))
  const proportions = rows.map(row => row.value / maximum)
  const point = (cross: number, along: number) => props.direction === 'horizontal' ? `${along * 1000},${cross * 500}` : `${cross * 1000},${along * 500}`
  return rows.map((row, index) => {
    const previous = rows[index - 1]?.value
    const width = proportions[index]
    const top = ((proportions[index - 1] ?? width) + width) / 2
    const bottom = ((proportions[index + 1] ?? width) + width) / 2
    const start = index / rows.length, end = (index + 1) / rows.length
    const middle = (start + end) / 2, quarter = (end - start) / 4
    const edge = (amount: number, along: number, side: number) => point(.5 + side * .46 * amount, along)
    const path = `M${edge(top, start, -1)} L${edge(top, start, 1)} C${edge(top, start + quarter, 1)} ${edge(width, middle - quarter, 1)} ${edge(width, middle, 1)} C${edge(width, middle + quarter, 1)} ${edge(bottom, end - quarter, 1)} ${edge(bottom, end, 1)} L${edge(bottom, end, -1)} C${edge(bottom, end - quarter, -1)} ${edge(width, middle + quarter, -1)} ${edge(width, middle, -1)} C${edge(width, middle - quarter, -1)} ${edge(top, start + quarter, -1)} ${edge(top, start, -1)} Z`
    return { ...row, path, color: row.color ?? colors[index % colors.length], conversion: rows[0].value ? row.value / rows[0].value * 100 : null,
      step: previous ? row.value / previous * 100 : null, change: previous === undefined ? null : row.value - previous }
  })
})
const active = computed(() => stages.value.find(stage => stage.id === current.value))
</script>

<template>
  <section class="funnel" data-slot="funnel-chart" :aria-label="label ?? labels?.label ?? 'Conversion funnel'">
    <p v-if="!stages.length">{{ labels?.empty ?? 'No funnel data' }}</p>
    <template v-else>
      <div class="scroll"><div class="plot" :style="{ height: direction === 'vertical' ? `${Math.max(320, stages.length * 72)}px` : '300px', minWidth: direction === 'horizontal' ? `${stages.length * 110}px` : '240px' }">
        <svg viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true"><path v-for="stage in stages" :key="stage.id" :d="stage.path" :fill="stage.color" /></svg>
        <ol :aria-label="labels?.stages ?? 'Funnel stages'" :class="direction"><li v-for="stage in stages" :key="stage.id">
          <button type="button" :aria-label="`${stage.label}, ${formatValue(stage.value)} ${unit}, ${formatPercent(stage.conversion)} of starting total`"
            :aria-describedby="current === stage.id ? tooltipId : undefined" @focus="current = stage.id" @blur="current = null" @pointerenter="$event.pointerType !== 'touch' && (current = stage.id)" @pointerleave="current = null"
            @click="current = stage.id" @keydown.esc="current = null"><span>{{ formatValue(stage.value) }}</span></button>
        </li></ol>
        <div v-if="active" :id="tooltipId" class="tip" role="tooltip"><strong>{{ active.label }}</strong><div>{{ formatValue(active.value) }} {{ unit }}</div><template v-if="active.change !== null"><div>{{ formatPercent(active.step) }} from previous stage</div><div>{{ formatValue(Math.abs(active.change)) }} {{ active.change > 0 ? 'gained' : 'dropped' }}</div></template></div>
      </div></div>
      <div class="legend"><span v-for="stage in stages" :key="stage.id"><i :style="{ background: stage.color }" />{{ stage.label }} {{ formatPercent(stage.conversion) }}</span></div>
      <footer><span>{{ formatValue(stages[0].value) }} → {{ formatValue(stages[stages.length - 1].value) }} {{ unit }}</span><span>{{ labels?.overall ?? 'Overall conversion' }} <b>{{ formatPercent(stages[stages.length - 1].conversion) }}</b></span></footer>
    </template>
  </section>
</template>

<style scoped>
.funnel { width: 100%; }.scroll { overflow-x: auto; }.plot { position: relative; }
.plot svg, .plot ol { position: absolute; inset: 0; width: 100%; height: 100%; }
.plot ol { display: flex; list-style: none; margin: 0; padding: 0; }.plot ol.vertical { flex-direction: column; }
.plot li { flex: 1; margin: 0; min-height: 0; }
.plot button { width: 100%; height: 100%; border: none; background: transparent; color: inherit; cursor: pointer; }
.plot button span { padding: 3px 7px; border-radius: 4px; background: Canvas; color: CanvasText; font: 600 12px monospace; }
.tip { position: absolute; top: 6px; right: 6px; pointer-events: none; border-radius: 5px; padding: 6px 9px; background: CanvasText; color: Canvas; font: 12px/1.45 system-ui; }
.legend, footer { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; padding: 10px 0; font-size: 12px; }
.legend i { display: inline-block; width: 8px; height: 8px; margin-right: 4px; border-radius: 50%; }
footer { border-top: 1px solid #8884; justify-content: space-between; }
</style>
