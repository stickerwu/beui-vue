<script setup lang="ts">
import { computed, shallowRef } from 'vue'

interface RankSeries { id: string; name: string; ranks: readonly (number | null)[]; color?: string }
const props = defineProps<{
  series: readonly RankSeries[]; periods: readonly string[]; active?: string | null; defaultActive?: string | null; label?: string; labels?: Partial<Record<string, string>>
}>()
const emit = defineEmits<{ 'update:active': [value: string | null]; activeChange: [value: string | null] }>()
const internal = shallowRef(props.defaultActive ?? null)
const hover = shallowRef<string | null>(null)
const pin = computed(() => props.active === undefined ? internal.value : props.active)
const highlight = computed(() => hover.value ?? pin.value)
const palette = ['#8b5cf6', '#0d9488', '#f59e0b', '#3b82f6', '#f43f5e', '#a3a33a']
const rows = computed(() => {
  const seen = new Set<string>()
  return props.series.flatMap((row, ordinal) => {
    if (seen.has(row.id)) return []
    seen.add(row.id)
    return [{ ...row, color: row.color ?? palette[ordinal % palette.length], ranks: props.periods.map((_, index) => {
      const value = row.ranks[index]
      return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
    }) }]
  })
})
const ranks = computed(() => [...new Set(rows.value.flatMap(row => row.ranks.filter((rank): rank is number => rank !== null)))].sort((left, right) => left - right))
const highest = computed(() => ranks.value.at(-1) ?? 1)
const innerHeight = computed(() => Math.max(1, Math.min(8, highest.value - 1)) * 44)
const xAt = (step: number) => 32 + (props.periods.length > 1 ? step / (props.periods.length - 1) : .5) * 428
const yAt = (rank: number) => 28 + (highest.value > 1 ? (rank - 1) / (highest.value - 1) : .5) * innerHeight.value
const lines = computed(() => rows.value.map(row => {
  let path = ''
  let last: { x: number; y: number } | null = null
  const marks = row.ranks.flatMap((rank, index) => {
    if (rank === null) { last = null; return [] }
    const point = { x: xAt(index), y: yAt(rank) }
    if (last) {
      const middle = (last.x + point.x) / 2
      path += `C${middle},${last.y} ${middle},${point.y} ${point.x},${point.y}`
    } else path += `M${point.x},${point.y}`
    last = point
    return [{ rank, index, ...point }]
  })
  return { ...row, path, marks }
}))
function toggle(id: string) {
  const next = pin.value === id ? null : id
  if (props.active === undefined) internal.value = next
  emit('update:active', next); emit('activeChange', next)
}
</script>

<template>
  <section class="bump" data-slot="bump-chart" :aria-label="label ?? labels?.label ?? 'Rank history'">
    <svg :viewBox="`0 0 560 ${innerHeight + 64}`" aria-hidden="true" @pointerleave="hover = null">
      <g v-for="rank in ranks" :key="rank"><line x1="32" x2="460" :y1="yAt(rank)" :y2="yAt(rank)" stroke="currentColor" stroke-opacity=".14" stroke-dasharray="3 4" /><text x="5" :y="yAt(rank) + 4">#{{ rank }}</text></g>
      <text v-for="(period, index) in periods" :key="period" :x="xAt(index)" :y="innerHeight + 52" text-anchor="middle">{{ period }}</text>
      <g v-for="row in lines" :key="row.id" :opacity="highlight && highlight !== row.id ? .22 : 1" @pointerenter="$event.pointerType !== 'touch' && (hover = row.id)" @click="toggle(row.id)">
        <path :d="row.path" :stroke="row.color" :stroke-width="highlight === row.id ? 4 : 3" fill="none" />
        <circle v-for="mark in row.marks" :key="mark.index" :cx="mark.x" :cy="mark.y" r="4" :fill="row.color" />
        <text v-if="row.ranks.at(-1)" x="472" :y="yAt(row.ranks.at(-1)!) + 4">{{ row.name }}</text>
      </g>
    </svg>
    <div class="legend"><button v-for="row in lines" :key="row.id" type="button" :aria-pressed="pin === row.id" @focus="hover = row.id" @blur="hover = null" @click="toggle(row.id)">
      <i :style="{ background: row.color }" />{{ row.name }}<span class="sr">{{ row.marks.map(mark => `${periods[mark.index]}: ${mark.rank}`).join(', ') }}</span>
    </button></div>
  </section>
</template>

<style scoped>
.bump { width: 100%; }.bump svg { display: block; width: 100%; }.bump text { font: 11px system-ui; fill: currentColor; }.bump g { transition: opacity .15s ease-out; }
.legend { display: flex; gap: 6px; flex-wrap: wrap; }.legend button { display: flex; align-items: center; gap: 5px; background: transparent; color: inherit; border: 0; border-radius: 4px; padding: 5px; cursor: pointer; font-size: 12px; }
.legend button[aria-pressed='true'] { outline: 1px solid currentColor; }.legend i { width: 9px; height: 9px; border-radius: 50%; }.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
