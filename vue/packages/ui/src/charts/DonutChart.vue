<script setup lang="ts">
import { computed, shallowRef, watchEffect } from 'vue'

interface Segment { id: string; name: string; color: string; value: number }
const props = withDefaults(defineProps<{
  segments: readonly Segment[]; thickness?: number; gap?: number; activeId?: string | null; defaultActiveId?: string | null
  selectedId?: string | null; label?: string; labels?: { label?: string; total?: string }; formatValue?: (value: number) => string
}>(), { thickness: 22, gap: 3, formatValue: (value: number) => value.toLocaleString('en-US') })
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeChange: [id: string | null]; select: [id: string] }>()
const internal = shallowRef(props.defaultActiveId ?? null)
const segments = computed(() => props.segments.filter(segment => Number.isFinite(segment.value) && segment.value > 0))
const total = computed(() => segments.value.reduce((sum, segment) => sum + segment.value, 0))
const stroke = computed(() => Math.min(90, Math.max(1, props.thickness)))
const radius = computed(() => 92 - stroke.value / 2)
const arcs = computed(() => {
  let end = 0
  return segments.value.map(segment => {
    const share = segment.value / total.value
    const length = share * 100
    const inset = Math.min(length - .001, (Math.max(0, props.gap) / 360 + stroke.value / (2 * Math.PI * radius.value)) * 100)
    const arc = { ...segment, share, dash: length - inset, start: end + inset / 2 }
    end += length
    return arc
  })
})
const active = computed(() => arcs.value.find(segment => segment.id === (props.activeId === undefined ? internal.value : props.activeId)))
watchEffect(() => { if (internal.value && !segments.value.some(segment => segment.id === internal.value)) internal.value = null })
function inspect(id: string | null) {
  if (props.activeId === undefined) internal.value = id
  emit('update:activeId', id); emit('activeChange', id)
}
function step(event: KeyboardEvent, index: number) {
  const offset = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
  if (!offset) return
  event.preventDefault()
  const buttons = (event.currentTarget as HTMLElement).closest('ul')?.querySelectorAll('button')
  buttons?.[(index + offset + buttons.length) % buttons.length]?.focus()
}
</script>

<template>
  <section class="donut-chart" data-slot="donut-chart" :aria-label="label ?? labels?.label ?? 'Donut chart'">
    <div class="ring">
      <svg viewBox="0 0 200 200" aria-hidden="true" @pointerleave="inspect(null)">
        <circle cx="100" cy="100" :r="radius" :stroke-width="stroke" fill="none" stroke="currentColor" opacity=".08" />
        <circle v-for="segment in arcs" :key="segment.id" cx="100" cy="100" :r="radius" fill="none" pathLength="100" transform="rotate(-90 100 100)"
          :stroke="segment.color" :stroke-width="stroke + (active?.id === segment.id ? 3 : 0)" :stroke-dasharray="arcs.length === 1 ? undefined : `${segment.dash} ${100 - segment.dash}`" :stroke-dashoffset="-segment.start"
          stroke-linecap="round" :opacity="active && active.id !== segment.id ? .32 : 1" @pointerenter="$event.pointerType !== 'touch' && inspect(segment.id)" @click="emit('select', segment.id)" />
      </svg>
      <div class="center"><slot name="center" :segment="active" :total="total"><strong>{{ formatValue(active?.value ?? total) }}</strong><small>{{ active?.name ?? labels?.total ?? 'Total' }}</small></slot></div>
    </div>
    <ul class="segments"><li v-for="(segment, index) in arcs" :key="segment.id"><button type="button" :aria-pressed="selectedId === undefined ? undefined : selectedId === segment.id" @keydown="step($event, index)"
      @focus="inspect(segment.id)" @blur="inspect(null)" @pointerenter="$event.pointerType !== 'touch' && inspect(segment.id)" @pointerleave="inspect(null)" @click="emit('select', segment.id)">
      <span class="row"><i :style="{ backgroundColor: segment.color }" />{{ segment.name }}<b>{{ (segment.share * 100).toFixed(1) }}%</b><small>{{ formatValue(segment.value) }}</small></span>
      <span class="share" aria-hidden="true"><span :style="{ width: `${segment.share * 100}%`, background: segment.color }" /></span>
    </button></li></ul>
  </section>
</template>

<style scoped>
.donut-chart { display: grid; gap: 24px; align-items: center; }
.ring { position: relative; width: min(100%, 240px); justify-self: center; }
@media(min-width:640px) { .donut-chart { grid-template-columns: minmax(0, 15rem) minmax(0, 1fr); } }
.ring svg { display: block; width: 100%; }
.ring circle { transition: opacity 150ms ease-out; }
.center { position: absolute; inset: 0; display: grid; align-content: center; text-align: center; pointer-events: none; }
.center small, .segments small { opacity: .7; font-size: 12px; }
.center strong { font: 600 24px/1.3 system-ui; }
.segments { display: grid; gap: 2px; padding: 0; margin: 0; list-style: none; }
.segments li { margin: 0; }
.segments button { display: block; padding: 8px 12px; width: 100%; border: 0; border-radius: 12px; background: transparent; color: inherit; font: inherit; font-size: 14px; cursor: pointer; }
.row { display: flex; align-items: center; gap: 8px; }.share { display: block; margin: 8px 0 0 22px; background: var(--beui-muted); border-radius: 4px; height: 4px; }.share span { height: 100%; display: block; border-radius: inherit; }
.segments button:hover, .segments button:focus-visible, .segments button[aria-pressed='true'] { background: #8882; }
.segments i { border-radius: 50%; width: 8px; height: 8px; }
.segments b { margin-inline-start: auto; padding-inline-start: 8px; }
</style>
