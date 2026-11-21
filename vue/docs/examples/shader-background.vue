<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, shallowRef, watch } from 'vue'
import { ShaderBackground, Tabs, type ShaderBackgroundVariant, type ShaderParameters } from 'beui-vue'

type Choice = { id: string; label: string; variant: ShaderBackgroundVariant; params: Record<string, unknown> }
// Verbatim from the upstream preview. Each entry carries its own prop shape, so the params are cast where they reach the component.
const choices: Choice[] = [
  { id: 'mesh-gradient', label: 'Mesh', variant: 'mesh-gradient', params: { colors: ['#e0eaff', '#241d9a', '#f75092', '#9f50d3'], distortion: 0.8, swirl: 0.3, speed: 0.4 } },
  { id: 'grain-gradient', label: 'Grain', variant: 'grain-gradient', params: { colors: ['#7300ff', '#eba8ff', '#00bfff', '#2a00ff'], colorBack: '#000000', softness: 0.6, speed: 0.5 } },
  { id: 'grain-sunset', label: 'Grain: Sunset', variant: 'grain-gradient', params: { colors: ['#ff7a00', '#ff2e93', '#ffce54', '#8a2be2'], colorBack: '#1a0500', softness: 0.7, speed: 0.4 } },
  { id: 'grain-pastel', label: 'Grain: Pastel', variant: 'grain-gradient', params: { colors: ['#ffd6e8', '#c9e4ff', '#fff3c4', '#d9c9ff'], colorBack: '#ffffff', softness: 0.85, speed: 0.3 } },
  { id: 'mesh-aurora', label: 'Mesh: Aurora', variant: 'mesh-gradient', params: { colors: ['#00ffb2', '#0072ff', '#a200ff', '#001a2c'], distortion: 0.6, swirl: 0.5, speed: 0.3 } },
  { id: 'mesh-citrus', label: 'Mesh: Citrus', variant: 'mesh-gradient', params: { colors: ['#fff200', '#ff8a00', '#ff3d00', '#ffe08a'], distortion: 0.7, swirl: 0.4, speed: 0.5 } },
  { id: 'warp', label: 'Warp', variant: 'warp', params: { colors: ['#121212', '#9470ff', '#121212', '#8838ff'], speed: 0.4 } },
  { id: 'waves', label: 'Waves', variant: 'waves', params: { colorFront: '#ffbb00', colorBack: '#000000' } },
  { id: 'voronoi', label: 'Voronoi', variant: 'voronoi', params: { colors: ['#ff8247', '#ffe53d'], speed: 0.3 } },
  { id: 'swirl', label: 'Swirl', variant: 'swirl', params: { colorBack: '#180018', colors: ['#ffd1d1', '#ff8a8a', '#660000'], speed: 0.2 } },
  { id: 'dot-orbit', label: 'Orbit', variant: 'dot-orbit', params: { colors: ['#ffc96b', '#ff6200', '#ff2f00'], colorBack: '#000000', speed: 0.6 } },
  { id: 'dot-grid', label: 'Grid', variant: 'dot-grid', params: { colorBack: '#000000', colorFill: '#ffffff', colorStroke: '#ffaa00' } },
  { id: 'smoke-ring', label: 'Smoke', variant: 'smoke-ring', params: { colorBack: '#000000', colors: ['#ffffff'], speed: 0.3 } },
  { id: 'static-radial-gradient', label: 'Radial', variant: 'static-radial-gradient', params: { colorBack: '#000000', colors: ['#00bbff', '#00ffe1', '#ffffff'] } },
  { id: 'neuro-noise', label: 'Neuro', variant: 'neuro-noise', params: { colorFront: '#ffffff', colorMid: '#47a6ff', colorBack: '#000000', speed: 0.4 } },
  { id: 'water', label: 'Water', variant: 'water', params: { colorBack: '#909090', colorHighlight: '#ffffff', speed: 0.4 } },
  { id: 'metaballs', label: 'Metaballs', variant: 'metaballs', params: { colors: ['#ff5cf4', '#4d9eff', '#000000'], colorBack: '#000000', speed: 0.5 } },
  { id: 'god-rays', label: 'Rays', variant: 'god-rays', params: { colors: ['#ffcc66', '#ff6a00'], colorBack: '#000000', speed: 0.4 } },
  { id: 'spiral', label: 'Spiral', variant: 'spiral', params: { colors: ['#7a5cff', '#ff5ca6', '#000000'], speed: 0.4 } },
  { id: 'dithering', label: 'Dither', variant: 'dithering', params: { colorBack: '#000000', colorFront: '#00ff9d', speed: 0.4 } },
  { id: 'pulsing-border', label: 'Pulse', variant: 'pulsing-border', params: { colors: ['#00e5ff', '#7000ff', '#ff00c8'], colorBack: '#000000', speed: 0.5 } },
  { id: 'color-panels', label: 'Panels', variant: 'color-panels', params: { colors: ['#ff3d68', '#ffb800', '#3d7aff', '#00ffb2'], speed: 0.3 } },
  { id: 'static-mesh-gradient', label: 'Static Mesh', variant: 'static-mesh-gradient', params: { colors: ['#ff8a3d', '#ff3d9a', '#3d5aff', '#0a0a0a'] } },
  { id: 'static-mesh-dusk', label: 'Static Mesh: Dusk', variant: 'static-mesh-gradient', params: { colors: ['#2b1055', '#7597de', '#f6a1c8', '#0d0221'] } },
  { id: 'radial-ember', label: 'Radial: Ember', variant: 'static-radial-gradient', params: { colorBack: '#0a0000', colors: ['#ff5100', '#ffce00', '#4a0000'] } },
  { id: 'simplex-noise', label: 'Simplex', variant: 'simplex-noise', params: { colors: ['#ff6ec7', '#6ec7ff', '#000000'], speed: 0.4 } },
  { id: 'perlin-noise', label: 'Perlin', variant: 'perlin-noise', params: { colorFront: '#00ffd5', colorBack: '#000000', speed: 0.3 } },
]
const items = choices.map(({ id, label }) => ({ value: id, label }))
const selected = shallowRef('mesh-gradient')
const hovering = shallowRef(false)
const focused = shallowRef(false)
const reduced = shallowRef(false)
const choice = computed(() => choices.find(entry => entry.id === selected.value) ?? choices[0])
let media: MediaQueryList | undefined
function syncMotion() { reduced.value = media?.matches ?? false }
onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  syncMotion()
  media.addEventListener('change', syncMotion)
  watch([hovering, focused, reduced], ([hover, focus, reduce], _, cleanup) => {
    if (hover || focus || reduce) return
    const timer = setInterval(() => {
      const current = choices.findIndex(entry => entry.id === selected.value)
      selected.value = choices[(current + 1) % choices.length].id
    }, 2400)
    cleanup(() => clearInterval(timer))
  }, { immediate: true })
})
onBeforeUnmount(() => media?.removeEventListener('change', syncMotion))
</script>

<template>
  <div class="shader-example" @pointerenter="hovering = true" @pointerleave="hovering = false" @focusin="focused = true" @focusout="focused = false">
    <div class="panel"><ShaderBackground :key="choice.id" :variant="choice.variant" :params="(choice.params as ShaderParameters[ShaderBackgroundVariant])" /></div>
    <Tabs v-model="selected" :items="items" :labels="{ list: 'Shader preset' }" />
  </div>
</template>

<style scoped>
.shader-example { display: grid; gap: 1.25rem; box-sizing: border-box; width: 100%; max-width: 42rem; min-width: 0; margin: auto; padding: 1.5rem; }
.panel { height: 20rem; border: 1px solid var(--beui-border); border-radius: 1rem; overflow: hidden; }
.shader-example :deep(.be-trigger) { padding: .5rem 1rem; font-size: .875rem; }
</style>
