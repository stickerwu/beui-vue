<script setup lang="ts">
import { animate, type $Transition } from 'motion-v'
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  x: number
  y: number
  rotate: number
  z: number
  width: number
  height: number
  transition: $Transition
}>()

const frame = useTemplateRef<HTMLElement>('frame')
let running: ReturnType<typeof animate> | undefined

// Imperative so each new move stops the last one first: a declarative arc
// path keeps running when its target changes, and a long flight finishing
// after a quick hop would write its stale end point back.
function move() {
  const element = frame.value
  if (!element) return
  running?.stop()
  running = animate(element, { x: props.x, y: props.y, rotate: props.rotate }, props.transition)
}

watch(() => [props.x, props.y, props.rotate], move, { flush: 'post' })
onMounted(move)
onBeforeUnmount(() => running?.stop())
</script>

<template>
  <div ref="frame" class="be-card-frame" :style="{ width: `${width}px`, height: `${height}px`, zIndex: z }">
    <slot />
  </div>
</template>

<style scoped>
.be-card-frame { position: absolute; top: 0; left: 0; }
</style>
