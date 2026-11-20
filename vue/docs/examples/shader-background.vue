<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, shallowRef, watch } from 'vue'
import { ShaderBackground, Tabs, type ShaderBackgroundVariant, type ShaderParameters } from 'beui-vue'

type Choice = { id: string; label: string; variant: ShaderBackgroundVariant; params?: ShaderParameters[ShaderBackgroundVariant] }
function preset(variant: ShaderBackgroundVariant, label: string, params?: Choice['params'], id: string = variant): Choice {
  return { id, variant, label, params }
}
const choices = [
  preset('mesh-gradient', 'Mesh', { colors: ['#e0eaff', '#241d9a', '#f75092', '#9f50d3'], distortion: .8, swirl: .3, speed: .4 }),
  preset('grain-gradient', 'Grain', { colors: ['#7300ff', '#eba8ff', '#00bfff', '#2a00ff'], colorBack: '#000', softness: .6, speed: .5 }),
  preset('grain-gradient', 'Grain: Sunset', { colors: ['#ff7a00', '#ff2e93', '#ffce54', '#8a2be2'], colorBack: '#1a0500', softness: .7, speed: .4 }, 'grain-sunset'),
  preset('grain-gradient', 'Grain: Pastel', { colors: ['#ffd6e8', '#c9e4ff', '#fff3c4', '#d9c9ff'], colorBack: '#fff', softness: .85, speed: .3 }, 'grain-pastel'),
  preset('mesh-gradient', 'Mesh: Aurora', { colors: ['#00ffb2', '#0072ff', '#a200ff', '#001a2c'], distortion: .6, swirl: .5, speed: .3 }, 'mesh-aurora'),
  preset('mesh-gradient', 'Mesh: Citrus', { colors: ['#fff200', '#ff8a00', '#ff3d00', '#ffe08a'], distortion: .7, swirl: .4, speed: .5 }, 'mesh-citrus'),
  preset('warp', 'Warp', { speed: .4 }),
  preset('waves', 'Waves'),
  preset('voronoi', 'Voronoi', { speed: .3 }),
  preset('swirl', 'Swirl', { colorBack: '#180018', speed: .2 }),
  preset('dot-orbit', 'Orbit', { colors: ['#ffc96b', '#ff6200', '#ff2f00'], speed: .6 }),
  preset('dot-grid', 'Grid'),
  preset('smoke-ring', 'Smoke', { speed: .3 }),
  preset('static-radial-gradient', 'Radial'),
  preset('neuro-noise', 'Neuro', { speed: .4 }),
  preset('water', 'Water', { speed: .4 }),
  preset('metaballs', 'Metaballs', { speed: .5 }),
  preset('god-rays', 'Rays', { speed: .4 }),
  preset('spiral', 'Spiral', { speed: .4 }),
  preset('dithering', 'Dither', { speed: .4 }),
  preset('pulsing-border', 'Pulse', { speed: .5 }),
  preset('color-panels', 'Panels', { speed: .3 }),
  preset('static-mesh-gradient', 'Static Mesh'),
  preset('static-mesh-gradient', 'Static Mesh: Dusk', { colors: ['#2b1055', '#7597de', '#f6a1c8', '#0d0221'] }, 'static-mesh-dusk'),
  preset('static-radial-gradient', 'Radial: Ember', { colorBack: '#0a0000', colors: ['#ff5100', '#ffce00', '#4a0000'] }, 'radial-ember'),
  preset('simplex-noise', 'Simplex', { speed: .4 }),
  preset('perlin-noise', 'Perlin', { speed: .3 }),
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
    <div class="panel"><ShaderBackground :key="choice.id" :variant="choice.variant" :params="choice.params" /></div>
    <Tabs v-model="selected" :items="items" :labels="{ list: 'Shader preset' }" />
  </div>
</template>

<style scoped>
.shader-example { display: grid; gap: 1.25rem; box-sizing: border-box; width: 100%; max-width: 42rem; min-width: 0; margin: auto; padding: 1.5rem; }
.panel { height: 20rem; border: 1px solid var(--beui-border); border-radius: 1rem; overflow: hidden; }
.shader-example :deep(.be-trigger) { padding: .5rem 1rem; font-size: .875rem; }
</style>
