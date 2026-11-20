<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useReducedMotion } from 'motion-v'
import type { Labels } from './shared'
type Status = 'queued' | 'generating' | 'refining' | 'complete' | 'error'
const props = withDefaults(defineProps<{ status?: Status, label?: string, prompt?: string, resolution?: string, aspectRatio?: number | string, size?: 'compact' | 'fluid', interactive?: boolean, statusText?: string, showStatus?: boolean, onRetry?: () => void, labels?: Labels, mediaClassName?: string, statusClassName?: string }>(), { status: 'generating', aspectRatio: '1 / 1', size: 'compact', interactive: true, showStatus: true })
const descriptions = { queued: 'Waiting to generate', generating: 'Generating image', refining: 'Refining details', complete: 'Image ready', error: 'Generation failed' }
const statusText = computed(() => props.statusText ?? props.labels?.[props.status] ?? descriptions[props.status])
const canvas = shallowRef<HTMLCanvasElement | null>(null)
const reduce = useReducedMotion()
let frame = 0
let point: { x: number, y: number } | undefined
let observer: ResizeObserver | undefined
function draw(time: number) {
  const node = canvas.value
  const context = node?.getContext('2d')
  if (!node || !context) return
  const width = node.clientWidth
  const height = node.clientHeight
  const scale = Math.min(devicePixelRatio, 2)
  if (node.width !== Math.round(width * scale) || node.height !== Math.round(height * scale)) { node.width = Math.round(width * scale); node.height = Math.round(height * scale) }
  context.setTransform(scale, 0, 0, scale, 0, 0)
  context.clearRect(0, 0, width, height)
  context.fillStyle = getComputedStyle(node).color
  const center = point ?? { x: width * (.5 + (reduce.value ? 0 : Math.sin(time / 1700) * .12)), y: height * (.5 + (reduce.value ? 0 : Math.cos(time / 2100) * .1)) }
  for (let row = 5; row < height; row += 10) for (let col = 5; col < width; col += 10) {
    const dx = col - center.x, dy = row - center.y
    const distance = Math.hypot(dx, dy)
    const proximity = Math.max(0, 1 - distance / Math.max(1, Math.min(width, height) * .38))
    const influence = proximity * proximity * (3 - 2 * proximity)
    const displacement = influence * influence * 9 / (distance || 1)
    context.globalAlpha = .17 + influence * .72
    context.beginPath(); context.arc(col + dx * displacement, row + dy * displacement, .65 + influence * .85, 0, Math.PI * 2); context.fill()
  }
}
function pointer(event: PointerEvent) {
  if (!props.interactive || reduce.value || !matchMedia('(hover: hover) and (pointer: fine)').matches) return
  const bounds = canvas.value?.getBoundingClientRect()
  if (bounds) point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
}
onMounted(() => {
  function tick(time: number) {
    if (!reduce.value && !document.hidden && !['error','complete'].includes(props.status)) draw(time)
    frame = requestAnimationFrame(tick)
  }
  observer = new ResizeObserver(() => draw(0))
  if (canvas.value) observer.observe(canvas.value)
  frame = requestAnimationFrame(tick)
})
onBeforeUnmount(() => { cancelAnimationFrame(frame); observer?.disconnect() })
</script>
<template>
  <figure class="be-imagegen" :data-status="status" :data-size="size" :aria-label="label ?? `${statusText}${prompt ? `: ${prompt}` : ''}`">
    <div class="be-image-surface" :style="{ aspectRatio }"><div class="be-image-media" :class="mediaClassName"><slot /></div><canvas ref="canvas" aria-hidden="true" @pointermove="pointer" @pointerleave="point = undefined" /><span v-if="resolution" class="be-agent-chip resolution">{{ resolution }}</span></div>
    <figcaption><span v-if="showStatus" role="status" :class="statusClassName">{{ statusText }}</span><small v-if="prompt">“{{ prompt }}”</small></figcaption>
    <button v-if="status === 'error' && onRetry" type="button" class="be-agent-button" @click="onRetry">{{ labels?.retry ?? 'Try again' }}</button>
  </figure>
</template>
<style scoped>.be-imagegen{width:100%;margin:0}.be-imagegen[data-size=compact]{max-width:13rem}.be-image-surface{position:relative;overflow:hidden;border:1px solid var(--beui-border);border-radius:1rem;background:var(--beui-muted)}.be-image-media,.be-image-surface canvas{position:absolute;inset:0;width:100%;height:100%;transition:opacity .25s,filter .25s}.be-image-media{opacity:0;filter:blur(3px)}.be-image-media :deep(img),.be-image-media :deep(svg){display:block;width:100%;height:100%;object-fit:cover}.be-imagegen[data-status=refining] .be-image-media{opacity:.62;filter:blur(1.5px)}.be-imagegen[data-status=refining] canvas{opacity:.48}.be-imagegen[data-status=complete] .be-image-media{opacity:1;filter:none}.be-imagegen[data-status=error] .be-image-media{opacity:.28}.be-imagegen:is([data-status=complete],[data-status=error]) canvas{opacity:0;pointer-events:none}.resolution{position:absolute;top:.5rem;right:.5rem}.be-imagegen figcaption{margin-top:.75rem;font-size:.875rem}.be-imagegen small{display:block;color:var(--beui-muted-foreground)}</style>
