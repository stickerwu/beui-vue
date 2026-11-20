<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import ChartInspector from './ChartInspector.vue'

interface Target { key: string; price: number; analysts: number; color?: string }
type Active = { type: 'history'; date: string } | { type: 'target'; key: string }
const props = defineProps<{
  current: number; targets: readonly [Target, Target, Target]; history?: readonly { date: string; price: number }[]; label?: string
  dates?: { start?: string; mid?: string; horizon?: string }; active?: Active | null; defaultActive?: Active | null; labels?: Partial<Record<string, string>>
}>()
const emit = defineEmits<{ 'update:active': [value: Active | null]; activeChange: [value: Active | null] }>()
const local = shallowRef(props.defaultActive ?? null)
const selection = computed(() => props.active === undefined ? local.value : props.active)
const history = computed(() => (props.history ?? []).filter(point => Number.isFinite(point.price) && Number.isFinite(Date.parse(point.date))))
const format = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const change = (price: number) => props.current ? `${price >= props.current ? '+' : ''}${((price / props.current - 1) * 100).toFixed(1)}%` : '—'
const axis = computed(() => {
  const values = [props.current, ...props.targets.map(target => target.price), ...history.value.map(point => point.price)]
  const min = Math.min(...values), max = Math.max(...values), pad = Math.max((max - min) * .1, 1)
  return { min: min - pad, max: max + pad }
})
const yAt = (price: number) => 16 + (axis.value.max - price) / (axis.value.max - axis.value.min) * 176
const currentX = 282, endX = 430
const xAt = (index: number) => 28 + index / Math.max(1, history.value.length) * (currentX - 28)
const historical = computed(() => history.value.map((point, index) => `${index ? 'L' : 'M'}${xAt(index)},${yAt(point.price)}`).join(' ') + (history.value.length ? ` L${currentX},${yAt(props.current)}` : ''))
const projections = computed(() => props.targets.map((target, index) => ({ ...target, color: target.color ?? ['#059669', '#3b82f6', '#d97706'][index],
  path: `M${currentX},${yAt(props.current)} Q${currentX + 68},${yAt(props.current) * .8 + yAt(target.price) * .2} ${endX},${yAt(target.price)}` })))
const activeTarget = computed(() => { const current = selection.value; return current?.type === 'target' ? projections.value.find(target => target.key === current.key) : undefined })
const activeHistory = computed(() => { const current = selection.value; return current?.type === 'history' ? history.value.find(point => point.date === current.date) : undefined })
const cursor = computed(() => activeHistory.value ? history.value.indexOf(activeHistory.value) : -1)
const primary = computed(() => activeTarget.value ?? projections.value[1])
function inspect(next: Active | null) {
  if (props.active === undefined) local.value = next
  emit('update:active', next); emit('activeChange', next)
}
</script>

<template>
  <section class="fan" data-slot="price-target-fan" :aria-label="label ?? labels?.label ?? 'Price target fan'">
    <header><small>{{ primary.key }} target</small><strong>{{ format(primary.price) }}</strong><b :style="{ color: primary.color }">{{ change(primary.price) }}</b></header>
    <div class="plot"><svg viewBox="0 0 520 224" aria-hidden="true">
      <g v-for="fraction in [0, .33, .67, 1]" :key="fraction"><line x1="28" x2="430" :y1="16 + fraction * 176" :y2="16 + fraction * 176" stroke="currentColor" opacity=".13" stroke-dasharray="3 4" /></g>
      <path :d="historical" fill="none" stroke="currentColor" stroke-width="2" /><circle :cx="currentX" :cy="yAt(current)" r="4" fill="currentColor" />
      <g v-for="target in projections" :key="target.key" :opacity="activeTarget && activeTarget.key !== target.key ? .3 : 1" @pointerenter="$event.pointerType !== 'touch' && inspect({ type: 'target', key: target.key })" @click="inspect({ type: 'target', key: target.key })">
        <path :d="target.path" fill="none" stroke="transparent" stroke-width="16" /><path :d="target.path" fill="none" :stroke="target.color" stroke-width="2" stroke-dasharray="5 3" /><circle :cx="endX" :cy="yAt(target.price)" r="4" :fill="target.color" /><text :x="endX + 7" :y="yAt(target.price) + 4">{{ target.key }}</text>
      </g>
      <circle v-if="activeHistory" :cx="xAt(cursor)" :cy="yAt(activeHistory.price)" r="4" fill="currentColor" />
      <text x="28" y="216">{{ dates?.start ?? history[0]?.date }}</text><text :x="currentX" y="216" text-anchor="middle">{{ dates?.mid ?? 'Now' }}</text><text :x="endX" y="216" text-anchor="middle">{{ dates?.horizon ?? 'Horizon' }}</text>
    </svg><div class="history"><ChartInspector label="Inspect price history" :values="history.map(point => `${point.date}: ${format(point.price)}`)" :index="cursor" @inspect="inspect({ type: 'history', date: history[$event].date })" @close="inspect(null)" /></div></div>
    <div class="targets"><button v-for="target in projections" :key="target.key" type="button" @focus="inspect({ type: 'target', key: target.key })" @blur="inspect(null)" @click="inspect({ type: 'target', key: target.key })" @keydown.esc="inspect(null)"><i :style="{ background: target.color }" />{{ target.key }}</button></div>
    <div v-if="activeTarget || activeHistory" role="tooltip"><template v-if="activeTarget">{{ activeTarget.key }} · {{ format(activeTarget.price) }} · {{ activeTarget.analysts }} analysts · {{ change(activeTarget.price) }}</template><template v-else-if="activeHistory">{{ activeHistory.date }} · {{ format(activeHistory.price) }}</template></div>
  </section>
</template>

<style scoped>
.fan { width: 100%; }.fan header { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }.fan small,.fan b,.fan [role='tooltip'] { font-size: 12px; }.fan strong { font-size: 24px; }.plot { position: relative; }.plot svg { width: 100%; display: block; }.plot text { fill: currentColor; font: 11px system-ui; }
.history { position: absolute; left: 5.38%; width: 48.85%; top: 7.14%; height: 78.57%; }.history:focus-within { outline: 1px solid currentColor; }.targets { display: flex; gap: 8px; }.targets button { display: flex; align-items: center; gap: 5px; background: transparent; color: inherit; border: 0; padding: 6px; cursor: pointer; font-size: 12px; }.targets i { width: 8px; height: 8px; border-radius: 50%; }
</style>
