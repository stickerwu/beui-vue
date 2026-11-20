<script setup lang="ts">
import { ref } from 'vue'
import { CylinderCarousel, ShaderBackground } from 'beui-vue'
const variant = ref<'concave'|'convex'>('concave')
const current = ref(0)
const slides = [
  {id:'dithering',colorBack:'#1a1030',colorFront:'#b98cff'},
  {id:'metaballs',colors:['#e8e8ef','#8a8a9a','#1a1a22'],colorBack:'#c9b9a8'},
  {id:'warp',colors:['#c8ff00','#3a5a00','#c8ff00','#88bb00']},
  {id:'god-rays',colors:['#6a7bff','#00114d'],colorBack:'#000000'},
  {id:'swirl',colors:['#ffd1a8','#ff6a3d','#b31a57'],colorBack:'#1a0000'},
  {id:'mesh-gradient',colors:['#e0eaff','#241d9a','#f75092','#9f50d3']},
  {id:'voronoi',colors:['#ff8247','#ffe53d']},
  {id:'neuro-noise',colorFront:'#ffffff',colorMid:'#47a6ff',colorBack:'#000000'},
] as const
</script>
<template><div class="display"><div role="group" aria-label="Cylinder shape"><button v-for="shape in (['concave','convex'] as const)" :key="shape" :aria-pressed="variant===shape" @click="variant=shape">{{ shape }}</button></div><CylinderCarousel :items="slides" :variant="variant" label="Shader carousel" @index-change="current=$event"><template #default="{ item }"><div class="orb"><ShaderBackground v-bind="item" :variant="item.id" :speed=".3" width="100%" height="100%" /></div></template></CylinderCarousel><small aria-live="polite">{{ slides[current]?.id }}</small></div></template>
<style scoped>.display { width:100%; text-align:center; } .orb { width:100%; height:100%; border-radius:50%; overflow:hidden; } button { border:0; padding:.4rem .8rem; background:transparent; color:inherit; cursor:pointer; border-radius:99px; text-transform:capitalize; } button[aria-pressed=true] { background:var(--beui-muted); } small { color:var(--beui-muted-foreground); }</style>
