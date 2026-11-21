<script setup lang="ts">
import { motion, useMotionValue, useSpring, type MotionValue } from 'motion-v'
import { onBeforeUnmount, onMounted, watchEffect } from 'vue'
import { glideSpring } from '../core/motion'

/**
 * One slot of the liquid rail. It owns the spring that carries its tab to the
 * slot the parent asks for and registers that spring with the parent, so the
 * liquid surface can ride the same value and the drag can snap it on release.
 */
const props = defineProps<{
  tabId: string
  targetLeft: number
  dragging: boolean
  dragLeft: MotionValue<number>
  reduce: boolean
  zIndex: number
  disabled?: boolean
  registerPosition: (id: string, position: MotionValue<number> | null) => void
  onDown: (event: PointerEvent) => void
  onMove: (event: PointerEvent) => void
  onUp: (event: PointerEvent) => void
  onCancel: (event: PointerEvent) => void
  onLostCapture: (event: PointerEvent) => void
}>()

const target = useMotionValue(props.targetLeft)
const position = useSpring(target, glideSpring)
const transform = useMotionValue(`translate3d(${props.targetLeft}px, 0, 0)`)

// The spring follows its target; a reduced-motion tab jumps instead, with no
// movement between the two slots.
watchEffect(() => {
  target.set(props.targetLeft)
  if (props.reduce) position.jump(props.targetLeft)
})

// A dragged tab follows the finger directly; every other one follows its
// spring.
watchEffect(cleanup => {
  const source = props.dragging ? props.dragLeft : props.reduce ? target : position
  const write = (left: number) => transform.set(`translate3d(${left}px, 0, 0)`)
  write(source.get())
  cleanup(source.on('change', write))
})

// Registered at mount, not inside an effect: the parent bumps a version ref from
// the registration, and doing that from an effect would re-run the parent's own
// surface effect on every pass.
onMounted(() => props.registerPosition(props.tabId, position))
onBeforeUnmount(() => props.registerPosition(props.tabId, null))
</script>

<template>
  <motion.div
    class="morph-tab"
    :data-dragging="dragging || undefined"
    :data-disabled="disabled || undefined"
    :style="{ transform, zIndex }"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onCancel"
    @lostpointercapture="onLostCapture"
  >
    <slot />
  </motion.div>
</template>

<style scoped>
.morph-tab {
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  align-items: stretch;
  touch-action: pan-y;
  user-select: none;
  -webkit-touch-callout: none;
  cursor: grab;
}
.morph-tab[data-dragging] { cursor: grabbing; }
.morph-tab[data-disabled] { cursor: not-allowed; }
</style>
