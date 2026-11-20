<script setup lang="ts" generic="Variant extends ShaderBackgroundVariant">
import { computed, onMounted, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import type { ShaderMount } from '@paper-design/shaders'
import { presets } from './graphics/shader-presets'
import type { ShaderBackgroundProps, ShaderBackgroundVariant } from './graphics/shader-types'

const props = defineProps<ShaderBackgroundProps<Variant>>()
const host = useTemplateRef('host')
const renderer = shallowRef<'pending' | 'webgl' | 'fallback'>('pending')
const reduced = shallowRef(false)
const parameters = computed(() => {
  const values: Record<string, unknown> = { ...props.params }
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined && key !== 'params') values[key] = value
  }
  return values
})
const speed = computed(() => {
  if (reduced.value || props.variant === 'dot-grid' || props.variant === 'waves') return 0
  return props.speed ?? Number(parameters.value.speed ?? presets[props.variant].speed)
})
const frame = computed(() => Number(parameters.value.frame ?? 0))
const dimension = (value?: string | number) => typeof value === 'number' ? `${value}px` : value
const fallback = computed(() => {
  const fields = { ...presets[props.variant].defaults, ...parameters.value }
  const palette = Array.isArray(fields.colors) ? fields.colors : [fields.colorFront || fields.colorFill || fields.colorHighlight, fields.colorBack]
  const colors = palette.filter((color): color is string => typeof color === 'string')
  const first = colors[0] ?? '#241d9a'
  const second = colors[1] ?? String(fields.colorBack ?? first)
  return `radial-gradient(ellipse at 15% 20%, ${first}, transparent 68%), radial-gradient(ellipse at 85% 80%, ${colors[2] ?? first}, transparent 62%), linear-gradient(120deg, ${second}, ${colors[3] ?? second})`
})
let mount: ShaderMount | undefined
let activeVariant: ShaderBackgroundVariant | undefined
let media: MediaQueryList | undefined
let generation = 0
function dispose() {
  mount?.dispose()
  mount = undefined
  activeVariant = undefined
}
function syncMotion() { reduced.value = media?.matches ?? false }

onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  syncMotion()
  media.addEventListener('change', syncMotion)
  watch([parameters, () => props.variant], async () => {
    const request = ++generation
    const variant = props.variant
    if (activeVariant !== variant) {
      dispose()
      renderer.value = 'pending'
    }
    try {
      const runtime = await import('./graphics/shader-runtime')
      if (request !== generation) return
      const uniforms = await runtime.uniformsFor(variant, parameters.value)
      if (request !== generation || !host.value) return
      if (!mount) {
        mount = new runtime.ShaderMount(host.value, runtime.fragments[variant], uniforms,
          props.webGlContextAttributes, speed.value, frame.value, props.minPixelRatio, props.maxPixelCount,
          variant === 'water' ? ['u_image'] : undefined)
        activeVariant = variant
      } else {
        mount.setUniforms(uniforms)
      }
      renderer.value = 'webgl'
    } catch {
      if (request !== generation) return
      dispose()
      host.value?.replaceChildren()
      renderer.value = 'fallback'
    }
  }, { immediate: true, deep: true })
  watch(speed, value => mount?.setSpeed(value))
  watch(frame, value => mount?.setFrame(value))
  watch(() => props.maxPixelCount, value => mount?.setMaxPixelCount(value))
  watch(() => props.minPixelRatio, value => mount?.setMinPixelRatio(value))
})
onBeforeUnmount(() => {
  generation++
  media?.removeEventListener('change', syncMotion)
  dispose()
})
</script>

<template>
  <div data-slot="shader-background" :data-variant="variant" :data-renderer="renderer"
    :data-motion="speed ? 'playing' : 'paused'" aria-hidden="true" class="shader-background"
    :style="{ width: dimension(width), height: dimension(height), backgroundImage: renderer === 'webgl' ? undefined : fallback }">
    <div ref="host" class="shader-host" />
  </div>
</template>

<style scoped>
.shader-background { width: 100%; height: 100%; overflow: hidden; }
.shader-host { width: 100%; height: 100%; }
</style>
