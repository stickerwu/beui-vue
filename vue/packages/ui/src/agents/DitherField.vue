<script setup lang="ts">
import { motion } from 'motion-v'
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { easeOut } from '../core/motion'

const props = defineProps<{ interactive: boolean, reduce: boolean, opacity: number }>()
const canvas = shallowRef<HTMLCanvasElement | null>(null)
const canHover = shallowRef(false)
const DOT_GAP = 10
const TWO_PI = Math.PI * 2
let query: MediaQueryList | undefined
let stop: (() => void) | undefined
const update = () => { canHover.value = Boolean(query?.matches) }

function start() {
  const node = canvas.value
  const context = node?.getContext('2d')
  if (!node || !context) return () => {}
  let frame = 0
  let width = 0
  let height = 0
  let dotColor = 'currentColor'
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, inside: false }
  const pointerEnabled = props.interactive && canHover.value && !props.reduce
  const reduce = props.reduce

  const resize = () => {
    const rect = node.getBoundingClientRect()
    width = rect.width || node.clientWidth || 208
    height = rect.height || node.clientHeight || 208
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    node.width = Math.round(width * dpr)
    node.height = Math.round(height * dpr)
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    dotColor = window.getComputedStyle(node).color
    pointer.x = width / 2
    pointer.y = height / 2
    pointer.targetX = pointer.x
    pointer.targetY = pointer.y
    // Sizing the canvas clears it, and reduced motion has no frame loop to repaint.
    if (reduce) draw(0)
  }
  const draw = (time: number) => {
    context.clearRect(0, 0, width, height)
    if (!pointer.inside) {
      pointer.targetX = width / 2 + (reduce ? 0 : Math.sin(time / 1700) * width * 0.12)
      pointer.targetY = height / 2 + (reduce ? 0 : Math.cos(time / 2100) * height * 0.1)
    }
    const follow = reduce ? 1 : pointer.inside ? 0.16 : 0.045
    pointer.x += (pointer.targetX - pointer.x) * follow
    pointer.y += (pointer.targetY - pointer.y) * follow
    const radius = Math.min(width, height) * 0.38
    const columns = Math.ceil(width / DOT_GAP) + 1
    const rows = Math.ceil(height / DOT_GAP) + 1
    const offsetX = (width - (columns - 1) * DOT_GAP) / 2
    const offsetY = (height - (rows - 1) * DOT_GAP) / 2
    context.fillStyle = dotColor
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const anchorX = offsetX + column * DOT_GAP
        const anchorY = offsetY + row * DOT_GAP
        const deltaX = anchorX - pointer.x
        const deltaY = anchorY - pointer.y
        const distance = Math.hypot(deltaX, deltaY)
        const proximity = Math.max(0, 1 - distance / radius)
        const influence = proximity * proximity * (3 - 2 * proximity)
        const displacement = influence * influence * 9
        const directionX = distance > 0 ? deltaX / distance : 0
        const directionY = distance > 0 ? deltaY / distance : 0
        context.globalAlpha = 0.17 + influence * 0.72
        context.beginPath()
        context.arc(anchorX + directionX * displacement, anchorY + directionY * displacement, 0.65 + influence * 0.85, 0, TWO_PI)
        context.fill()
      }
    }
    context.globalAlpha = 1
    if (!reduce) frame = window.requestAnimationFrame(draw)
  }
  const move = (event: PointerEvent) => {
    if (!pointerEnabled) return
    const rect = node.getBoundingClientRect()
    pointer.inside = true
    pointer.targetX = event.clientX - rect.left
    pointer.targetY = event.clientY - rect.top
  }
  const leave = () => { pointer.inside = false }
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
  resize()
  observer?.observe(node)
  node.addEventListener('pointermove', move, { passive: true })
  node.addEventListener('pointerleave', leave)
  draw(0)
  return () => {
    if (frame) window.cancelAnimationFrame(frame)
    observer?.disconnect()
    node.removeEventListener('pointermove', move)
    node.removeEventListener('pointerleave', leave)
  }
}

onMounted(() => {
  query = window.matchMedia?.('(hover: hover) and (pointer: fine)')
  update()
  query?.addEventListener?.('change', update)
  watch([() => props.interactive, () => props.reduce, canHover], () => { stop?.(); stop = start() }, { immediate: true })
})
onBeforeUnmount(() => { stop?.(); stop = undefined; query?.removeEventListener?.('change', update) })
</script>

<template>
  <motion.div aria-hidden="true" class="df" :initial="false" :animate="{ opacity }" :transition="{ duration: reduce ? 0 : 0.4, ease: easeOut }">
    <canvas ref="canvas" class="df-canvas" />
  </motion.div>
</template>

<style scoped>
.df { position: absolute; inset: 0; overflow: hidden; background: var(--beui-muted); }
.df-canvas { position: absolute; inset: 0; width: 100%; height: 100%; color: var(--beui-foreground); }
</style>
