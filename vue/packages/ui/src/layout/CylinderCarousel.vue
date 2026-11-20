<script setup lang="ts" generic="Item extends { id: string; label?: string }">
import { useElementSize, useRafFn } from '@vueuse/core'
import { animate, useReducedMotion } from 'motion-v'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'

const { items, itemSize = 200, visibleItems = 5, variant = 'concave', minScale = .55, dragSpeed = 1.5, arc, snap = true, autoRotate = false, autoRotateSpeed = .4, height, defaultIndex = 0, label = 'Carousel' } = defineProps<{
  items: readonly Item[]; itemSize?: number; visibleItems?: number; variant?: 'concave' | 'convex'; minScale?: number; dragSpeed?: number; arc?: number; snap?: boolean; autoRotate?: boolean; autoRotateSpeed?: number; height?: number; defaultIndex?: number; label?: string
}>()
const emit = defineEmits<{ indexChange: [index: number] }>()
const stage = useTemplateRef('stage')
const { width } = useElementSize(stage)
const reduce = useReducedMotion()
const position = shallowRef(defaultIndex)
const interacting = shallowRef(false)
const current = computed(() => items.length ? ((Math.round(position.value) % items.length) + items.length) % items.length : 0)
watch(current, index => emit('indexChange', index))
const edge = Math.PI * 72 / 180
const limit = Math.PI * 95 / 180
const geometry = computed(() => {
  const span = width.value || itemSize * 4
  const slots = Math.max(1, Math.round(visibleItems))
  const edgeOffset = (slots + 1) / 2
  const minimum = Math.max(.01, Math.min(.999, minScale))
  const convex = variant === 'convex'
  const scale = (offset: number) => {
    const delta = (1 - minimum) * Math.min(Math.abs(offset) / edgeOffset, limit / edge)
    return convex ? 1 - delta : minimum + delta
  }
  const sum = Array.from({ length: slots }, (_, index) => scale(index - (slots - 1) / 2)).reduce((first, second) => first + second, 0)
  const size = Math.min(itemSize, span * .65 / sum)
  const distance = Math.max(.2, (minimum - Math.cos(edge)) / (1 - minimum))
  const projection = span * .5 * (Math.cos(edge) + distance) / Math.sin(edge)
  return { span, edgeOffset, scale, convex, size, distance, projection, gap: span / (slots + 1), arc: arc ?? size * .35 }
})
function style(index: number) {
  const measure = geometry.value
  const difference = index - position.value
  const offset = difference - Math.round(difference / items.length) * items.length
  const angle = Math.max(-limit, Math.min(limit, offset * edge / measure.edgeOffset))
  const x = measure.convex ? offset * measure.gap : measure.projection * Math.sin(angle) / (Math.cos(angle) + measure.distance)
  const y = measure.arc * (.5 - (x / (measure.span * .5)) ** 2) * (measure.convex ? -1 : 1)
  return { width: `${measure.size}px`, height: `${measure.size}px`, visibility: Math.abs(x) > measure.span / 2 + measure.size ? 'hidden' as const : 'visible' as const,
    transform: `translate(-50%,-50%) translate(${x}px, ${y}px) scale(${measure.scale(offset)})` }
}
let animation: ReturnType<typeof animate> | undefined
let wheelTimer: ReturnType<typeof setTimeout> | undefined
let gesture: { x: number; time: number; velocity: number } | undefined
function settle(target: number, velocity = 0) {
  animation?.stop()
  if (reduce.value) { position.value = target; return }
  animation = animate(position.value, target, { type: 'spring', stiffness: 40, damping: 20, mass: 3, velocity, onUpdate: value => position.value = value })
}
function begin(event: PointerEvent) {
  if (event.button !== 0) return
  animation?.stop()
  interacting.value = true
  gesture = { x: event.clientX, time: performance.now(), velocity: 0 }
  stage.value?.setPointerCapture(event.pointerId)
}
function move(event: PointerEvent) {
  if (!gesture) return
  const delta = (gesture.x - event.clientX) * dragSpeed / geometry.value.gap
  const now = performance.now()
  position.value += delta
  gesture.velocity = delta * 1000 / Math.max(1, now - gesture.time)
  gesture.time = now
  gesture.x = event.clientX
}
function release(event: PointerEvent) {
  if (!gesture) return
  const velocity = event.type === 'pointerup' && performance.now() - gesture.time < 100 ? gesture.velocity : 0
  const target = position.value + Math.max(-6,Math.min(6,velocity*.45))
  gesture = undefined
  settle(snap ? Math.round(target) : target, velocity)
}
function wheel(event: WheelEvent) {
  if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && !event.shiftKey) return
  event.preventDefault()
  animation?.stop()
  interacting.value = true
  position.value += (event.deltaX || event.deltaY) / geometry.value.gap
  clearTimeout(wheelTimer)
  if (snap) wheelTimer = setTimeout(() => settle(Math.round(position.value)),120)
}
function key(delta: number) { interacting.value = true; settle(Math.round(position.value)+delta) }
useRafFn(({ delta }) => { if (autoRotate && !reduce.value && !interacting.value && items.length) position.value += autoRotateSpeed * Math.min(40,delta) / 1000 })
onBeforeUnmount(() => { clearTimeout(wheelTimer); animation?.stop() })
</script>
<template>
  <div ref="stage" role="region" aria-roledescription="carousel" :aria-label="label" tabindex="0" class="carousel" :style="{height:`${height ?? itemSize}px`}"
    @keydown.left.prevent="key(-1)" @keydown.right.prevent="key(1)" @pointerdown="begin" @pointermove="move" @pointerup="release" @pointercancel="release" @wheel="wheel">
    <div v-for="(item,index) in items" :key="item.id" class="ball" :style="style(index)"><slot :item="item" :index="index" :active="current===index">{{ item.label }}</slot></div>
  </div>
</template>
<style scoped>.carousel { position:relative; overflow:hidden; width:100%; touch-action:pan-y; user-select:none; cursor:grab; } .carousel:active { cursor:grabbing; } .ball { position:absolute; top:50%; left:50%; }</style>
