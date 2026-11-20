<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { buildVolumeProfile, type VolumeProfileBin } from './models/volume-profile'

const props = withDefaults(defineProps<{
  data: readonly VolumeProfileBin[]; label?: string; unit?: string; formatPrice?: (price: number) => string; formatVolume?: (size: number) => string
  valueArea?: number | false; color?: string; pocColor?: string; activeId?: string | null; defaultActiveId?: string | null; labels?: Partial<Record<string, string>>
}>(), { valueArea: .7, color: '#6366f1', pocColor: '#f59e0b', formatPrice: (price: number) => price.toLocaleString('en-US'), formatVolume: (size: number) => size.toLocaleString('en-US') })
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeChange: [id: string | null] }>()
const model = computed(() => buildVolumeProfile(props.data, props.valueArea))
const rows = computed(() => [...model.value.rows].reverse())
const local = shallowRef(props.defaultActiveId ?? null)
const show = shallowRef(false)
const index = computed(() => rows.value.findIndex(row => row.id === (props.activeId === undefined ? local.value : props.activeId)))
const active = computed(() => show.value ? rows.value[index.value] : undefined)
const title = computed(() => props.label ?? props.labels?.label ?? 'Volume profile')
function inspect(position: number) {
  const row = rows.value[position]
  if (!row) return
  if (position !== index.value) { if (props.activeId === undefined) local.value = row.id; emit('update:activeId', row.id); emit('activeChange', row.id) }
  show.value = true
}
function pointer(event: PointerEvent) {
  if (event.pointerType === 'touch' && !event.buttons) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = (event.clientY - rect.top) / rect.height
  const position = rows.value.findIndex(row => ratio >= row.top && ratio <= row.top + row.height)
  if (position < 0) show.value = false
  else inspect(position)
}
</script>

<template>
  <section class="profile" data-slot="volume-profile" :aria-label="title">
    <p v-if="!rows.length">{{ labels?.empty ?? 'No volume data' }}</p>
    <div v-else class="histogram"><div v-for="row in rows" :key="row.id" aria-hidden="true" class="bar" :style="{ top: `${row.top * 100}%`, height: `${row.height * 100}%`, width: `${row.proportion * 100}%`, background: row.isPoc ? pocColor : color, opacity: row.inValueArea || row.isPoc ? .9 : .42 }" />
      <input type="range" :aria-label="`${title}: inspect price level`" aria-orientation="vertical" :min="0" :max="rows.length - 1" :value="Math.max(0, index)" :aria-valuetext="`${formatPrice(rows[Math.max(0, index)].price)}: ${formatVolume(rows[Math.max(0, index)].volume)} ${unit ?? 'units'}`"
        @focus="inspect(Math.max(0, index))" @blur="show = false" @input="inspect(($event.currentTarget as HTMLInputElement).valueAsNumber)" @keydown.down.prevent="inspect(Math.min(rows.length - 1, Math.max(0, index) + 1))" @keydown.up.prevent="inspect(Math.max(0, index - 1))" @keydown.esc="show = false"
        @pointermove="pointer" @pointerdown="pointer" @pointerleave="show = false" />
    </div>
    <div v-if="active" role="tooltip">{{ formatPrice(active.priceLow) }}–{{ formatPrice(active.priceHigh) }} · {{ formatVolume(active.volume) }} {{ unit ?? 'units' }} · {{ (active.share * 100).toFixed(1) }}%</div>
    <div class="stats"><span>{{ labels?.total ?? 'Total volume' }} <b>{{ formatVolume(model.totalVolume) }}</b></span><span v-if="model.poc">POC <b>{{ formatPrice(model.poc.price) }}</b></span><span v-if="model.valueArea">{{ labels?.valueArea ?? 'Value area' }} <b>{{ formatPrice(model.valueArea.priceLow) }}–{{ formatPrice(model.valueArea.priceHigh) }}</b></span></div>
  </section>
</template>

<style scoped>
.profile { width: 100%; font-size: 12px; font-variant-numeric: tabular-nums; }.histogram { position: relative; height: 230px; }.histogram:focus-within { outline: 2px solid currentColor; }
.bar { position: absolute; left: 0; box-sizing: border-box; border-block: 1px solid Canvas; border-radius: 3px; }
.histogram input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: crosshair; }
.stats { display: flex; flex-wrap: wrap; gap: 15px; margin-top: 8px; }
</style>
