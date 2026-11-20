<script setup lang="ts">
import { animate, useReducedMotion } from 'motion-v'
import { useElementSize } from '@vueuse/core'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'

interface Moment { id: string; title: string; date: string | Date; meta?: string }
const { events, itemWidth = 340, height = 600, years = true, ruler = true, cables = true, label = 'Timeline', formatDate, formatYear } = defineProps<{
  events: readonly Moment[]; itemWidth?: number; height?: number; years?: boolean; ruler?: boolean; cables?: boolean; label?: string; formatDate?: (date: Date) => string; formatYear?: (date: Date) => string
}>()
const model = defineModel<string>()
const stage = useTemplateRef('stage')
const { width } = useElementSize(stage)
const cardWidth = computed(() => Math.min(itemWidth, (width.value || 640) * .68))
const gap = computed(() => Math.max(40, Math.min(72, cardWidth.value * .22)))
const step = computed(() => cardWidth.value * .72 + gap.value)
const activeIndex = computed(() => Math.max(0, events.findIndex(item => item.id === model.value)))
const position = shallowRef(activeIndex.value)
const reduce = useReducedMotion()
const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })
let animation: ReturnType<typeof animate> | undefined
let gesture: { x: number; start: number; last: number; time: number; velocity: number; moved: boolean } | undefined
let suppress = false
function year(date: Date) { return formatYear?.(date) ?? `’${String(date.getUTCFullYear()).slice(-2)}` }
function caption(value: Moment['date']) {
  const date = new Date(value)
  return formatDate?.(date) ?? `${month.format(date)} ${date.getUTCDate()} ${year(date)}`
}
function horizontal(index: number) {
  const offset = index - position.value
  const distance = Math.abs(offset)
  const near = cardWidth.value * .86 + gap.value
  return Math.sign(offset) * (distance <= 1 ? distance * near : near + (distance - 1) * step.value)
}
function settle(target: number, velocity = 0) {
  animation?.stop()
  if (reduce.value) { position.value = target; return }
  animation = animate(position.value, target, { type: 'spring', stiffness: 120, damping: 24, velocity, onUpdate: value => position.value = value })
}
watch(activeIndex, index => settle(index))
function go(index: number, velocity = 0) {
  const target = Math.max(0, Math.min(events.length - 1, Math.round(index)))
  if (events[target]) model.value = events[target].id
  settle(target, velocity)
}
function start(event: PointerEvent) {
  if (event.button !== 0) return
  suppress = false
  gesture = { x: event.clientX, last: event.clientX, start: position.value, time: performance.now(), velocity: 0, moved: false }
}
function move(event: PointerEvent) {
  if (!gesture) return
  const delta = gesture.x - event.clientX
  if (!gesture.moved && Math.abs(delta) < 4) return
  gesture.moved = true
  stage.value?.setPointerCapture(event.pointerId)
  animation?.stop()
  const now = performance.now()
  gesture.velocity = (gesture.last - event.clientX) / step.value * 1000 / Math.max(1, now - gesture.time)
  gesture.last = event.clientX
  gesture.time = now
  let next = gesture.start + delta / step.value
  if (next < 0) next *= .3
  if (next > events.length - 1) next = events.length - 1 + (next - events.length + 1) * .3
  position.value = next
}
function end(event: PointerEvent) {
  if (!gesture) return
  suppress = gesture.moved
  const velocity = event.type === 'pointerup' && performance.now() - gesture.time < 100 ? gesture.velocity : 0
  if (gesture.moved) go(position.value + Math.min(4, Math.max(-4, velocity * .3)), velocity)
  gesture = undefined
}
onBeforeUnmount(() => animation?.stop())
</script>
<template>
  <div ref="stage" role="region" tabindex="0" class="timeline" :aria-label="label" :style="{ height: `${height}px` }"
    @pointerdown="start" @pointermove="move" @pointerup="end" @pointercancel="end" @pointerleave="event => { if (!gesture?.moved) end(event) }"
    @keydown.left.prevent="go(activeIndex-1)" @keydown.right.prevent="go(activeIndex+1)" @keydown.home.prevent="go(0)" @keydown.end.prevent="go(events.length-1)">
    <template v-for="(item,index) in events" :key="item.id">
      <span v-if="years && (index === 0 || new Date(events[index-1]!.date).getUTCFullYear() !== new Date(item.date).getUTCFullYear())" class="year" :style="{ transform: `translateX(${horizontal(index)*.5}px)` }" aria-hidden="true">{{ year(new Date(item.date)) }}</span>
      <span v-if="ruler && index < events.length-1" class="ticks" :style="{ transform: `translateX(${(horizontal(index)+horizontal(index+1))/2}px)` }" aria-hidden="true">╵╷│╷╵</span>
      <svg v-if="cables && Math.abs(index-position)<2" class="cables" aria-hidden="true"><line x1="50%" y1="0" :x2="(width || 640)/2+horizontal(index)" y2="50%"/><line x1="50%" y1="100%" :x2="(width || 640)/2+horizontal(index)" y2="50%"/></svg>
      <button type="button" :tabindex="-1" class="card" :aria-pressed="index===activeIndex" :aria-label="`${item.title}, ${caption(item.date)}`" :style="{ width:`${cardWidth}px`, transform:`translate(-50%, -50%) translateX(${horizontal(index)}px) scale(${1-.28*Math.min(1,Math.abs(index-position))})`, '--dim': Math.min(1,Math.abs(index-position))*.45 }" @click="!suppress && go(index)">
        <time>{{ caption(item.date) }}</time><strong>{{ item.title }}</strong>
        <div v-if="$slots.media" class="media"><slot name="media" :event="item" :index="index" /></div>
        <small v-if="item.meta || $slots.meta"><slot name="meta" :event="item">{{ item.meta }}</slot></small>
      </button>
    </template>
    <span class="sr" aria-live="polite">{{ events[activeIndex]?.title }}</span>
  </div>
</template>
<style scoped>
.timeline { position: relative; overflow: hidden; width: 100%; touch-action: pan-y; user-select: none; } .year,.ticks,.card { position: absolute; left: 50%; }
.year { top: 3%; font: 600 clamp(2.8rem,8vw,5.5rem)/1 system-ui; letter-spacing: -.08em; color: var(--beui-muted-foreground); opacity: .23; } .ticks { top: 48%; color: var(--beui-muted-foreground); opacity: .6; font-size: .85rem; letter-spacing: .12em; } .cables { position: absolute; inset: 0; height: 100%; width: 100%; pointer-events: none; stroke: var(--beui-border); }
.card { top: 50%; box-sizing: border-box; display: grid; gap: .5rem; z-index: 1; padding: .9rem; overflow: hidden; text-align: left; cursor: grab; color: var(--beui-foreground); background: var(--beui-card); border: 1px solid var(--beui-border); border-radius: 1.2rem; box-shadow: 0 5px 18px #0001; } .card::after { content:''; position: absolute; inset: 0; background: var(--beui-background); opacity: var(--dim); } time,small { font: 500 .7rem/1.4 system-ui; color: var(--beui-muted-foreground); } strong { font-size: 1.05rem; line-height: 1.25; } .media { overflow: hidden; border-radius: .65rem; } .sr { position: absolute; width: 1px; height: 1px; clip-path: inset(50%); }
</style>
