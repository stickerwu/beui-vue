<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, shallowRef, useId, watch } from 'vue'
import { ShaderBackground, SHADER_BACKGROUND_VARIANTS, type ShaderBackgroundVariant, type ShaderParameters } from 'beui-vue'

type Choice = { id: string; label: string; variant: ShaderBackgroundVariant; params?: ShaderParameters[ShaderBackgroundVariant] }
const extras: Choice[] = [
  { id: 'grain-sunset', label: 'Grain · Sunset', variant: 'grain-gradient', params: { colors: ['#ff7a00', '#ff2e93', '#ffce54', '#8a2be2'], colorBack: '#1a0500', softness: .7, speed: .4 } },
  { id: 'grain-pastel', label: 'Grain · Pastel', variant: 'grain-gradient', params: { colors: ['#ffd6e8', '#c9e4ff', '#fff3c4', '#d9c9ff'], colorBack: '#fff', softness: .85, speed: .3 } },
  { id: 'mesh-aurora', label: 'Mesh · Aurora', variant: 'mesh-gradient', params: { colors: ['#00ffb2', '#0072ff', '#a200ff', '#001a2c'], distortion: .6, swirl: .5, speed: .3 } },
  { id: 'mesh-citrus', label: 'Mesh · Citrus', variant: 'mesh-gradient', params: { colors: ['#fff200', '#ff8a00', '#ff3d00', '#ffe08a'], distortion: .7, swirl: .4, speed: .5 } },
  { id: 'static-mesh-dusk', label: 'Static mesh · Dusk', variant: 'static-mesh-gradient', params: { colors: ['#2b1055', '#7597de', '#f6a1c8', '#0d0221'] } },
  { id: 'radial-ember', label: 'Radial · Ember', variant: 'static-radial-gradient', params: { colorBack: '#0a0000', colors: ['#ff5100', '#ffce00', '#4a0000'] } },
]
const choices: Choice[] = SHADER_BACKGROUND_VARIANTS.map(variant => ({ variant, id: variant, label: variant.replace(/(^|-)\w/g, part => part.replace('-', ' ').toUpperCase()) }))
choices.splice(2, 0, ...extras.slice(0, 4))
choices.push(...extras.slice(4))
choices[0].params = { colors: ['#e0eaff', '#241d9a', '#f75092', '#9f50d3'], distortion: .8, swirl: .3, speed: .4 }
const presetId = useId()
const selected = shallowRef('mesh-gradient')
const paused = shallowRef(false)
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
  watch([paused, hovering, focused, reduced], ([stopped, hover, focus, reduce], _, cleanup) => {
    if (stopped || hover || focus || reduce) return
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
    <div class="panel"><ShaderBackground :variant="choice.variant" :params="choice.params" :speed="paused ? 0 : undefined" /></div>
    <div class="controls">
      <label :for="presetId">Shader preset</label>
      <select :id="presetId" v-model="selected"><option v-for="preset in choices" :key="preset.id" :value="preset.id">{{ preset.label }}</option></select>
      <button v-if="!reduced" type="button" @click="paused = !paused">{{ paused ? 'Play' : 'Pause' }}</button>
    </div>
  </div>
</template>

<style scoped>
.shader-example { width: 100%; max-width: 42rem; margin: auto; }
.panel { height: clamp(12rem, 35vw, 20rem); border: 1px solid var(--vp-c-divider, #8884); border-radius: 16px; overflow: hidden; }
.controls { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 16px; font-size: 13px; }
.controls select, .controls button { padding: 5px 12px; border-radius: 8px; border: 1px solid var(--vp-c-divider, #8886); font: inherit; color: inherit; background: var(--vp-c-bg, Canvas); cursor: pointer; }
.controls select { appearance: auto; }
</style>
