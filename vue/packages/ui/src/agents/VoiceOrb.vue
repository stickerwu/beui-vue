<script setup lang="ts">
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { onBeforeUnmount, onMounted, shallowRef, watchEffect } from 'vue'
import { glideSpring } from '../core/motion'
import { createOrbRenderer } from './orb-renderer'
import type { Labels } from './shared'

const props = withDefaults(defineProps<{
  activity?: number | MotionValue<number>, analyser?: AnalyserNode | null, colors?: readonly [string, string, string],
  active?: boolean, speed?: number, ariaLabel?: string, labels?: Labels
}>(), { activity: 0, colors: () => ['#e8754d', '#ffe0ac', '#346b52'] as const, active: true, speed: 1 })
const emit = defineEmits<{ error: [error: Error] }>()
const reduce = useReducedMotion()
const canvas = shallowRef<HTMLCanvasElement | null>(null)
const failed = shallowRef(false)
const level = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0
// The renderer reads a spring-smoothed level, so a jump in activity swells and settles instead of snapping.
const target = useMotionValue(0)
const smooth = useSpring(target, glideSpring)
const transform = useTransform(smooth, value => `translate3d(0, ${-value * 2}px, 0) scale(${1 + value * 0.04}, ${1 - value * 0.018})`)
let renderer: ReturnType<typeof createOrbRenderer> | undefined
let samples: Uint8Array<ArrayBuffer> | undefined
let source: AnalyserNode | null = null

function error(failure: Error) { failed.value = true; emit('error', failure) }
function read() {
  if (props.analyser && props.active && !reduce.value) {
    if (source !== props.analyser || samples?.length !== props.analyser.fftSize) { source = props.analyser; samples = new Uint8Array(new ArrayBuffer(props.analyser.fftSize)) }
    props.analyser.getByteTimeDomainData(samples!)
    let sum = 0
    for (const byte of samples!) sum += ((byte - 128) / 128) ** 2
    target.set(level(Math.sqrt(sum / samples!.length) * 3))
  }
  return {
    activity: props.active && !reduce.value ? level(smooth.get()) : 0,
    colors: props.colors,
    speed: Number.isFinite(props.speed) ? Math.max(0, props.speed) : 1,
    animated: props.active && !reduce.value && (props.speed > 0 || !!props.analyser),
  }
}
watchEffect(onCleanup => {
  const input = props.activity
  const live = props.active && !reduce.value
  void [props.speed, props.colors, props.analyser]
  if (reduce.value) { smooth.jump(0); target.set(0) } else target.set(live ? level(typeof input === 'number' ? input : input.get()) : 0)
  if (typeof input !== 'number') onCleanup(input.on('change', value => { if (props.active && !reduce.value) target.set(level(value)); renderer?.requestDraw() }))
  renderer?.requestDraw()
}, { flush: 'post' })
let stopSmooth: (() => void) | undefined
onMounted(() => {
  stopSmooth = smooth.on('change', () => renderer?.requestDraw())
  if (!canvas.value) return
  try { renderer = createOrbRenderer(canvas.value, read, error) }
  catch (failure) { error(failure instanceof Error ? failure : new Error(String(failure))) }
})
onBeforeUnmount(() => { stopSmooth?.(); renderer?.dispose(); renderer = undefined })
</script>

<template>
  <div class="be-orb" role="img" :aria-label="ariaLabel" :aria-hidden="!ariaLabel || undefined" data-slot="voice-orb" :data-render-state="failed ? 'error' : 'ready'">
    <div v-if="failed" class="be-orb-fallback">{{ labels?.unavailable ?? 'Orb rendering unavailable' }}</div>
    <motion.div v-else class="be-orb-fill" :style="{ transform: reduce ? 'none' : transform }"><canvas ref="canvas" class="be-orb-canvas" /></motion.div>
  </div>
</template>

<style scoped>
.be-orb { position: relative; width: 16rem; max-width: 100%; aspect-ratio: 1; flex: none; }
.be-orb-fill { width: 100%; height: 100%; }
.be-orb-canvas { display: block; width: 100%; height: 100%; }
.be-orb-fallback { box-sizing: border-box; display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; border: 1px solid var(--beui-border); border-radius: 9999px; background: var(--beui-card); padding: 2rem; text-align: center; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
</style>
