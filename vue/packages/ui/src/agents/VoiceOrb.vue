<script setup lang="ts">
import { useReducedMotion, type MotionValue } from 'motion-v'
import { onBeforeUnmount, onMounted, shallowRef, watchEffect } from 'vue'
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
let renderer: ReturnType<typeof createOrbRenderer> | undefined
let samples: Uint8Array<ArrayBuffer> | undefined
let energy = 0
function error(failure: Error) { failed.value = true; emit('error', failure) }
function read() {
  let value = typeof props.activity === 'number' ? props.activity : props.activity.get()
  if (props.analyser && props.active && !reduce.value) {
    if (samples?.length !== props.analyser.fftSize) samples = new Uint8Array(new ArrayBuffer(props.analyser.fftSize))
    props.analyser.getByteTimeDomainData(samples)
    value = Math.sqrt(samples.reduce((sum, byte) => sum + ((byte - 128) / 128) ** 2, 0) / samples.length) * 3
  }
  energy += ((Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0) - energy) * .2
  const activity = props.active && !reduce.value ? energy : 0
  if (canvas.value) canvas.value.style.transform = `translateY(${-activity * 2}px) scale(${1 + activity * .04}, ${1 - activity * .018})`
  return { activity, colors: props.colors, speed: Math.max(0, props.speed), animated: props.active && !reduce.value && (props.speed > 0 || !!props.analyser) }
}
watchEffect(onCleanup => {
  const input = props.activity
  void [props.active, props.speed, props.colors, props.analyser, reduce.value]
  if (typeof input !== 'number') onCleanup(input.on('change', () => renderer?.requestDraw()))
  renderer?.requestDraw()
})
onMounted(() => {
  if (!canvas.value) return
  try { renderer = createOrbRenderer(canvas.value, read, error) }
  catch (failure) { error(failure instanceof Error ? failure : new Error(String(failure))) }
})
onBeforeUnmount(() => renderer?.dispose())
</script>
<template>
  <div class="be-orb" role="img" :aria-label="ariaLabel" :aria-hidden="!ariaLabel || undefined" data-slot="voice-orb" :data-render-state="failed ? 'error' : 'ready'">
    <span v-if="failed">{{ labels?.unavailable ?? 'Orb rendering unavailable' }}</span><canvas v-else ref="canvas" />
  </div>
</template>
<style scoped>.be-orb{position:relative;width:16rem;max-width:100%;aspect-ratio:1;flex:none}.be-orb canvas{display:block;width:100%;height:100%}.be-orb span{box-sizing:border-box;display:grid;height:100%;place-items:center;border:1px solid var(--beui-border);border-radius:50%;background:var(--beui-muted);font-size:.75rem;text-align:center}</style>
