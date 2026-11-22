<script setup lang="ts">
import { ref } from 'vue'
import { CylinderCarousel, ShaderBackground, Tabs, TabsList, TabsTrigger } from 'beui-vue'

const variant = ref<'concave' | 'convex'>('concave')
// Each variant has its own prop shape; the slides only spread their own preset.
const slides = [
  { id: 'dithering', variant: 'dithering', props: { colorBack: '#1a1030', colorFront: '#b98cff', speed: 0.3 } },
  { id: 'metaballs', variant: 'metaballs', props: { colors: ['#e8e8ef', '#8a8a9a', '#1a1a22'], colorBack: '#c9b9a8', speed: 0.4 } },
  { id: 'warp', variant: 'warp', props: { colors: ['#c8ff00', '#3a5a00', '#c8ff00', '#88bb00'], speed: 0.4 } },
  { id: 'god-rays', variant: 'god-rays', props: { colors: ['#6a7bff', '#00114d'], colorBack: '#000000', speed: 0.5 } },
  { id: 'swirl', variant: 'swirl', props: { colorBack: '#1a0000', colors: ['#ffd1a8', '#ff6a3d', '#b31a57'], speed: 0.3 } },
  { id: 'mesh-gradient', variant: 'mesh-gradient', props: { colors: ['#e0eaff', '#241d9a', '#f75092', '#9f50d3'], speed: 0.3 } },
  { id: 'voronoi', variant: 'voronoi', props: { colors: ['#ff8247', '#ffe53d'], speed: 0.3 } },
  { id: 'neuro-noise', variant: 'neuro-noise', props: { colorFront: '#ffffff', colorMid: '#47a6ff', colorBack: '#000000', speed: 0.4 } },
] as const
</script>

<template>
  <div class="display">
    <Tabs v-model="variant" variant="segment">
      <TabsList>
        <TabsTrigger value="concave">Concave</TabsTrigger>
        <TabsTrigger value="convex">Convex</TabsTrigger>
      </TabsList>
    </Tabs>
    <!-- clip-path (not overflow) so the rounded corner also clips the GPU-composited balls -->
    <div class="frame">
      <CylinderCarousel :items="slides" :variant="variant" :item-size="230" :height="310" label="Shader carousel">
        <template #default="{ item }">
          <div class="orb"><ShaderBackground :variant="item.variant" v-bind="item.props" width="100%" height="100%" /></div>
        </template>
      </CylinderCarousel>
    </div>
    <p class="hint">Drag, scroll or use arrow keys to roll</p>
  </div>
</template>

<style scoped>
.display { display: flex; width: 100%; flex-direction: column; align-items: center; gap: 1rem; padding: 1.5rem; box-sizing: border-box; }
.frame { width: 100%; padding: 1.5rem 0; border: 1px solid color-mix(in srgb, var(--beui-border) 60%, transparent); border-radius: 1.5rem; background: color-mix(in srgb, var(--beui-muted) 20%, transparent); clip-path: inset(0 round 1.5rem); }
.orb { width: 100%; height: 100%; overflow: hidden; border-radius: 9999px; border: 1px solid color-mix(in srgb, var(--beui-border) 40%, transparent); box-sizing: border-box; }
.hint { margin: 0; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
</style>
